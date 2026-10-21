import { describe, expect, it, vi } from 'vitest';
import {
  inviteMany,
  recipientDigest,
  type InviteContext,
  type InviteDeps
} from '@/lib/invitation-delivery';
import {
  INVITATION_CEILING_WINDOW_SECONDS,
  INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED,
  INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED
} from '@/lib/invitation-limits';
import { GatewayError } from '@/lib/supabase/server';
import { createRateLimiter } from '@/lib/sliding-window';

const TOKEN = 'T'.repeat(42) + 'k';
const OTHER_TOKEN = 'Z'.repeat(42) + 'q';
const EXPIRE = '2026-12-01T00:00:00Z';

const ctx: InviteContext = {
  userId: 'user-1',
  organisationId: 'org-1',
  campagneId: 'camp-1',
  campagneTitre: 'Campagne d’automne',
  organisation: 'Acme',
  locale: 'fr',
  message: null,
  total: 120,
  contactEmail: 'contact@tenga.example'
};

const line = (email: string, prenom: string | null = null) => ({
  email,
  prenom
});

// Doublure de app.consommer_plafond_invitation : mêmes règles que la fonction
// SQL (fenêtre glissante, organisation d'abord, destinataire ensuite, rien de
// consommé en cas de refus). Le comportement réel de la base est éprouvé par
// supabase/tests/sql/38_plafonds_invitations.sql.
type Scope = 'organisation' | 'destinataire';
const fakeCeilings = (clock: { now: number }) => {
  const events: { scope: Scope; key: string; at: number }[] = [];
  const count = (scope: Scope, key: string, windowSeconds: number): number =>
    events.filter(
      (e) =>
        e.scope === scope &&
        e.key === key &&
        e.at > clock.now - windowSeconds * 1000
    ).length;
  return vi.fn<InviteDeps['consumeCeilings']>(async (input) => {
    if (
      count('organisation', input.organisation, input.windowSeconds) >=
      input.maxOrganisation
    ) {
      return 'refused';
    }
    if (
      count('destinataire', input.recipientDigest, input.windowSeconds) >=
      input.maxRecipient
    ) {
      return 'refused';
    }
    events.push({
      scope: 'organisation',
      key: input.organisation,
      at: clock.now
    });
    events.push({
      scope: 'destinataire',
      key: input.recipientDigest,
      at: clock.now
    });
    return 'accepted';
  });
};

const setup = (
  over: Partial<InviteDeps> = {},
  clock: { now: number } = { now: 1_000_000 }
) => {
  const consumeCeilings = fakeCeilings(clock);
  const invite = vi.fn<InviteDeps['invite']>(async () => ({
    jeton: TOKEN,
    expire: EXPIRE
  }));
  const send = vi.fn<InviteDeps['send']>(async () => true);
  const pause = vi.fn(async () => undefined);
  const reportError = vi.fn();
  const deps: InviteDeps = {
    invite,
    send,
    consumeCeilings,
    limiter: createRateLimiter({ now: () => clock.now }),
    siteUrl: 'https://tenga.example',
    pause,
    reportError,
    ...over
  };
  return { deps, invite, send, pause, reportError, clock, consumeCeilings };
};

