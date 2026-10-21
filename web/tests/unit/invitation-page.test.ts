import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

// next-intl/server lit le catalogue français réel : une clé absente lève, ce qui
// attrape les fautes de frappe dans les noms de messages.
type Tree = { [key: string]: string | Tree };
vi.mock('next-intl/server', () => {
  const lookup = (namespace: string, key: string): string => {
    let node: string | Tree | undefined = (fr as Tree)[namespace];
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string')
      throw new Error(`Message absent ${namespace}.${key}`);
    return node;
  };
  return {
    setRequestLocale: () => undefined,
    getTranslations: async (arg: string | { namespace: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg.namespace;
      return (key: string, values?: Record<string, string>) =>
        lookup(namespace, key).replace(
          /\{(\w+)\}/g,
          (whole, name: string) => values?.[name] ?? whole
        );
    }
  };
});

const loadInvitation = vi.fn();
vi.mock('@/lib/invitation-data', () => ({
  loadInvitation: (token: unknown) => loadInvitation(token)
}));

const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (action: string, limit: unknown) =>
    isRateLimited(action, limit)
}));

vi.mock('@/actions/invitation-accept', () => ({ acceptInvitation: vi.fn() }));

// Le Link de next-intl exige le contexte de la requête : lien simple en test.
vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; className?: string }) =>
    createElement(
      'a',
      { href: props.href, className: props.className },
      props.children as never
    )
}));

import InvitationPage, {
  dynamic,
  generateMetadata
} from '@/app/[locale]/i/[jeton]/page';
import { AcceptResult } from '@/components/accept-invitation-form';
import { invitationLimits } from '@/lib/invitation-limits';

const TOKEN = `${'Zx9_-'.repeat(8)}Zx9`;
const NEUTRAL = fr.invitation.invalid;
const VIEW = {
  email: 'ines.invitee@exemple.ma',
  prenom: 'Inès',
  langue: 'fr',
  message: null,
  campagne_titre: 'Cohorte 2026',
  organisation_nom: 'Atelier Atlas',
  expire: '2026-11-20T10:00:00+00:00'
};

const render = async (jeton: string = TOKEN, locale = 'fr'): Promise<string> =>
  renderToStaticMarkup(
    await InvitationPage({ params: Promise.resolve({ locale, jeton }) })
  );

beforeEach(() => {
  vi.clearAllMocks();
  isRateLimited.mockResolvedValue(false);
  loadInvitation.mockResolvedValue(VIEW);
});

