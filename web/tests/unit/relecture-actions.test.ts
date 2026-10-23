import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'relectrice@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const CIBLE = '22222222-2222-4222-8222-222222222222';
const VERDICT = '33333333-3333-4333-8333-333333333333';

const currentViewer = vi.fn();
const requireAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer(),
  requireAdmin: (locale: string, path: string) => requireAdmin(locale, path)
}));

const rpc = vi.fn();
const serviceRpc = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args))
  }),
  serviceClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await serviceRpc(fn, args)),
    createUser: vi.fn()
  })
}));

const findOrCreateUser = vi.fn();
const discardCreatedAccount = vi.fn();
vi.mock('@/lib/user-accounts', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/user-accounts')>()),
  findOrCreateUser: (...args: unknown[]) => findOrCreateUser(...args),
  discardCreatedAccount: (...args: unknown[]) => discardCreatedAccount(...args)
}));

const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimited(...args),
  getClientIp: async () => '203.0.113.1'
}));

const rafraichirEtatRelecture = vi.fn();
vi.mock('@/lib/bibliotheque', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bibliotheque')>()),
  rafraichirEtatRelecture: () => rafraichirEtatRelecture()
}));

const revalidatePath = vi.fn();
vi.mock('next/cache', () => ({
  revalidatePath: (path: string) => revalidatePath(path)
}));

import {
  designerRelecteur,
  relireBloc,
  retirerRelecteur
} from '@/actions/relecture';
import { empreinteBloc } from '@/lib/bibliotheque';
import { GatewayError } from '@/lib/supabase/server';

const EMPREINTE = empreinteBloc('N1/bas') ?? '';

beforeEach(() => {
  currentViewer.mockReset().mockResolvedValue({ status: 'ok', viewer: VIEWER });
  requireAdmin.mockReset().mockResolvedValue(VIEWER);
  rpc.mockReset();
  serviceRpc.mockReset();
  findOrCreateUser.mockReset();
  discardCreatedAccount.mockReset();
  isRateLimited.mockReset().mockResolvedValue(false);
  rafraichirEtatRelecture.mockReset().mockResolvedValue(true);
  revalidatePath.mockReset();
});

const formulaire = (champs: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [cle, valeur] of Object.entries(champs)) data.set(cle, valeur);
  return data;
};
const verdict = (champs: Record<string, string> = {}): FormData =>
  formulaire({
    locale: 'fr',
    bloc: 'N1/bas',
    empreinte: EMPREINTE,
    verdict: 'relu',
    ...champs
  });
const idle = { status: 'idle' } as const;

