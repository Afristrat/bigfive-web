import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  discardCreatedAccount,
  findOrCreateUser,
  isDefiniteRefusal
} from '@/lib/user-accounts';
import { GatewayError, type ServiceClient } from '@/lib/supabase/server';

const ID = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';
const EMAIL = 'ines.invitee@exemple.ma';

const rpc = vi.fn();
const createUser = vi.fn();
const service: Pick<ServiceClient, 'rpc' | 'createUser'> = {
  rpc: rpc as unknown as ServiceClient['rpc'],
  createUser
};

let warn: ReturnType<typeof vi.spyOn>;

/** Simule la fonction SQL de recherche par adresse (compte_par_adresse). */
const lookupReturns = (...ids: Array<string | null>) => {
  rpc.mockReset();
  for (const id of ids) rpc.mockResolvedValueOnce(id);
  rpc.mockResolvedValue(ids.length > 0 ? ids[ids.length - 1] : null);
};

beforeEach(() => {
  rpc.mockReset().mockResolvedValue(null);
  createUser.mockReset().mockResolvedValue(ID);
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  warn.mockRestore();
});

describe('findOrCreateUser', () => {
  it('compte existant : created false, aucune création', async () => {
    lookupReturns(OTHER);
    await expect(findOrCreateUser(service, EMAIL, 'fr')).resolves.toEqual({
      id: OTHER,
      created: false
    });
    expect(createUser).not.toHaveBeenCalled();
  });

  it('recherche PAR ADRESSE en base (compte_par_adresse), jamais par parcours de la liste', async () => {
    lookupReturns(OTHER);
    await findOrCreateUser(service, EMAIL, 'fr');
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]?.[0]).toBe('compte_par_adresse');
    expect(rpc.mock.calls[0]?.[1]).toEqual({ p_email: EMAIL });
  });

  it('le schéma de réponse accepte un identifiant ou null, refuse le reste', async () => {
    lookupReturns(OTHER);
    await findOrCreateUser(service, EMAIL, 'fr');
    const schema = rpc.mock.calls[0]?.[2] as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse(OTHER).success).toBe(true);
    expect(schema.safeParse(null).success).toBe(true);
    expect(schema.safeParse('pas-un-uuid').success).toBe(false);
    expect(schema.safeParse(42).success).toBe(false);
    expect(schema.safeParse(undefined).success).toBe(false);
  });

  it('compte absent : créé, created true, langue transmise', async () => {
    await expect(findOrCreateUser(service, EMAIL, 'ar')).resolves.toEqual({
      id: ID,
      created: true
    });
    expect(createUser).toHaveBeenCalledWith(EMAIL, 'ar');
  });

  it('course : un autre appel a créé le compte, created false (ne sera jamais supprimé)', async () => {
    lookupReturns(null, OTHER);
    createUser.mockRejectedValue(new GatewayError(422, 'email_exists'));
    await expect(findOrCreateUser(service, EMAIL, 'fr')).resolves.toEqual({
      id: OTHER,
      created: false
    });
    expect(rpc).toHaveBeenCalledTimes(2);
  });

  it('création en échec et compte introuvable : relance l’erreur d’origine', async () => {
    const failure = new GatewayError(500, null);
    createUser.mockRejectedValue(failure);
    await expect(findOrCreateUser(service, EMAIL, 'fr')).rejects.toBe(failure);
  });

  it('lecture en échec : propage, aucune création', async () => {
    rpc.mockReset().mockRejectedValue(new Error('réseau'));
    await expect(findOrCreateUser(service, EMAIL, 'fr')).rejects.toThrow(
      'réseau'
    );
    expect(createUser).not.toHaveBeenCalled();
  });

  it('adresse à caractères spéciaux : transmise telle quelle à la base (jamais interpolée)', async () => {
    const odd = "o'brien+tag@exé.ma\\"; // apostrophe, plus, accent, antislash
    lookupReturns(OTHER);
    await findOrCreateUser(service, odd, 'fr');
    expect(rpc.mock.calls[0]?.[1]).toEqual({ p_email: odd });
  });
});

describe('discardCreatedAccount', () => {
  it('supprime le compte donné par la fonction SQL réservée au serveur', async () => {
    rpc.mockResolvedValue(true);
    await discardCreatedAccount(service, ID);
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0]?.[0]).toBe('retirer_compte_sans_appartenance');
    expect(rpc.mock.calls[0]?.[1]).toEqual({ p_utilisateur: ID });
    expect(warn).not.toHaveBeenCalled();
  });

  it('le schéma de réponse n’accepte qu’un booléen', async () => {
    rpc.mockResolvedValue(true);
    await discardCreatedAccount(service, ID);
    const schema = rpc.mock.calls[0]?.[2] as {
      safeParse: (v: unknown) => { success: boolean };
    };
    expect(schema.safeParse(true).success).toBe(true);
    expect(schema.safeParse(false).success).toBe(true);
    expect(schema.safeParse(null).success).toBe(false);
    expect(schema.safeParse('true').success).toBe(false);
  });

  it('la base refuse de supprimer (compte devenu membre) : conservé, journal sans identifiant', async () => {
    rpc.mockResolvedValue(false);
    await expect(discardCreatedAccount(service, ID)).resolves.toBeUndefined();
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toContain('account.orphan_kept');
    expect(line).not.toContain(ID);
  });

  it('avale l’échec de suppression, journalise le code HTTP seul', async () => {
    rpc.mockRejectedValue(new GatewayError(500, `fuite ${EMAIL} ${ID}`));
    await expect(discardCreatedAccount(service, ID)).resolves.toBeUndefined();
    const line = String(warn.mock.calls[0]?.[0]);
    expect(line).toContain('"status":500');
    expect(line).not.toContain(EMAIL);
    expect(line).not.toContain(ID);
  });

  it('échec hors passerelle (réseau) : avalé, statut 0', async () => {
    rpc.mockRejectedValue(new TypeError('fetch failed'));
    await expect(discardCreatedAccount(service, ID)).resolves.toBeUndefined();
    expect(String(warn.mock.calls[0]?.[0])).toContain('"status":0');
  });
});

describe('isDefiniteRefusal', () => {
  it.each([400, 403, 404, 409, 422])(
    'refus définitif de la base (HTTP %i) : true',
    (status) => {
      expect(isDefiniteRefusal(new GatewayError(status, null))).toBe(true);
    }
  );

  it.each([408, 429, 500, 502, 503, 504])(
    'délai, limitation ou panne (HTTP %i) : false',
    (status) => {
      expect(isDefiniteRefusal(new GatewayError(status, null))).toBe(false);
    }
  );

  it.each([
    ['TypeError réseau', new TypeError('fetch failed')],
    ['délai dépassé', new DOMException('timeout', 'TimeoutError')],
    ['null', null],
    ['undefined', undefined],
    ['chaîne', '403']
  ])('erreur hors passerelle (%s) : false', (_label, error) => {
    expect(isDefiniteRefusal(error)).toBe(false);
  });
});
