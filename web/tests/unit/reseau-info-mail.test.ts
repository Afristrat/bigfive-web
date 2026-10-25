import { describe, expect, it } from 'vitest';
import {
  buildReseauInfoMail,
  politiqueUrl,
  reseauInfoUrl
} from '@/lib/reseau-info-mail';

const PARTICIPATION = '11111111-2222-4333-8444-555555555555';
const SUIVI = encodeURIComponent(`/mes-resultats/reseau/${PARTICIPATION}`);
const URL_FR = `https://tenga.test/fr/connexion?next=${SUIVI}`;
const POLITIQUE_FR = 'https://tenga.test/fr/privacy';

const mail = (locale: 'fr' | 'ar' | 'en') =>
  buildReseauInfoMail({ locale, url: URL_FR, policyUrl: POLITIQUE_FR });

describe('reseauInfoUrl', () => {
  it.each([
    ['fr', `https://tenga.test/fr/connexion?next=${SUIVI}`],
    ['ar', `https://tenga.test/ar/connexion?next=${SUIVI}`],
    // Anglais : langue par défaut, sans préfixe (« as-needed »).
    ['en', `https://tenga.test/connexion?next=${SUIVI}`]
  ] as const)(
    '%s : connexion de la langue, retour vers le relevé de la participation',
    (locale, attendu) => {
      expect(reseauInfoUrl('https://tenga.test/', locale, PARTICIPATION)).toBe(
        attendu
      );
    }
  );
});

describe('politiqueUrl', () => {
  it.each([
    ['fr', 'https://tenga.test/fr/privacy'],
    ['ar', 'https://tenga.test/ar/privacy'],
    ['en', 'https://tenga.test/privacy']
  ] as const)(
    '%s : page de confidentialité de la langue',
    (locale, attendu) => {
      expect(politiqueUrl('https://tenga.test/', locale)).toBe(attendu);
    }
  );
});

describe('buildReseauInfoMail (information art. 14 du relevé du réseau)', () => {
  it.each(['fr', 'ar', 'en'] as const)(
    '%s : objet, liens, sens de lecture de la langue',
    (locale) => {
      const m = mail(locale);
      expect(m.subject.length).toBeGreaterThan(5);
      for (const v of [m.text, m.html]) {
        expect(v).toContain(URL_FR);
        expect(v).toContain(POLITIQUE_FR);
      }
      expect(m.html).toContain(`dir="${locale === 'ar' ? 'rtl' : 'ltr'}"`);
    }
  );

  it('porte les mentions obligatoires dans les trois langues', () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const { text } = mail(locale);
      expect(text).toContain('Tenga Conseil');
      expect(text).toContain('CNDP');
      expect(text).toMatch(/3|ثلاث|trois|three/);
    }
    expect(mail('fr').text).toContain('Responsable du traitement');
    expect(mail('fr').text).toContain('Je m’oppose à être cité dans ce relevé');
    expect(mail('en').text).toContain('I object to being named in this survey');
    expect(mail('ar').text).toContain('أعترض على ذكر اسمي في هذا الاستبيان');
  });

  it('ne contient aucune adresse de courriel ni aucun nom de personne', () => {
    for (const locale of ['fr', 'ar', 'en'] as const) {
      const m = mail(locale);
      expect(m.text).not.toMatch(/@/);
      expect(m.html).not.toMatch(/@/);
    }
  });

  it('les trois langues ont des objets et des textes distincts', () => {
    const mails = (['fr', 'ar', 'en'] as const).map(mail);
    expect(new Set(mails.map((m) => m.subject)).size).toBe(3);
    expect(new Set(mails.map((m) => m.text)).size).toBe(3);
  });

  it('le français met une espace insécable avant « : ; ? ! », jamais de tiret cadratin', () => {
    const m = mail('fr');
    for (const value of [m.subject, m.text, m.html]) {
      expect(value).not.toMatch(/\S [:;?!]/);
      expect(value).not.toContain('—');
    }
    expect(m.text).toContain('Tenga Conseil ;');
  });

  it('échappe les liens dans le HTML', () => {
    const m = buildReseauInfoMail({
      locale: 'en',
      url: 'https://x.test/?a=1&b="2"',
      policyUrl: 'https://x.test/p?c="3"&d=4'
    });
    expect(m.html).not.toContain('b="2"');
    expect(m.html).not.toContain('c="3"');
    expect(m.html).toContain('&amp;');
  });
});
