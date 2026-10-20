import { describe, expect, it, vi } from 'vitest';
import {
  LoginMailError,
  deliverLoginLink,
  type DeliveryDeps,
  type IssuedLink
} from '@/lib/login-delivery';

const token = 'B'.repeat(43);
const issued = (over: Partial<IssuedLink> = {}): IssuedLink => ({
  envoyer: true,
  jeton: token,
  code: '123456',
  langue: 'ar',
  ...over
});

const setup = (link: IssuedLink | null, sent = true) => {
  const send = vi.fn(async () => sent);
  const issue = vi.fn(async () => link);
  const deps: DeliveryDeps = { issue, send, siteUrl: 'https://tenga.example' };
  return { deps, send, issue };
};

describe('deliverLoginLink', () => {
  it('n’envoie rien quand la base ne le demande pas (adresse inconnue)', async () => {
    const { deps, send } = setup(
      issued({ envoyer: false, jeton: null, code: null })
    );
    await deliverLoginLink(deps, 'inconnu@tenga.ma', 'fr');
    expect(send).not.toHaveBeenCalled();
  });

  it('n’envoie rien quand la base ne répond pas de ligne', async () => {
    const { deps, send } = setup(null);
    await deliverLoginLink(deps, 'a@tenga.ma', 'fr');
    expect(send).not.toHaveBeenCalled();
  });

  it('envoie le lien et le code, dans la langue du profil', async () => {
    const { deps, send } = setup(issued());
    await deliverLoginLink(deps, 'a@tenga.ma', 'fr');
    expect(send).toHaveBeenCalledTimes(1);
    const mail = (
      send.mock.calls[0] as unknown as [
        { to: string; html: string; text: string }
      ]
    )[0];
    expect(mail.to).toBe('a@tenga.ma');
    expect(mail.html).toContain(`https://tenga.example/ar/c/${token}`);
    expect(mail.text).toContain('123456');
    expect(mail.html).toContain('dir="rtl"');
  });

  it('retombe sur la langue de la page sans langue de profil', async () => {
    const { deps, send } = setup(issued({ langue: null }));
    await deliverLoginLink(deps, 'a@tenga.ma', 'en');
    const mail = (send.mock.calls[0] as unknown as [{ html: string }])[0];
    expect(mail.html).toContain(`https://tenga.example/c/${token}`);
  });

  it('lève si le fournisseur refuse l’envoi (échec visible)', async () => {
    const { deps } = setup(issued(), false);
    await expect(
      deliverLoginLink(deps, 'a@tenga.ma', 'fr')
    ).rejects.toBeInstanceOf(LoginMailError);
  });

  it('lève et n’envoie rien si le jeton ou le code ont une forme inattendue', async () => {
    for (const bad of [
      issued({ jeton: 'court' }),
      issued({ code: '12345' }),
      issued({ jeton: null })
    ]) {
      const { deps, send } = setup(bad);
      await expect(
        deliverLoginLink(deps, 'a@tenga.ma', 'fr')
      ).rejects.toBeInstanceOf(LoginMailError);
      expect(send).not.toHaveBeenCalled();
    }
  });

  it('laisse remonter une erreur de la base', async () => {
    const deps: DeliveryDeps = {
      issue: async () => {
        throw new Error('base indisponible');
      },
      send: async () => true,
      siteUrl: 'https://tenga.example'
    };
    await expect(deliverLoginLink(deps, 'a@tenga.ma', 'fr')).rejects.toThrow(
      'base indisponible'
    );
  });
});
