import { describe, expect, it } from 'vitest';
import {
  buildInvitationMail,
  buildMemberNoticeMail,
  connexionUrl,
  invitationUrl,
  type InvitationMailInput
} from '@/lib/invitation-mail';
import { mailLocales } from '@/lib/login-mail';

const token = 'B'.repeat(43);
const site = 'https://tenga.example';

const input = (
  over: Partial<InvitationMailInput> = {}
): InvitationMailInput => ({
  locale: 'fr',
  url: invitationUrl(site, 'fr', token),
  organisation: 'Acme',
  campagne: 'Bilan 2026',
  groupe: null,
  firstName: 'Sofia',
  message: null,
  total: 120,
  expire: '2026-11-20T10:00:00Z',
  contactEmail: 'contact@tenga.example',
  ...over
});

describe('invitationUrl et connexionUrl', () => {
  it('pointent sur /i/{jeton} et /connexion, préfixe de langue sauf en anglais', () => {
    expect(invitationUrl(site, 'en', token)).toBe(`${site}/i/${token}`);
    expect(invitationUrl(site, 'fr', token)).toBe(`${site}/fr/i/${token}`);
    expect(invitationUrl(site, 'ar', token)).toBe(`${site}/ar/i/${token}`);
    expect(connexionUrl(site, 'en')).toBe(`${site}/connexion`);
    expect(connexionUrl(`${site}/`, 'ar')).toBe(`${site}/ar/connexion`);
  });
});

describe('buildInvitationMail', () => {
  it('échappe le message et conserve les retours à la ligne en <br>', () => {
    const { html } = buildInvitationMail(
      input({ message: '<script>alert(1)</script>\n"Bienvenue" & merci' })
    );
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;<br>');
    expect(html).toContain('&quot;Bienvenue&quot; &amp; merci');
  });

  it('échappe le prénom, l’organisation et la campagne', () => {
    const { html } = buildInvitationMail(
      input({
        firstName: '<b>Sofia</b>',
        organisation: '<i>Acme</i>',
        campagne: '<u>Bilan</u>'
      })
    );
    expect(html).not.toMatch(/<(b|i|u)>/);
    expect(html).toContain('&lt;b&gt;Sofia&lt;/b&gt;');
  });

  it('pose dir="rtl" en arabe et dir="ltr" sinon', () => {
    const ar = input({ locale: 'ar', url: invitationUrl(site, 'ar', token) });
    expect(buildInvitationMail(ar).html).toContain('dir="rtl"');
    expect(buildInvitationMail(input()).html).toContain('dir="ltr"');
  });

  it('porte le lien /ar/i/{jeton} en HTML et en texte brut', () => {
    const url = invitationUrl(site, 'ar', token);
    const mail = buildInvitationMail(input({ locale: 'ar', url }));
    expect(url).toBe(`${site}/ar/i/${token}`);
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text).toContain(url);
  });

  it('a un objet sans CR ni LF, limité au nom d’organisation', () => {
    const { subject } = buildInvitationMail(
      input({ organisation: 'Acme\r\nBcc: x\nSA', message: 'secret' })
    );
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain('Acme');
    expect(subject).not.toContain('secret');
    expect(subject).not.toContain('Bilan');
  });

  it('salue par le prénom, sinon salutation neutre', () => {
    expect(buildInvitationMail(input()).text.startsWith('Bonjour Sofia,')).toBe(
      true
    );
    const neutral = buildInvitationMail(input({ firstName: null })).text;
    expect(neutral.startsWith('Bonjour,\n\n')).toBe(true);
    expect(neutral).not.toContain('null');
    const en = buildInvitationMail(input({ locale: 'en', firstName: null }));
    expect(en.text.startsWith('Hello,\n\n')).toBe(true);
  });

  it('n’affiche pas de blockquote sans message', () => {
    expect(buildInvitationMail(input()).html).not.toContain('blockquote');
    expect(buildInvitationMail(input({ message: '   ' })).html).not.toContain(
      'blockquote'
    );
    expect(buildInvitationMail(input({ message: 'Bonjour' })).html).toContain(
      'blockquote'
    );
  });

  it('annonce le nombre de questions et la date d’expiration de l’entrée', () => {
    const fr = buildInvitationMail(input({ total: 120 }));
    expect(fr.text).toContain('120');
    expect(fr.text).toContain('20 novembre 2026');
    const other = buildInvitationMail(
      input({ total: 30, expire: '2027-02-03T10:00:00Z' })
    );
    expect(other.text).toContain('3 février 2027');
    expect(other.text).not.toContain('20 novembre');
    const ar = buildInvitationMail(
      input({ locale: 'ar', url: invitationUrl(site, 'ar', token) })
    );
    expect(ar.text).toContain('20');
    expect(ar.text).toContain('2026');
  });

  it('garde la valeur reçue si la date est illisible, échappée', () => {
    const { html } = buildInvitationMail(input({ expire: '<demain>' }));
    expect(html).toContain('&lt;demain&gt;');
  });

  it('distingue la variante avec groupe de celle sans groupe', () => {
    const sans = buildInvitationMail(input());
    expect(sans.text).toContain('Bilan 2026');
    expect(sans.text).not.toContain('Équipe');
    const avec = buildInvitationMail(input({ groupe: 'Équipe Finance' }));
    expect(avec.text).toContain('Équipe Finance');
  });

  it('omet la question de contact sans adresse de contact', () => {
    const mail = buildInvitationMail(input({ contactEmail: '' }));
    expect(mail.text).not.toContain('contact@');
    expect(mail.text).not.toContain('Une question');
    expect(buildInvitationMail(input()).text).toContain(
      'contact@tenga.example'
    );
  });

  it('place l’espace insécable avant les deux-points en français', () => {
    const { text } = buildInvitationMail(input());
    expect(text).not.toMatch(/\S :/);
    expect(text).toContain(' :');
  });

  it('ne contient ni tiret cadratin ni promesse de marque', () => {
    for (const locale of mailLocales) {
      const mail = buildInvitationMail(
        input({ locale, url: invitationUrl(site, locale, token) })
      );
      const all = `${mail.subject} ${mail.text}`;
      expect(all).not.toContain('—');
      expect(all.toLowerCase()).not.toMatch(/gratuit|free|open source/);
    }
  });
});

