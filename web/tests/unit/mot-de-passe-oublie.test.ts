import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// « Mot de passe oublié » d'un administrateur Tenga : aucune voie nouvelle côté
// serveur. La demande est celle du lien de connexion (mêmes plafonds, même
// réponse neutre, même durée minimale), avec pour destination la rubrique mot
// de passe de Mon compte ; le nouveau mot de passe s'y choisit sans l'ancien,
// avec le code TOTP (changeAdminPassword, couvert par security-actions.test).

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));
const after = vi.fn();
vi.mock('next/server', () => ({ after: (task: unknown) => after(task) }));

const jar = { get: vi.fn(), has: vi.fn(), set: vi.fn() };
vi.mock('next/headers', () => ({ cookies: async () => jar }));

vi.mock('@/lib/rate-limit', () => ({
  getClientIp: async () => '203.0.113.9',
  sharedLimiter: { isLimited: vi.fn() }
}));
const logSecurityEvent = vi.fn();
vi.mock('@/lib/security-log', () => ({
  logSecurityEvent: (...args: unknown[]) => logSecurityEvent(...args)
}));
vi.mock('@/lib/mailer', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mailer')>()),
  sendMail: vi.fn()
}));
// La durée minimale est éprouvée par auth-actions.test : ici, aucune attente.
vi.mock('@/lib/min-duration', () => ({ holdUntil: async () => undefined }));

const rpc = vi.fn();
const openSession = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  serviceClient: () => ({ rpc, openSession }),
  userClient: () => ({ signOut: vi.fn() })
}));

import { consumeLoginCode, requestLoginLink } from '@/actions/auth';
import { LoginForm, type LoginLabels } from '@/components/login-form';
import {
  FORGOT_NEXT,
  PasswordLoginForm
} from '@/components/password-login-form';
import { sharedLimiter } from '@/lib/rate-limit';
import { DEFAULT_AFTER_LOGIN } from '@/lib/route-guard';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';
import { NEXT_COOKIE, nextCookie, resolveNext } from '@/lib/session-cookies';
import fr from '@/messages/fr.js';

const ADDRESS = 'admin@tenga.test';
const USER_ID = '11111111-1111-4111-8111-111111111111';

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};

const link: LoginLabels = {
  emailLabel: fr.login.emailLabel,
  submit: fr.login.submit,
  sending: fr.login.sending,
  invalid: fr.login.invalid,
  sent: fr.login.sent,
  sentHelp: fr.login.sentHelp,
  retry: fr.login.retry,
  code: {
    title: fr.login.codeTitle,
    intro: fr.login.codeIntro,
    emailLabel: fr.login.emailLabel,
    codeLabel: fr.login.codeLabel,
    submit: fr.login.codeSubmit,
    checking: fr.login.codeChecking,
    error: fr.login.codeError,
    invalid: fr.login.codeInvalid
  }
};

const nextWrites = (): unknown[] =>
  jar.set.mock.calls
    .filter(([name, value]) => name === NEXT_COOKIE && value !== '')
    .map(([, value]) => value);

beforeEach(() => {
  jar.get.mockReset().mockReturnValue(undefined);
  jar.set.mockReset();
  rpc.mockReset();
  openSession.mockReset().mockResolvedValue({
    accessToken: 'aaaa.bbbb.cccc',
    refreshToken: 'rt',
    expiresIn: 3600
  });
  after.mockReset();
  logSecurityEvent.mockReset();
  vi.mocked(sharedLimiter.isLimited).mockReset().mockReturnValue(false);
});

describe('destination du lien « mot de passe oublié »', () => {
  it('est un chemin interne sûr, ancre comprise, jusqu’à la redirection', () => {
    expect(FORGOT_NEXT).toBe('/mon-compte#mot-de-passe');
    expect(safeInternalPath(FORGOT_NEXT, '')).toBe(FORGOT_NEXT);
    expect(nextCookie(FORGOT_NEXT)?.value).toBe(FORGOT_NEXT);
    expect(resolveNext(FORGOT_NEXT, DEFAULT_AFTER_LOGIN)).toBe(FORGOT_NEXT);
    expect(localizedPath('fr', FORGOT_NEXT)).toBe(
      '/fr/mon-compte#mot-de-passe'
    );
    expect(localizedPath('en', FORGOT_NEXT)).toBe('/mon-compte#mot-de-passe');
  });

  it('sans le cookie (lien ouvert sur un autre appareil), la connexion mène tout de même à Mon compte', () => {
    expect(resolveNext(undefined, DEFAULT_AFTER_LOGIN)).toBe('/mon-compte');
  });
});