describe('page /i/{jeton}', () => {
  it('jeton valide : organisation, campagne, salutation, expiration, bouton', async () => {
    const html = await render();
    expect(html).toContain('Atelier Atlas');
    expect(html).toContain('Cohorte 2026');
    expect(html).toContain('Bonjour Inès,');
    expect(html).toContain('20 novembre 2026');
    expect(html).toContain(fr.invitation.button);
    expect(html).toContain(`name="token" value="${TOKEN}"`);
    expect(html).not.toContain('name="locale"');
    expect(html).not.toContain(NEUTRAL);
    // Le chargement ne consomme rien : la page ne passe que par la consultation.
    expect(loadInvitation).toHaveBeenCalledWith(TOKEN);
  });

  it('sans prénom : salutation neutre', async () => {
    loadInvitation.mockResolvedValue({ ...VIEW, prenom: null });
    const html = await render();
    expect(html).toContain('Bonjour,');
    expect(html).not.toContain('{prenom}');
  });

  it('jeton introuvable ou expiré : un seul refus neutre, sans formulaire', async () => {
    loadInvitation.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain(NEUTRAL);
    expect(html).not.toContain('<form');
    expect(html).not.toContain('Atelier Atlas');
  });

  it('jeton mal formé : même refus neutre, sans consulter la base ni compter la vue', async () => {
    const html = await render('court');
    expect(html).toContain(NEUTRAL);
    expect(html).not.toContain('<form');
    expect(loadInvitation).not.toHaveBeenCalled();
    // Un jeton qui n'a pas la bonne forme ne consomme aucun quota.
    expect(isRateLimited).not.toHaveBeenCalled();
  });

  it('page toujours dynamique : jamais servie depuis un cache', () => {
    expect(dynamic).toBe('force-dynamic');
  });

  it('date d’expiration lue au fuseau Africa/Casablanca (comme l’e-mail)', async () => {
    // 23 h 30 UTC le 19 : il est déjà 0 h 30 le 20 au Maroc.
    loadInvitation.mockResolvedValue({
      ...VIEW,
      expire: '2026-11-19T23:30:00+00:00'
    });
    expect(await render()).toContain('20 novembre 2026');
  });

  it('en arabe : prénom, organisation et campagne isolés (FSI et PDI)', async () => {
    const html = await render(TOKEN, 'ar');
    for (const value of ['Inès', 'Atelier Atlas', 'Cohorte 2026']) {
      expect(html).toContain(`⁨${value}⁩`);
    }
  });

  it('en français : pas de marque d’isolement dans les phrases', async () => {
    const html = await render();
    expect(html).not.toContain('⁨');
  });

  it('textes de tiers : coupure des mots trop longs', async () => {
    loadInvitation.mockResolvedValue({
      ...VIEW,
      message: 'x'.repeat(300)
    });
    const html = await render();
    expect(html).toMatch(/class="[^"]*break-words[^"]*"[^>]*>x{300}/);
  });

  it('plafond par IP atteint : même refus neutre, base non consultée', async () => {
    isRateLimited.mockResolvedValue(true);
    const html = await render();
    expect(html).toContain(NEUTRAL);
    expect(html).not.toContain('<form');
    expect(loadInvitation).not.toHaveBeenCalled();
    expect(isRateLimited).toHaveBeenCalledWith(
      'invitationView',
      invitationLimits.viewPerIp
    );
  });

  it('le refus est identique pour jeton inconnu, mal formé et plafond', async () => {
    loadInvitation.mockResolvedValue(null);
    const unknown = await render();
    const malformed = await render('court');
    isRateLimited.mockResolvedValue(true);
    const limited = await render();
    expect(malformed).toBe(unknown);
    expect(limited).toBe(unknown);
  });

  it('message libre : retours à la ligne gardés, balises échappées', async () => {
    loadInvitation.mockResolvedValue({
      ...VIEW,
      message: 'Bonjour <script>alert(1)</script>\n"Merci" & à bientôt'
    });
    const html = await render();
    // React ajoute son propre script de rejeu de formulaire : seul celui du message compte.
    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
    expect(html).toContain('&quot;Merci&quot; &amp; à bientôt');
    expect(html).toMatch(/class="[^"]*whitespace-pre-line[^"]*"/);
  });

  it('sans message : aucun bloc de message', async () => {
    const html = await render();
    expect(html).not.toContain(fr.invitation.messageTitle);
    expect(html).not.toContain('whitespace-pre-line');
  });

  it('nom d’organisation et prénom hostiles : échappés', async () => {
    loadInvitation.mockResolvedValue({
      ...VIEW,
      prenom: '<b>x</b>',
      organisation_nom: '<img src=x onerror=alert(1)>'
    });
    const html = await render();
    expect(html).not.toContain('<b>x</b>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
  });

  it('métadonnées : pas d’indexation, pas de Referer', async () => {
    const meta = await generateMetadata({
      params: Promise.resolve({ locale: 'fr', jeton: TOKEN })
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
    expect(meta.referrer).toBe('no-referrer');
    expect(JSON.stringify(meta)).not.toContain(TOKEN);
  });
});

describe('messages de l’acceptation', () => {
  const labels = {
    accepting: fr.invitation.accepting,
    unavailable: fr.invitation.invalid,
    otherSession: fr.invitation.otherSession,
    signinRequired: fr.invitation.signinRequired,
    signinLink: fr.invitation.signinLink,
    failed: fr.invitation.failed
  };
  const show = (status: Parameters<typeof AcceptResult>[0]['status']) =>
    renderToStaticMarkup(createElement(AcceptResult, { status, labels }));

  it('idle : la région vivante persistante existe, vide', () => {
    expect(show('idle')).toBe(
      '<div role="status" aria-atomic="true" class="max-w-md"></div>'
    );
  });

  it('en cours : état annoncé dans la région', () => {
    const html = renderToStaticMarkup(
      createElement(AcceptResult, { status: 'idle', labels, pending: true })
    );
    expect(html).toContain(fr.invitation.accepting);
  });

  it('invalid et unavailable : le même texte neutre', () => {
    expect(show('invalid')).toContain(NEUTRAL);
    expect(show('invalid')).toBe(show('unavailable'));
  });

  it('other_session : navigation privée ou déconnexion', () => {
    const html = show('other_session');
    expect(html).toContain('navigation privée');
    expect(html).toContain('déconnectez-vous');
  });

  it('signin_required : invitation acceptée, connexion par lien', () => {
    const html = show('signin_required');
    expect(html).toContain(fr.invitation.signinRequired);
    expect(html).toContain('invitation est acceptée');
    expect(html).toContain('lien de connexion');
    expect(html).toContain('href="/connexion"');
  });

  it('failed : réessayer plus tard', () => {
    expect(show('failed')).toContain('Réessayez plus tard');
  });

  it('chaque statut a un texte distinct, hors invalid et unavailable', () => {
    const texts = (
      ['unavailable', 'other_session', 'signin_required', 'failed'] as const
    ).map(show);
    expect(new Set(texts).size).toBe(4);
  });
});