describe('buildMemberNoticeMail', () => {
  for (const locale of mailLocales) {
    for (const role of ['responsable', 'consultant'] as const) {
      it(`${locale}/${role} : un seul lien de connexion, sans jeton`, () => {
        const url = connexionUrl(site, locale);
        const mail = buildMemberNoticeMail({
          locale,
          url,
          organisation: 'Acme',
          role,
          contactEmail: 'contact@tenga.example'
        });
        expect(mail.html).toContain(`href="${url}"`);
        expect(mail.text).toContain(url);
        const all = `${mail.subject}\n${mail.text}\n${mail.html}`;
        expect(all).not.toMatch(/[A-Za-z0-9_-]{43}/);
        expect(all).not.toContain('/i/');
        const links = all.match(/https?:\/\/[^\s"<]+/g) ?? [];
        expect(links.length).toBeGreaterThan(0);
        expect(links.every((link) => link === url)).toBe(true);
        expect(all.toLowerCase()).not.toMatch(/créé|created|créer|إنشاء/);
        expect(mail.subject).not.toMatch(/[\r\n]/);
      });
    }
  }

  it('annonce l’accès accordé et échappe l’organisation', () => {
    const mail = buildMemberNoticeMail({
      locale: 'fr',
      url: connexionUrl(site, 'fr'),
      organisation: '<b>Acme</b>',
      role: 'consultant',
      contactEmail: ''
    });
    expect(mail.text).toContain('accordé');
    expect(mail.html).not.toContain('<b>');
    expect(mail.html).toContain('dir="ltr"');
  });
});

describe('nom d’organisation : défense en profondeur contre l’hameçonnage', () => {
  const hostile = [
    'https://evil.example',
    'Acme evil.example/login',
    'mailto:a@evil.example',
    'Acme @ evil',
    'Ac\u200bme',
    'Ac\u200eme',
    'Ac\u200fme',
    'Ac\u061cme',
    'Ac\u2060me',
    'Ac\ufeffme'
  ];
  const fallbacks = {
    fr: 'Organisation cliente',
    ar: 'المؤسسة العميلة',
    en: 'Client organisation'
  } as const;

  for (const locale of mailLocales) {
    for (const organisation of hostile) {
      it(`invitation ${locale} : neutralise ${JSON.stringify(organisation)}`, () => {
        const { subject, html, text } = buildInvitationMail(
          input({
            locale,
            url: invitationUrl(site, locale, token),
            organisation
          })
        );
        for (const out of [subject, html, text]) {
          expect(out).not.toContain('evil');
          expect(out).not.toMatch(/[\u200b\u200e\u200f\u061c\u2060\ufeff]/);
        }
        expect(subject).toContain(fallbacks[locale]);
      });
      it(`avis d’accès ${locale} : neutralise ${JSON.stringify(organisation)}`, () => {
        const { subject, html, text } = buildMemberNoticeMail({
          locale,
          url: connexionUrl(site, locale),
          organisation,
          role: 'consultant',
          contactEmail: 'contact@tenga.example'
        });
        for (const out of [subject, html, text]) {
          expect(out).not.toContain('evil');
          expect(out).not.toMatch(/[\u200b\u200e\u200f\u061c\u2060\ufeff]/);
        }
        expect(subject).toContain(fallbacks[locale]);
      });
    }
  }

  it('garde intact un nom légitime, y compris « S.A. » et l’arabe', () => {
    for (const organisation of [
      'Société Générale du Maroc S.A.',
      'شركة الأطلس'
    ]) {
      const { subject, text } = buildInvitationMail(input({ organisation }));
      expect(subject).toContain(organisation);
      expect(text).toContain(organisation);
    }
  });

  it('un saut de ligne dans un nom légitime ne s’ajoute pas à l’objet', () => {
    const { subject } = buildInvitationMail(
      input({ organisation: 'Acme\r\nBcc: x' })
    );
    expect(subject).not.toMatch(/[\r\n]/);
  });
});