describe('demande : la voie du lien de connexion, sans différence observable', () => {
  const ask = () =>
    requestLoginLink(
      { status: 'idle' },
      form({ email: ADDRESS, locale: 'fr', next: FORGOT_NEXT })
    );

  it('réponse « envoyé » et destination mémorisée ; l’envoi part après la réponse', async () => {
    expect(await ask()).toEqual({ status: 'sent', email: ADDRESS });
    expect(nextWrites()).toEqual([FORGOT_NEXT]);
    expect(after).toHaveBeenCalledTimes(1);
    // Le travail variable (base, envoi) n'a pas encore eu lieu.
    expect(rpc).not.toHaveBeenCalled();
  });

  it('plafond atteint : même réponse, rien n’est envoyé, seul le journal le sait', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    expect(await ask()).toEqual({ status: 'sent', email: ADDRESS });
    expect(after).not.toHaveBeenCalled();
    expect(logSecurityEvent).toHaveBeenCalledWith('login.rate_limited', {
      ip: '203.0.113.9',
      scope: 'ip'
    });
  });

  it('les mêmes plafonds que le lien de connexion (IP, puis adresse)', async () => {
    await ask();
    const scopes = vi
      .mocked(sharedLimiter.isLimited)
      .mock.calls.map(([scope]) => scope);
    expect(scopes).toEqual(['magicLinkPerIp', 'magicLinkPerAddress']);
  });

  it('le journal ne reçoit ni l’adresse, ni le lien, ni le code', async () => {
    vi.mocked(sharedLimiter.isLimited).mockReturnValue(true);
    await ask();
    const logged = JSON.stringify(logSecurityEvent.mock.calls);
    expect(logged).not.toContain(ADDRESS);
    expect(logged).not.toContain('mot-de-passe');
  });
});

describe('après le code reçu : arrivée sur la rubrique mot de passe', () => {
  it('le code juste redirige vers /fr/mon-compte#mot-de-passe', async () => {
    jar.get.mockImplementation((name: string) =>
      name === NEXT_COOKIE ? { name, value: FORGOT_NEXT } : undefined
    );
    rpc.mockResolvedValue(USER_ID);
    await expect(
      consumeLoginCode(
        { status: 'idle' },
        form({ email: ADDRESS, code: '123456', locale: 'fr' })
      )
    ).rejects.toThrow('REDIRECT:/fr/mon-compte#mot-de-passe');
  });
});

describe('formulaires', () => {
  it('la demande porte la destination dans un champ caché', () => {
    const html = renderToStaticMarkup(
      createElement(LoginForm, {
        locale: 'fr',
        next: FORGOT_NEXT,
        labels: link
      })
    );
    expect(html).toContain('name="next" value="/mon-compte#mot-de-passe"');
  });

  it('le volet administrateur propose « mot de passe oublié » et ne demande aucun ancien mot de passe', () => {
    const html = renderToStaticMarkup(
      createElement(PasswordLoginForm, {
        locale: 'fr',
        link,
        labels: fr.login.password
      })
    );
    expect(html).toContain(fr.login.password.forgot.open);
    expect(html).toContain(fr.login.password.stepOne);
    expect(html.match(/type="password"/g)).toHaveLength(1);
  });

  it('« mot de passe oublié » passe par LoginForm, donc par requestLoginLink', () => {
    const source = readFileSync(
      'src/components/password-login-form.tsx',
      'utf8'
    );
    expect(source).toMatch(/<LoginForm[\s\S]*?next=\{FORGOT_NEXT\}/);
    expect(readFileSync('src/components/login-form.tsx', 'utf8')).toContain(
      'useActionState(requestLoginLink'
    );
  });

  it('la rubrique mot de passe de Mon compte porte l’ancre', () => {
    expect(readFileSync('src/components/security-forms.tsx', 'utf8')).toContain(
      "id='mot-de-passe'"
    );
  });
});