describe('relireBloc', () => {
  it('rend le verdict avec la session de la personne, rafraîchit l’état servi et la page', async () => {
    rpc.mockResolvedValue(VERDICT);
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: 'relu'
    });
    expect(rpc).toHaveBeenCalledWith('relire_bloc', {
      p_bloc: 'N1/bas',
      p_empreinte: EMPREINTE,
      p_verdict: 'relu',
      p_commentaire: null
    });
    expect(rafraichirEtatRelecture).toHaveBeenCalledOnce();
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin/relecture');
  });

  it('« à corriger » : commentaire exigé, transmis sans ses blancs', async () => {
    await expect(
      relireBloc(idle, verdict({ verdict: 'a_corriger', commentaire: '  ' }))
    ).resolves.toEqual({ status: 'invalide', champ: 'commentaire' });
    expect(rpc).not.toHaveBeenCalled();

    rpc.mockResolvedValue(VERDICT);
    await expect(
      relireBloc(
        idle,
        verdict({ verdict: 'a_corriger', commentaire: '  Accord à revoir. ' })
      )
    ).resolves.toEqual({ status: 'a_corriger' });
    expect(rpc).toHaveBeenCalledWith(
      'relire_bloc',
      expect.objectContaining({ p_commentaire: 'Accord à revoir.' })
    );
  });

  it('commentaire de plus de 2 000 caractères : refusé sans appel', async () => {
    await expect(
      relireBloc(idle, verdict({ commentaire: 'x'.repeat(2001) }))
    ).resolves.toEqual({ status: 'invalide', champ: 'commentaire' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('texte modifié depuis l’affichage (empreinte différente) : périmé, sans appel', async () => {
    await expect(
      relireBloc(idle, verdict({ empreinte: 'a'.repeat(64) }))
    ).resolves.toEqual({ status: 'perime' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['bloc inconnu', { bloc: 'Z9/bas' }],
    ['niveau inconnu', { bloc: 'N1/moyen' }],
    ['verdict inconnu', { verdict: 'valide' }],
    ['empreinte absente', { empreinte: '' }]
  ])('%s : invalide, sans appel', async (_, champs) => {
    await expect(relireBloc(idle, verdict(champs))).resolves.toEqual({
      status: 'invalide'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('sans session : interdit, sans appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: 'interdit'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('plafond atteint : erreur, sans appel', async () => {
    isRateLimited.mockResolvedValue(true);
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: 'erreur'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['42501', 'interdit'],
    ['22023', 'invalide'],
    ['XX000', 'erreur']
  ])('refus %s de la base : %s, sans rafraîchir', async (code, attendu) => {
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    rpc.mockRejectedValue(new GatewayError(code === 'XX000' ? 500 : 403, code));
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: attendu
    });
    expect(rafraichirEtatRelecture).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    for (const appel of avertir.mock.calls) {
      expect(String(appel[0])).not.toMatch(/@|N1\/bas|[0-9a-f]{64}/);
    }
    avertir.mockRestore();
  });
});

describe('designerRelecteur', () => {
  const designation = (champs: Record<string, string> = {}): FormData =>
    formulaire({ locale: 'fr', email: ' Nezha@Tenga.test ', ...champs });

  it('vérifie le super administrateur sur le chemin de l’atelier', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(true);
    await designerRelecteur(idle, designation());
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin/relecture');
  });

  it('retrouve ou crée le compte (adresse normalisée, langue de la page), puis désigne', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: true });
    rpc.mockResolvedValue(true);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'ajoute'
    });
    expect(findOrCreateUser).toHaveBeenCalledWith(
      expect.anything(),
      'nezha@tenga.test',
      'fr'
    );
    expect(rpc).toHaveBeenCalledWith('designer_relecteur', {
      p_utilisateur: CIBLE
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin/relecture');
  });

  it('déjà relecteur : « déjà », sans erreur', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(false);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'deja'
    });
  });

  it('adresse invalide : refusée sans appel', async () => {
    await expect(
      designerRelecteur(idle, designation({ email: 'pas-une-adresse' }))
    ).resolves.toEqual({ status: 'invalide' });
    expect(findOrCreateUser).not.toHaveBeenCalled();
  });

  it('compte suspendu (22023) : refus, et le compte créé par l’appel est retiré', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: true });
    rpc.mockRejectedValue(new GatewayError(400, '22023'));
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'inconnu'
    });
    expect(discardCreatedAccount).toHaveBeenCalledWith(
      expect.anything(),
      CIBLE
    );
  });

  it('plafond atteint : erreur, sans appel', async () => {
    isRateLimited.mockResolvedValue(true);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'erreur'
    });
    expect(findOrCreateUser).not.toHaveBeenCalled();
  });
});

describe('retirerRelecteur', () => {
  const retrait = (champs: Record<string, string> = {}): FormData =>
    formulaire({ locale: 'fr', userId: CIBLE, confirmer: 'oui', ...champs });

  it('retire après confirmation', async () => {
    rpc.mockResolvedValue(true);
    await expect(retirerRelecteur(idle, retrait())).resolves.toEqual({
      status: 'retire'
    });
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin/relecture');
    expect(rpc).toHaveBeenCalledWith('retirer_relecteur', {
      p_utilisateur: CIBLE
    });
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin/relecture');
  });

  it('sans confirmation ou identifiant forgé : invalide, sans appel', async () => {
    await expect(
      retirerRelecteur(idle, retrait({ confirmer: '' }))
    ).resolves.toEqual({ status: 'invalide' });
    await expect(
      retirerRelecteur(idle, retrait({ userId: 'x' }))
    ).resolves.toEqual({ status: 'invalide' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('déjà retiré : absent ; refus de la base : interdit', async () => {
    rpc.mockResolvedValueOnce(false);
    await expect(retirerRelecteur(idle, retrait())).resolves.toEqual({
      status: 'absent'
    });
    rpc.mockRejectedValueOnce(new GatewayError(403, '42501'));
    await expect(retirerRelecteur(idle, retrait())).resolves.toEqual({
      status: 'interdit'
    });
  });
});

describe('source', () => {
  it('fichier d’actions serveur, sans clé de service pour le verdict', () => {
    const source = readFileSync(
      fileURLToPath(new URL('../../src/actions/relecture.ts', import.meta.url)),
      'utf8'
    );
    expect(source.trimStart().startsWith("'use server'")).toBe(true);
    // Le verdict passe par la session de la personne : la base décide.
    const corpsRelire = source.slice(
      source.indexOf('export async function relireBloc'),
      source.indexOf('export async function designerRelecteur')
    );
    expect(corpsRelire).toContain('userClient(');
    expect(corpsRelire).not.toContain('serviceClient(');
  });
});
