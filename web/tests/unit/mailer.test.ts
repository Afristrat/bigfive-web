import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  MailConfigError,
  buildLinkMail,
  canonicalAddress,
  escapeHtml,
  sendMail
} from '@/lib/mailer';

describe('escapeHtml', () => {
  it('échappe les cinq caractères sensibles', () => {
    expect(escapeHtml(`<a href="x" onclick='y'>&</a>`)).toBe(
      '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;'
    );
  });

  it('échappe « & » en premier, sans double échappement', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('laisse intacts texte accentué, arabe et chaîne vide', () => {
    expect(escapeHtml('Déjà là، مرحبا')).toBe('Déjà là، مرحبا');
    expect(escapeHtml('')).toBe('');
  });
});

describe('canonicalAddress', () => {
  it('met en minuscules', () => {
    expect(canonicalAddress('Alice@Tenga.MA')).toBe('alice@tenga.ma');
  });

  it('retire le suffixe « +alias »', () => {
    expect(canonicalAddress('alice+test@tenga.ma')).toBe('alice@tenga.ma');
  });

  it('retire les points pour Gmail et Googlemail seulement', () => {
    expect(canonicalAddress('a.l.i.c.e@gmail.com')).toBe('alice@gmail.com');
    expect(canonicalAddress('a.l.i+x@googlemail.com')).toBe(
      'ali@googlemail.com'
    );
    expect(canonicalAddress('a.l.i@tenga.ma')).toBe('a.l.i@tenga.ma');
  });

  it('traite deux alias d’une même boîte comme une seule adresse', () => {
    expect(canonicalAddress('A.lice+1@gmail.com')).toBe(
      canonicalAddress('alice+2@Gmail.com')
    );
  });
});

describe('buildLinkMail', () => {
  const base = {
    intro: 'Voici votre lien.',
    action: 'Se connecter',
    url: 'https://tenga.example/c/abc',
    note: 'Valable 15 minutes.',
    dir: 'ltr' as const
  };

  it('produit le bouton, l’URL en clair et la note, en HTML et en texte', () => {
    const { html, text } = buildLinkMail(base);
    expect(html).toContain('<div dir="ltr"');
    expect(html).toContain('<a href="https://tenga.example/c/abc"');
    expect(html).toContain('>Se connecter</a>');
    expect(html).toContain('<p>https://tenga.example/c/abc</p>');
    expect(text).toBe(
      'Voici votre lien.\n\nSe connecter\nhttps://tenga.example/c/abc\n\nValable 15 minutes.'
    );
  });

  it('place la salutation et le message facultatif', () => {
    const { html, text } = buildLinkMail({
      ...base,
      greeting: 'Bonjour Sofia,',
      message: { title: 'Message de Tenga', body: 'Ligne 1\nLigne 2' }
    });
    expect(html.indexOf('Bonjour Sofia,')).toBeLessThan(html.indexOf('Voici'));
    expect(html).toContain('Ligne 1<br>Ligne 2');
    expect(text.startsWith('Bonjour Sofia,\n\nVoici votre lien.')).toBe(true);
    expect(text).toContain('Message de Tenga\nLigne 1\nLigne 2');
  });

  it('échappe toute valeur injectée', () => {
    const { html } = buildLinkMail({
      ...base,
      greeting: '<script>x</script>',
      url: 'https://x.example/?a="1"&b=2',
      message: { title: '<b>t</b>', body: '<img src=x onerror=y>' }
    });
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img');
    expect(html).not.toContain('<b>t</b>');
    expect(html).toContain('href="https://x.example/?a=&quot;1&quot;&amp;b=2"');
  });

  it('pose la direction de droite à gauche', () => {
    expect(buildLinkMail({ ...base, dir: 'rtl' }).html).toContain('dir="rtl"');
  });
});

describe('sendMail', () => {
  const mail = { to: 'a@b.c', subject: 'S', text: 't', html: '<p>h</p>' };

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('lève MailConfigError sans clé Resend, sans appeler le réseau', async () => {
    vi.stubEnv('RESEND_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendMail(mail)).rejects.toBeInstanceOf(MailConfigError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('envoie avec la clé et l’expéditeur configurés', async () => {
    vi.stubEnv('RESEND_API_KEY', 'cle-de-test');
    vi.stubEnv('EMAIL_FROM', 'Tenga <test@tenga.example>');
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
    await expect(sendMail(mail)).resolves.toBe(true);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer cle-de-test'
    );
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    expect(body).toMatchObject({
      from: 'Tenga <test@tenga.example>',
      to: ['a@b.c'],
      subject: 'S'
    });
  });

  it('renvoie false et ne journalise que le code HTTP si Resend refuse', async () => {
    vi.stubEnv('RESEND_API_KEY', 'cle-de-test');
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 422 })
    );
    await expect(sendMail(mail)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      'Resend responded with HTTP 422'
    );
  });

  it('renvoie false si le réseau échoue, sans fuite d’adresse dans le journal', async () => {
    vi.stubEnv('RESEND_API_KEY', 'cle-de-test');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('a@b.c')));
    await expect(sendMail(mail)).resolves.toBe(false);
    expect(console.error).toHaveBeenCalledWith('Resend request failed');
  });
});
