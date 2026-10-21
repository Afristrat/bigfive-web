import { describe, expect, it } from 'vitest';
import {
  buildAdminChangeMail,
  buildAdminGrantMail
} from '@/lib/admin-grant-mail';

const URL = 'https://tenga.test/fr/connexion';
const TARGET = 'nezha@tenga.test';

describe('buildAdminChangeMail (avis aux autres super administrateurs)', () => {
  const changes = ['added', 'removed'] as const;
  const locales = ['fr', 'ar', 'en'] as const;

  it.each(
    locales.flatMap((locale) =>
      changes.map((change) => [locale, change] as const)
    )
  )(
    '%s / %s : objet, HTML et texte avec l’adresse concernée et le lien',
    (locale, change) => {
      const mail = buildAdminChangeMail({
        locale,
        change,
        address: TARGET,
        url: URL
      });
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.text).toContain(TARGET);
      expect(mail.html).toContain(TARGET);
      expect(mail.text).toContain(URL);
      expect(mail.html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
    }
  );

  it('l’ajout et le retrait ont des objets et des textes distincts, dans chaque langue', () => {
    for (const locale of locales) {
      const added = buildAdminChangeMail({
        locale,
        change: 'added',
        address: TARGET,
        url: URL
      });
      const removed = buildAdminChangeMail({
        locale,
        change: 'removed',
        address: TARGET,
        url: URL
      });
      expect(added.subject).not.toBe(removed.subject);
      expect(added.text).not.toBe(removed.text);
    }
    const subjects = locales.map(
      (locale) =>
        buildAdminChangeMail({
          locale,
          change: 'added',
          address: TARGET,
          url: URL
        }).subject
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it('ne nomme pas l’acteur : une seule adresse dans le message', () => {
    const mail = buildAdminChangeMail({
      locale: 'fr',
      change: 'added',
      address: TARGET,
      url: URL
    });
    expect(mail.text.match(/\S+@\S+/g)).toEqual([TARGET]);
  });

  it('le français met une espace insécable avant « : ; ? ! »', () => {
    for (const change of changes) {
      const mail = buildAdminChangeMail({
        locale: 'fr',
        change,
        address: TARGET,
        url: URL
      });
      for (const value of [mail.subject, mail.text, mail.html]) {
        expect(value).not.toMatch(/\S [:;?!]/);
      }
    }
  });

  it('isole l’adresse dans le texte arabe (ordre de lecture)', () => {
    const mail = buildAdminChangeMail({
      locale: 'ar',
      change: 'removed',
      address: TARGET,
      url: URL
    });
    expect(mail.text).toContain(`⁨${TARGET}⁩`);
  });

  it('échappe l’adresse dans le HTML', () => {
    const mail = buildAdminChangeMail({
      locale: 'en',
      change: 'added',
      address: '"><b>x</b>@tenga.test',
      url: URL
    });
    expect(mail.html).not.toContain('<b>x</b>');
    expect(mail.html).toContain('&lt;b&gt;');
  });
});

describe('buildAdminGrantMail', () => {
  it.each(['fr', 'ar', 'en'] as const)(
    'produit objet, HTML et texte en %s avec le lien de connexion',
    (locale) => {
      const mail = buildAdminGrantMail({ locale, url: URL });
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.html).toContain(URL);
      expect(mail.text).toContain(URL);
      expect(mail.html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
    }
  );

  it('annonce l’accès super administrateur sans nommer l’acteur', () => {
    const mail = buildAdminGrantMail({ locale: 'fr', url: URL });
    expect(mail.text).toContain('super administrateur');
    expect(mail.text).toContain('Tenga Assessments');
    expect(mail.text).not.toMatch(/@/);
  });

  it('les trois langues ont des textes distincts', () => {
    const subjects = (['fr', 'ar', 'en'] as const).map(
      (locale) => buildAdminGrantMail({ locale, url: URL }).subject
    );
    expect(new Set(subjects).size).toBe(3);
  });

  it('le français met une espace insécable avant « : ; ? ! » (tous les gabarits)', () => {
    const mail = buildAdminGrantMail({ locale: 'fr', url: URL });
    for (const value of [mail.subject, mail.text, mail.html]) {
      expect(value).not.toMatch(/\S [:;?!]/);
    }
    expect(mail.text).toContain('e-mail\u00a0: un lien');
  });

  it('échappe le lien dans le HTML', () => {
    const mail = buildAdminGrantMail({
      locale: 'en',
      url: 'https://x.test/?a=1&b="2"'
    });
    expect(mail.html).not.toContain('b="2"');
    expect(mail.html).toContain('&amp;');
  });
});
