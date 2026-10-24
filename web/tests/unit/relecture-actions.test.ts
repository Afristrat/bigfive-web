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

const sendMail = vi.fn();
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: (mail: unknown) => sendMail(mail)
}));

const logSecurityEvent = vi.fn();
vi.mock('@/lib/security-log', () => ({
  logSecurityEvent: (...args: unknown[]) => logSecurityEvent(...args)
}));

const rafraichirApresEcriture = vi.fn();
vi.mock('@/lib/bibliotheque', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/bibliotheque')>()),
  rafraichirApresEcriture: () => rafraichirApresEcriture()
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
  rafraichirApresEcriture.mockReset().mockResolvedValue(true);
  revalidatePath.mockReset();
  sendMail.mockReset().mockResolvedValue(true);
  logSecurityEvent.mockReset();
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
    expect(rafraichirApresEcriture).toHaveBeenCalledOnce();
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

  it('200 verdicts par heure et par personne, contrôlés avant l’appel', async () => {
    rpc.mockResolvedValue(VERDICT);
    await relireBloc(idle, verdict());
    expect(isRateLimited).toHaveBeenCalledWith(
      'relireBloc',
      { max: 200, windowMs: 3_600_000 },
      VIEWER.id
    );
  });

  it('plafond atteint dans l’application : « plafond », sans appel', async () => {
    isRateLimited.mockResolvedValue(true);
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: 'plafond'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('plafond atteint en base (PT429) : « plafond », sans rafraîchir', async () => {
    rpc.mockRejectedValue(new GatewayError(429, 'PT429'));
    await expect(relireBloc(idle, verdict())).resolves.toEqual({
      status: 'plafond'
    });
    expect(rafraichirApresEcriture).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
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
    expect(rafraichirApresEcriture).not.toHaveBeenCalled();
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

  const ajoute = (langue = 'fr') => [{ ajoute: true, langue }];
  const deja = [{ ajoute: false, langue: 'fr' }];

  it('vérifie le super administrateur sur le chemin de l’atelier', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(ajoute());
    await designerRelecteur(idle, designation());
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin/relecture');
  });

  it('retrouve ou crée le compte (adresse normalisée, langue de la page), puis désigne', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: true });
    rpc.mockResolvedValue(ajoute());
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

  it('déjà relecteur : « déjà », sans erreur et sans avis', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(deja);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'deja'
    });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('désignation : un seul avis, à la personne désignée, dans la langue de son compte, après la base', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(ajoute('ar'));
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'ajoute'
    });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = sendMail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      text: string;
      html: string;
    };
    expect(mail.to).toBe('nezha@tenga.test');
    expect(mail.html).toContain('dir="rtl"');
    expect(mail.text).toContain('/ar/connexion?next=%2Fadmin%2Frelecture');
    expect(mail.text).not.toContain(VIEWER.email);
    expect(rpc.mock.invocationCallOrder[0]).toBeLessThan(
      sendMail.mock.invocationCallOrder[0] ?? 0
    );
  });

  it('la langue de l’avis est celle du compte, pas celle de la page', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(ajoute('en'));
    await designerRelecteur(idle, designation({ locale: 'ar' }));
    const mail = sendMail.mock.calls[0]?.[0] as { html: string; text: string };
    expect(mail.html).toContain('dir="ltr"');
    expect(mail.text).toContain('Open the review workshop');
    expect(mail.text).not.toContain('/ar/');
  });

  it('un envoi qui lève n’annule pas la désignation : erreur journalisée sans adresse', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: true });
    rpc.mockResolvedValue(ajoute());
    sendMail.mockRejectedValue(new TypeError('boom nezha@tenga.test'));
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'ajoute'
    });
    expect(discardCreatedAccount).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'relecture.designation_notice_failed',
      { ip: '203.0.113.1', reason: 'TypeError' }
    );
    expect(JSON.stringify(logSecurityEvent.mock.calls)).not.toMatch(/@/);
    expect(JSON.stringify(avertir.mock.calls)).not.toMatch(/@/);
    expect(revalidatePath).toHaveBeenCalledWith('/fr/admin/relecture');
    avertir.mockRestore();
  });

  it('un envoi refusé (false) n’annule pas la désignation et est journalisé', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(ajoute());
    sendMail.mockResolvedValue(false);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'ajoute'
    });
    expect(logSecurityEvent).toHaveBeenCalledWith(
      'relecture.designation_notice_failed',
      { ip: '203.0.113.1', reason: 'refused' }
    );
  });

  it('refus 42501 de la base (droit retiré entre-temps) : « interdit », sans avis ni journal d’échec', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'interdit'
    });
    expect(sendMail).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
    expect(avertir).not.toHaveBeenCalled();
    avertir.mockRestore();
  });

  it('n’envoie rien si la base refuse', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockRejectedValue(new GatewayError(403, '42501'));
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await designerRelecteur(idle, designation());
    expect(sendMail).not.toHaveBeenCalled();
    avertir.mockRestore();
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

  it('5 désignations par heure et par personne, contrôlées avant GoTrue', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: false });
    rpc.mockResolvedValue(ajoute());
    await designerRelecteur(idle, designation());
    expect(isRateLimited).toHaveBeenCalledWith(
      'designerRelecteur',
      { max: 5, windowMs: 3_600_000 },
      VIEWER.id
    );
  });

  it('plafond atteint dans l’application : « plafond », sans appel ni avis', async () => {
    isRateLimited.mockResolvedValue(true);
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'plafond'
    });
    expect(findOrCreateUser).not.toHaveBeenCalled();
    expect(sendMail).not.toHaveBeenCalled();
  });

  it('plafond atteint en base (PT429) : « plafond », compte créé par l’appel retiré, aucun avis', async () => {
    findOrCreateUser.mockResolvedValue({ id: CIBLE, created: true });
    rpc.mockRejectedValue(new GatewayError(429, 'PT429'));
    await expect(designerRelecteur(idle, designation())).resolves.toEqual({
      status: 'plafond'
    });
    expect(discardCreatedAccount).toHaveBeenCalledWith(
      expect.anything(),
      CIBLE
    );
    expect(sendMail).not.toHaveBeenCalled();
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
