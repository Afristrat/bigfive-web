import { describe, expect, it } from 'vitest';
import { buildRelecteurMail, relecteurUrl } from '@/lib/relecture-mail';

const URL_FR = 'https://tenga.test/fr/connexion?next=%2Fadmin%2Frelecture';

describe('relecteurUrl', () => {
  it.each([
    ['fr', 'https://tenga.test/fr/connexion?next=%2Fadmin%2Frelecture'],
    ['ar', 'https://tenga.test/ar/connexion?next=%2Fadmin%2Frelecture'],
    // Anglais : langue par défaut, sans préfixe (« as-needed »).
    ['en', 'https://tenga.test/connexion?next=%2Fadmin%2Frelecture']
  ] as const)(
    '%s : page de connexion de la langue, retour vers l’atelier de relecture',
    (locale, attendu) => {
      expect(relecteurUrl('https://tenga.test', locale)).toBe(attendu);
    }
  );
});

describe('buildRelecteurMail (avis de désignation d’un relecteur)', () => {
  it.each(['fr', 'ar', 'en'] as const)(
    '%s : objet, HTML et texte avec le lien, sens de lecture de la langue',
    (locale) => {
      const mail = buildRelecteurMail({ locale, url: URL_FR });
      expect(mail.subject.length).toBeGreaterThan(5);
      expect(mail.text).toContain(URL_FR);
      expect(mail.html).toContain(URL_FR.replace(/&/g, '&amp;'));
      expect(mail.html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
    }
  );

  it('annonce l’atelier de relecture sans nommer l’acteur ni aucune adresse', () => {
    const mail = buildRelecteurMail({ locale: 'fr', url: URL_FR });
    expect(mail.subject).toContain('relecture');
    expect(mail.text).toContain('Tenga Assessments');
    expect(mail.text).not.toMatch(/@/);
    expect(mail.html).not.toMatch(/@/);
  });

  it('ne promet pas un accès d’administration : l’atelier seul', () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const mail = buildRelecteurMail({ locale, url: URL_FR });
      expect(mail.text).not.toMatch(/super administrat|super administrator/i);
    }
  });

  it('les trois langues ont des objets et des textes distincts', () => {
    const mails = (['fr', 'ar', 'en'] as const).map((locale) =>
      buildRelecteurMail({ locale, url: URL_FR })
    );
    expect(new Set(mails.map((m) => m.subject)).size).toBe(3);
    expect(new Set(mails.map((m) => m.text)).size).toBe(3);
  });

  it('le français met une espace insécable avant « : ; ? ! », jamais de tiret cadratin', () => {
    const mail = buildRelecteurMail({ locale: 'fr', url: URL_FR });
    for (const value of [mail.subject, mail.text, mail.html]) {
      expect(value).not.toMatch(/\S [:;?!]/);
      expect(value).not.toContain('—');
    }
  });

  it('échappe le lien dans le HTML', () => {
    const mail = buildRelecteurMail({
      locale: 'en',
      url: 'https://x.test/?a=1&b="2"'
    });
    expect(mail.html).not.toContain('b="2"');
    expect(mail.html).toContain('&amp;');
  });
});
