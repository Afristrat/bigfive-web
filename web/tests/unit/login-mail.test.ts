import { describe, expect, it } from 'vitest';
import {
  buildLoginMail,
  loginUrl,
  mailLocales,
  toMailLocale
} from '@/lib/login-mail';

const token = 'A'.repeat(43);
const url = (locale: 'fr' | 'ar' | 'en') =>
  loginUrl('https://tenga.example', locale, token);

describe('loginUrl', () => {
  it('pointe sur /c/{jeton}, avec le préfixe de langue sauf en anglais', () => {
    expect(url('en')).toBe(`https://tenga.example/c/${token}`);
    expect(url('fr')).toBe(`https://tenga.example/fr/c/${token}`);
    expect(url('ar')).toBe(`https://tenga.example/ar/c/${token}`);
  });

  it('ignore la barre finale de l’adresse du site', () => {
    expect(loginUrl('https://tenga.example/', 'fr', token)).toBe(url('fr'));
  });
});

describe('toMailLocale', () => {
  it('garde fr, ar et en, sinon le repli', () => {
    expect(toMailLocale('ar')).toBe('ar');
    expect(toMailLocale('es')).toBe('fr');
    expect(toMailLocale(null, 'en')).toBe('en');
  });
});

describe('buildLoginMail', () => {
  for (const locale of mailLocales) {
    describe(locale, () => {
      const mail = buildLoginMail({ locale, url: url(locale), code: '042917' });

      it('contient le lien /c/{jeton} et le code à 6 chiffres, en HTML et en texte', () => {
        expect(mail.html).toContain(`href="${url(locale)}"`);
        expect(mail.text).toContain(url(locale));
        expect(mail.html).toContain('042917');
        expect(mail.text).toContain('042917');
      });

      it('a un objet et mentionne les 15 minutes', () => {
        expect(mail.subject).toContain('Tenga Assessments');
        expect(mail.text).toContain('15');
      });

      it('ne contient aucune promesse de marque', () => {
        const all = `${mail.subject} ${mail.text}`.toLowerCase();
        for (const banned of [
          'gratuit',
          'free',
          'open source',
          'scientifique',
          'مجاني'
        ]) {
          expect(all).not.toContain(banned);
        }
      });
    });
  }

  it('écrit l’arabe de droite à gauche, le code restant de gauche à droite', () => {
    const { html } = buildLoginMail({
      locale: 'ar',
      url: url('ar'),
      code: '123456'
    });
    expect(html).toContain('<div dir="rtl"');
    expect(html).toContain('<strong dir="ltr"');
  });

  it('écrit le français et l’anglais de gauche à droite', () => {
    for (const locale of ['fr', 'en'] as const) {
      expect(
        buildLoginMail({ locale, url: url(locale), code: '123456' }).html
      ).toContain('<div dir="ltr"');
    }
  });

  it('utilise une espace insécable avant les deux-points en français', () => {
    const { text } = buildLoginMail({
      locale: 'fr',
      url: url('fr'),
      code: '123456'
    });
    expect(text).toContain('ce code :');
    expect(text).toContain('par vous ?');
    expect(text).not.toContain('—');
  });

  it('écrit en arabe sans caractères latins superflus hormis la marque', () => {
    const { subject, text } = buildLoginMail({
      locale: 'ar',
      url: url('ar'),
      code: '123456'
    });
    expect(subject).toMatch(/[؀-ۿ]/);
    expect(text).toMatch(/[؀-ۿ]/);
  });
});