describe('inviteMany', () => {
  it('envoie après la RPC et renvoie sent', async () => {
    const { deps, invite, send } = setup();
    const r = await inviteMany(deps, ctx, [line('a@x.ma', 'Aïcha')]);
    expect(r).toEqual({
      aborted: null,
      results: [{ email: 'a@x.ma', outcome: 'sent' }]
    });
    expect(invite).toHaveBeenCalledWith({
      campagne: 'camp-1',
      email: 'a@x.ma',
      prenom: 'Aïcha',
      message: null,
      langue: 'fr'
    });
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0]?.[0].text).toContain(`/fr/i/${TOKEN}`);
  });

  it('appelle la RPC puis l’envoi, dans cet ordre', async () => {
    const { deps, invite, send } = setup();
    await inviteMany(deps, ctx, [line('a@x.ma')]);
    expect(invite.mock.invocationCallOrder[0]).toBeLessThan(
      send.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('n’envoie qu’une fois la RPC terminée', async () => {
    let finished = false;
    let finishedWhenSent: boolean | null = null;
    const { deps, send } = setup({
      invite: async () => {
        await Promise.resolve();
        finished = true;
        return { jeton: TOKEN, expire: EXPIRE };
      }
    });
    send.mockImplementation(async () => {
      finishedWhenSent = finished;
      return true;
    });
    const r = await inviteMany(deps, ctx, [line('a@x.ma')]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(finishedWhenSent).toBe(true);
    expect(r.results).toEqual([{ email: 'a@x.ma', outcome: 'sent' }]);
  });

  it('rejette une invitation refusée sans jamais envoyer', async () => {
    const { deps, send } = setup({
      invite: async () => {
        throw new GatewayError(400, '22023');
      }
    });
    const r = await inviteMany(deps, ctx, [line('a@x.ma')]);
    expect(r.results).toEqual([{ email: 'a@x.ma', outcome: 'refused' }]);
    expect(send).not.toHaveBeenCalled();
  });

  it('refuse un jeton de forme invalide sans envoyer', async () => {
    for (const jeton of ['court', `${TOKEN}x`, `${'a'.repeat(42)}/`, '']) {
      const { deps, send } = setup({
        invite: async () => ({ jeton, expire: EXPIRE })
      });
      const r = await inviteMany(deps, ctx, [line('a@x.ma')]);
      expect(r.results[0]?.outcome).toBe('refused');
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('send false donne mail_failed et le lot se poursuit', async () => {
    const { deps, send, reportError } = setup();
    send.mockResolvedValueOnce(false);
    const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
    expect(r.results.map((x) => x.outcome)).toEqual(['mail_failed', 'sent']);
    expect(reportError).toHaveBeenCalledTimes(1);
  });

  it('send qui lève donne mail_failed, sans adresse dans l’erreur rapportée', async () => {
    const { deps, send, reportError } = setup();
    send.mockRejectedValueOnce(
      Object.assign(new Error('échec pour a@x.ma'), { status: 429 })
    );
    const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
    expect(r.results.map((x) => x.outcome)).toEqual(['mail_failed', 'sent']);
    const reported = String(
      (reportError.mock.calls[0]?.[0] as Error | undefined)?.message
    );
    expect(reported).toContain('429');
    expect(reported).not.toContain('a@x.ma');
  });

  it.each([
    ['42501', 'forbidden'],
    ['55000', 'conflict']
  ] as const)(
    '%s sur la première adresse interrompt le lot sans envoi',
    async (code, aborted) => {
      const invite = vi.fn<InviteDeps['invite']>(async () => {
        throw new GatewayError(400, code);
      });
      const { deps, send } = setup({ invite });
      const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
      expect(r.aborted).toBe(aborted);
      expect(r.results).toEqual([]);
      expect(invite).toHaveBeenCalledTimes(1);
      expect(send).not.toHaveBeenCalled();
    }
  );

  it('conserve les résultats déjà acquis quand le lot est interrompu', async () => {
    const { deps, invite } = setup();
    invite.mockResolvedValueOnce({ jeton: TOKEN, expire: EXPIRE });
    invite.mockRejectedValueOnce(new GatewayError(403, '42501'));
    const r = await inviteMany(deps, ctx, [
      line('a@x.ma'),
      line('b@x.ma'),
      line('c@x.ma')
    ]);
    expect(r.aborted).toBe('forbidden');
    expect(r.results).toEqual([{ email: 'a@x.ma', outcome: 'sent' }]);
    expect(invite).toHaveBeenCalledTimes(2);
  });

  it('22023 donne refused pour l’adresse et le lot continue', async () => {
    const { deps, invite, send } = setup();
    invite.mockRejectedValueOnce(new GatewayError(400, '22023'));
    const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
    expect(r.aborted).toBeNull();
    expect(r.results.map((x) => x.outcome)).toEqual(['refused', 'sent']);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('erreur inattendue de la base : lot interrompu (error), résultats acquis conservés, erreur rapportée sans adresse', async () => {
    const { deps, invite, reportError } = setup();
    invite.mockResolvedValueOnce({ jeton: TOKEN, expire: EXPIRE });
    invite.mockRejectedValueOnce(new Error('réseau a@x.ma'));
    const r = await inviteMany(deps, ctx, [
      line('a@x.ma'),
      line('b@x.ma'),
      line('c@x.ma')
    ]);
    expect(r).toEqual({
      aborted: 'error',
      results: [{ email: 'a@x.ma', outcome: 'sent' }]
    });
    expect(invite).toHaveBeenCalledTimes(2);
    expect(reportError).toHaveBeenCalledTimes(1);
    expect(
      String((reportError.mock.calls[0]?.[0] as Error).message)
    ).not.toContain('@');
  });

  it('deux gestionnaires de la même campagne, même adresse, même minute : le second est sauté', async () => {
    const { deps, invite, send } = setup();
    await inviteMany(deps, ctx, [line('a@x.ma')]);
    const r = await inviteMany(deps, { ...ctx, userId: 'user-2' }, [
      line('a@x.ma')
    ]);
    expect(r.results).toEqual([{ email: 'a@x.ma', outcome: 'skipped_recent' }]);
    expect(invite).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('le plafond horaire par adresse est partagé entre gestionnaires', async () => {
    const { deps, invite, clock } = setup();
    const users = ['user-1', 'user-2', 'user-3', 'user-4'];
    const outcomes: string[] = [];
    for (const userId of users) {
      const r = await inviteMany(deps, { ...ctx, userId }, [line('a@x.ma')]);
      outcomes.push(r.results[0]?.outcome ?? '');
      clock.now += 61_000;
    }
    expect(outcomes).toEqual(['sent', 'sent', 'sent', 'rate_limited']);
    expect(invite).toHaveBeenCalledTimes(3);
  });

  it('le plafond par utilisateur reste propre à chaque utilisateur', async () => {
    const calls: { action: string; subject: string }[] = [];
    const real = createRateLimiter();
    const { deps } = setup({
      limiter: {
        isLimited: (action, limit, subject) => {
          calls.push({ action, subject });
          return real.isLimited(action, limit, subject);
        },
        size: () => real.size()
      }
    });
    await inviteMany(deps, ctx, [line('a@x.ma')]);
    expect(
      calls
        .filter((c) => c.action === 'invitationPerUser')
        .map((c) => c.subject)
    ).toEqual(['user-1']);
    expect(
      calls
        .filter((c) => c.action !== 'invitationPerUser')
        .map((c) => c.subject)
    ).toEqual(['camp-1:a@x.ma', 'camp-1:a@x.ma']);
  });

  it('double soumission de 25 adresses : 25 unités du quota utilisateur consommées, pas 50', async () => {
    let perUserUnits = 0;
    const real = createRateLimiter();
    const { deps, invite } = setup({
      limiter: {
        isLimited: (action, limit, subject) => {
          if (action === 'invitationPerUser') perUserUnits += 1;
          return real.isLimited(action, limit, subject);
        },
        size: () => real.size()
      }
    });
    const list = Array.from({ length: 25 }, (_, i) => line(`u${i}@x.ma`));
    await inviteMany(deps, ctx, list);
    const second = await inviteMany(deps, ctx, list);
    expect(second.results.every((x) => x.outcome === 'skipped_recent')).toBe(
      true
    );
    expect(invite).toHaveBeenCalledTimes(25);
    expect(perUserUnits).toBe(25);
  });

  it('un jeton mal formé refuse la ligne seule (isLoginToken)', async () => {
    const { deps, invite, send } = setup();
    invite.mockResolvedValueOnce({ jeton: 'court', expire: EXPIRE });
    const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
    expect(r.results.map((x) => x.outcome)).toEqual(['refused', 'sent']);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('saute la seconde invitation de la minute (casse, alias) sans RPC', async () => {
    const { deps, invite } = setup();
    const r = await inviteMany(deps, ctx, [
      line('Ali@x.ma'),
      line('ali+2@X.ma')
    ]);
    expect(r.results.map((x) => x.outcome)).toEqual(['sent', 'skipped_recent']);
    expect(invite).toHaveBeenCalledTimes(1);
  });

  it('une même adresse dans une autre campagne n’est pas sautée', async () => {
    const { deps, invite } = setup();
    await inviteMany(deps, ctx, [line('a@x.ma')]);
    await inviteMany(deps, { ...ctx, campagneId: 'camp-2' }, [line('a@x.ma')]);
    expect(invite).toHaveBeenCalledTimes(2);
  });

  it('refuse la 4e invitation de l’heure pour la même adresse', async () => {
    const { deps, invite, clock } = setup();
    const outcomes: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const r = await inviteMany(deps, ctx, [line('a@x.ma')]);
      outcomes.push(r.results[0]?.outcome ?? '');
      clock.now += 61_000;
    }
    expect(outcomes).toEqual(['sent', 'sent', 'sent', 'rate_limited']);
    expect(invite).toHaveBeenCalledTimes(3);
  });

  it('plafond par utilisateur atteint : les restantes sont rate_limited', async () => {
    const { deps, invite } = setup();
    const list = Array.from({ length: 102 }, (_, i) => line(`u${i}@x.ma`));
    const r = await inviteMany(deps, ctx, list);
    const outcomes = r.results.map((x) => x.outcome);
    expect(outcomes.filter((o) => o === 'sent')).toHaveLength(100);
    expect(outcomes.slice(100)).toEqual(['rate_limited', 'rate_limited']);
    expect(invite).toHaveBeenCalledTimes(100);
  });

  describe('plafonds journaliers tenus en base (T19, valeurs NON VALIDÉES par Amine)', () => {
    it('interroge la base avec l’organisation, l’empreinte de l’adresse canonique et les constantes', async () => {
      const { deps, consumeCeilings } = setup();
      await inviteMany(deps, ctx, [line('Ali.B+x@Gmail.com')]);
      expect(consumeCeilings).toHaveBeenCalledTimes(1);
      expect(consumeCeilings).toHaveBeenCalledWith({
        organisation: 'org-1',
        recipientDigest: recipientDigest('alib@gmail.com'),
        maxOrganisation: INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED,
        maxRecipient: INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED,
        windowSeconds: INVITATION_CEILING_WINDOW_SECONDS
      });
    });

    it('ne transmet jamais l’adresse à la base : seulement un condensat hexadécimal', async () => {
      const { deps, consumeCeilings } = setup();
      await inviteMany(deps, ctx, [line('Secrete@Client.ma')]);
      const sent = JSON.stringify(consumeCeilings.mock.calls);
      expect(sent).not.toMatch(/secrete|client/i);
      expect(sent).not.toContain('@');
      expect(consumeCeilings.mock.calls[0]?.[0].recipientDigest).toMatch(
        /^[0-9a-f]{64}$/
      );
    });

    it('le condensat est stable et distinct d’une adresse à l’autre', () => {
      expect(recipientDigest('a@x.ma')).toBe(recipientDigest('a@x.ma'));
      expect(recipientDigest('a@x.ma')).not.toBe(recipientDigest('b@x.ma'));
    });

    it('refus de la base : rate_limited, ni RPC d’invitation ni envoi', async () => {
      const { deps, invite, send } = setup({
        consumeCeilings: async () => 'refused'
      });
      const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
      expect(r).toEqual({
        aborted: null,
        results: [
          { email: 'a@x.ma', outcome: 'rate_limited' },
          { email: 'b@x.ma', outcome: 'rate_limited' }
        ]
      });
      expect(invite).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('la base est interrogée avant la RPC d’invitation', async () => {
      const { deps, invite, consumeCeilings } = setup();
      await inviteMany(deps, ctx, [line('a@x.ma')]);
      expect(consumeCeilings.mock.invocationCallOrder[0]).toBeLessThan(
        invite.mock.invocationCallOrder[0] ?? 0
      );
    });

    it.each([
      ['une erreur réseau', new Error('réseau a@x.ma')],
      ['une erreur de la passerelle', new GatewayError(500, 'XX000')],
      ['un droit refusé', new GatewayError(403, '42501')]
    ])(
      'erreur de la base (%s) : refus sûr, lot interrompu (error), aucun envoi, erreur rapportée sans adresse',
      async (_label, failure) => {
        const { deps, invite, send, reportError } = setup({
          consumeCeilings: async () => {
            throw failure;
          }
        });
        const r = await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
        expect(r).toEqual({ aborted: 'error', results: [] });
        expect(invite).not.toHaveBeenCalled();
        expect(send).not.toHaveBeenCalled();
        expect(reportError).toHaveBeenCalledTimes(1);
        expect(
          String((reportError.mock.calls[0]?.[0] as Error).message)
        ).not.toContain('@');
      }
    );

    it('une réponse inattendue de la base est un refus sûr, pas un passage', async () => {
      const { deps, invite, send } = setup({
        consumeCeilings: async () => 'peut-etre' as never
      });
      const r = await inviteMany(deps, ctx, [line('a@x.ma')]);
      expect(r.results.every((x) => x.outcome !== 'sent')).toBe(true);
      expect(invite).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('une adresse sautée par la rafale n’interroge pas la base', async () => {
      const { deps, consumeCeilings } = setup();
      await inviteMany(deps, ctx, [line('a@x.ma')]);
      await inviteMany(deps, ctx, [line('a@x.ma')]); // skipped_recent
      expect(consumeCeilings).toHaveBeenCalledTimes(1);
    });

    it('le plafond par utilisateur atteint n’interroge plus la base', async () => {
      const { deps, consumeCeilings } = setup();
      const list = Array.from({ length: 101 }, (_, i) => line(`u${i}@x.ma`));
      await inviteMany(deps, ctx, list);
      expect(consumeCeilings).toHaveBeenCalledTimes(100);
    });
  });

  describe('plafond par adresse destinataire et par jour (5, DÉFAUT NON VALIDÉ par Amine)', () => {
    it('deux campagnes différentes partagent le même compteur quotidien', async () => {
      const { deps, invite, clock } = setup();
      const outcomes: string[] = [];
      const campagnes = [
        'camp-1',
        'camp-1',
        'camp-1',
        'camp-2',
        'camp-2',
        'camp-3'
      ];
      for (const campagneId of campagnes) {
        const r = await inviteMany(deps, { ...ctx, campagneId }, [
          line('Ali.B+x@gmail.com')
        ]);
        outcomes.push(r.results[0]?.outcome ?? '');
        clock.now += 61_000;
      }
      expect(outcomes).toEqual([
        'sent',
        'sent',
        'sent',
        'sent',
        'sent',
        'rate_limited'
      ]);
      expect(invite).toHaveBeenCalledTimes(5);
    });

    it('compte l’adresse canonique et laisse passer une autre adresse', async () => {
      const { deps, invite, clock } = setup();
      for (let i = 0; i < 5; i++) {
        await inviteMany(deps, { ...ctx, campagneId: `c${i}` }, [
          line('a.b@gmail.com')
        ]);
        clock.now += 61_000;
      }
      const same = await inviteMany(deps, { ...ctx, campagneId: 'c9' }, [
        line('ab+z@gmail.com')
      ]);
      const other = await inviteMany(deps, { ...ctx, campagneId: 'c9' }, [
        line('autre@gmail.com')
      ]);
      expect(same.results[0]?.outcome).toBe('rate_limited');
      expect(other.results[0]?.outcome).toBe('sent');
      expect(invite).toHaveBeenCalledTimes(6);
    });

    it('repart après 24 heures', async () => {
      const { deps, clock } = setup();
      for (let i = 0; i < 5; i++) {
        await inviteMany(deps, { ...ctx, campagneId: `c${i}` }, [
          line('a@x.ma')
        ]);
        clock.now += 61_000;
      }
      clock.now += 24 * 60 * 60 * 1000;
      const r = await inviteMany(deps, { ...ctx, campagneId: 'c9' }, [
        line('a@x.ma')
      ]);
      expect(r.results[0]?.outcome).toBe('sent');
    });
  });

  describe('plafond par organisation et par jour (300, DÉFAUT NON VALIDÉ par Amine, T16)', () => {
    const fill = async (
      deps: InviteDeps,
      organisationId: string,
      count: number
    ): Promise<void> => {
      for (let i = 0; i < count; i++) {
        const userId = `u-${organisationId}-${Math.floor(i / 100)}`;
        await inviteMany(deps, { ...ctx, organisationId, userId }, [
          line(`${organisationId}-${i}@x.ma`)
        ]);
      }
    };

    it('plafond atteint : refus rate_limited et aucune RPC d’invitation', async () => {
      const { deps, invite, send } = setup();
      await fill(deps, 'org-1', INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED);
      expect(invite).toHaveBeenCalledTimes(
        INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED
      );
      invite.mockClear();
      send.mockClear();
      const r = await inviteMany(
        deps,
        { ...ctx, userId: 'frais', organisationId: 'org-1' },
        [line('nouveau@x.ma')]
      );
      expect(r.results).toEqual([
        { email: 'nouveau@x.ma', outcome: 'rate_limited' }
      ]);
      expect(invite).not.toHaveBeenCalled();
      expect(send).not.toHaveBeenCalled();
    });

    it('une autre organisation n’est pas touchée', async () => {
      const { deps, invite } = setup();
      await fill(deps, 'org-1', INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED);
      invite.mockClear();
      const r = await inviteMany(
        deps,
        { ...ctx, userId: 'autre', organisationId: 'org-2' },
        [line('nouveau@x.ma')]
      );
      expect(r.results[0]?.outcome).toBe('sent');
      expect(invite).toHaveBeenCalledTimes(1);
    });

    it('une adresse sautée (rafale) ne consomme pas le quota de l’organisation', async () => {
      const { deps } = setup();
      await inviteMany(deps, ctx, [line('a@x.ma')]);
      await inviteMany(deps, ctx, [line('a@x.ma')]); // skipped_recent
      await fill(deps, 'org-1', INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED - 2);
      const r = await inviteMany(
        deps,
        { ...ctx, userId: 'frais', organisationId: 'org-1' },
        [line('dernier@x.ma')]
      );
      expect(r.results[0]?.outcome).toBe('sent');
    });

    it('repart après 24 heures', async () => {
      const { deps, clock } = setup();
      await fill(deps, 'org-1', INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED);
      clock.now += 24 * 60 * 60 * 1000 + 1;
      const r = await inviteMany(
        deps,
        { ...ctx, userId: 'frais', organisationId: 'org-1' },
        [line('nouveau@x.ma')]
      );
      expect(r.results[0]?.outcome).toBe('sent');
    });
  });

  it('n’expose le jeton ni dans les résultats ni dans les erreurs rapportées', async () => {
    const { deps, send, reportError } = setup();
    send.mockResolvedValueOnce(false);
    send.mockRejectedValueOnce(new Error(`boom ${OTHER_TOKEN}`));
    deps.invite = vi
      .fn<InviteDeps['invite']>()
      .mockResolvedValueOnce({ jeton: TOKEN, expire: EXPIRE })
      .mockResolvedValueOnce({ jeton: OTHER_TOKEN, expire: EXPIRE })
      .mockResolvedValueOnce({ jeton: TOKEN, expire: EXPIRE });
    const r = await inviteMany(deps, ctx, [
      line('a@x.ma'),
      line('b@x.ma'),
      line('c@x.ma')
    ]);
    const dumped = JSON.stringify(r);
    expect(dumped).not.toContain(TOKEN);
    expect(dumped).not.toContain(OTHER_TOKEN);
    expect(reportError).toHaveBeenCalledTimes(2);
    const reports = JSON.stringify(
      reportError.mock.calls.map(([e]) => [
        (e as Error).name,
        (e as Error).message
      ])
    );
    expect(reports).not.toContain(TOKEN);
    expect(reports).not.toContain(OTHER_TOKEN);
    expect(reports).not.toContain('@');
  });

  it('fait une pause entre deux envois mais pas après le dernier', async () => {
    const { deps, pause } = setup();
    await inviteMany(deps, ctx, [
      line('a@x.ma'),
      line('b@x.ma'),
      line('c@x.ma')
    ]);
    expect(pause).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledWith(500);
    const one = setup();
    await inviteMany(one.deps, ctx, [line('a@x.ma')]);
    expect(one.pause).not.toHaveBeenCalled();
  });

  it('traite les adresses l’une après l’autre', async () => {
    const order: string[] = [];
    const { deps } = setup({
      invite: async ({ email }) => {
        order.push(`invite:${email}`);
        await Promise.resolve();
        return { jeton: TOKEN, expire: EXPIRE };
      },
      send: async ({ to }) => {
        order.push(`send:${to}`);
        return true;
      }
    });
    await inviteMany(deps, ctx, [line('a@x.ma'), line('b@x.ma')]);
    expect(order).toEqual([
      'invite:a@x.ma',
      'send:a@x.ma',
      'invite:b@x.ma',
      'send:b@x.ma'
    ]);
  });
});
