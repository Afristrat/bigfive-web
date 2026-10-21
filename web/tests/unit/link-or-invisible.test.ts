import { describe, expect, it } from 'vitest';
import {
  CAMPAIGN_TITLE_MAX,
  INVITATION_MESSAGE_MAX,
  INVITE_ADDRESS_MAX,
  hasLinkOrInvisible,
  invitationLocales,
  isInvitationLocale
} from '@/lib/access-rules';

describe('hasLinkOrInvisible : textes refusés', () => {
  const refused = [
    'voir https://evil.example',
    'voir HTTP://evil.example',
    'voir www.evil.example',
    'voir evil.example/login',
    'écrire à exemple.ma',
    'sur Exemple.Ma maintenant',
    'mailto:a@exemple.org',
    'contact : a@exemple.org',
    'x @ y',
    'ｈｔｔｐｓ：／／evil.example',
    'evil\u3002com',
    'ab\u200Bc',
    'ab\u200Ec',
    'ab\u200Fc',
    'ab\u061Cc',
    'ab\u2060c',
    '\uFEFFabc',
    'ab\u202Ec',
    'ab\u2067c',
    'evil\u200C.com',
    'evil\u200D.com',
    'evil.c\u00ADom',
    'evil\u00AD.com',
    'https\u00AD://evil',
    'evil\u0332.com',
    'evil.\u0301com',
    'ab\u{E0041}c',
    'ab\u2061c',
    'ab\u2062c',
    'ab\u2028c',
    'ab\u034Fc',
    'ab\u180Ec',
    'ab\u115Fc',
    'ab\uFE0Fc',
    'a\u200Cb',
    'ftp://evil.example',
    'javascript://x',
    '192.168.1.10/login',
    'evil.example/login',
    'Dr.Alami/x',
    'evil.COM',
    'evil.xyz',
    'exemple.ma',
    'EXEMPLE.FR',
    'evil.com-secure',
    'écrire à evil.click.',
    'a\u200D\u{1F468}',
    'evil.zip',
    'evil.mov',
    'evil.pro',
    'evil.in',
    'evil.ng',
    'evil.ly'
  ];
  for (const text of refused) {
    it(`refuse ${JSON.stringify(text)}`, () => {
      expect(hasLinkOrInvisible(text)).toBe(true);
    });
  }
});

describe('hasLinkOrInvisible : textes ordinaires acceptés', () => {
  const accepted = [
    '',
    'Bonjour à bientôt',
    'J.-P.',
    'Jean-Pierre',
    'Campagne 2026. Lot 1',
    'Version 2.5 du plan',
    'Fin du mois. Merci',
    'Dr. Martin',
    'S.A.R.L. Atlas',
    'Prix : 3,5 MAD (env. 0.35 EUR)',
    'مرحبا بكم',
    'می\u200Cخواهم',
    'كلمة\u200Dعربية',
    'Zoë Müller-O’Neil',
    'Dr.Alami',
    'Pr.Bennani',
    'Mme.Tazi',
    'M.Dupont',
    'Abd.Allah',
    'p.ex.',
    'ex.Merci',
    'M.Sc. en RH',
    'B.Sc en finance',
    'Merci.Cordialement',
    'Campagne 2026.Bilan',
    'Lot RH.Finance',
    'Réf.RH',
    'Ph.D.',
    'Aya.B',
    'شكرا.مع التحية',
    'Merci \u2764\uFE0F',
    '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}',
    '\u2764\uFE0E',
    'مُحَمَّد',
    'ب\u200Cب',
    'Prix 1.000.000 MAD',
    'Version 1.2.3'
  ];
  for (const text of accepted) {
    it(`accepte ${JSON.stringify(text)}`, () => {
      expect(hasLinkOrInvisible(text)).toBe(false);
    });
  }
});

describe('hasLinkOrInvisible : risque résiduel accepté', () => {
  // Décision visible : un suffixe hors liste sans « / » passe. Tout changement
  // de DOMAIN_SUFFIXES qui modifie ce comportement doit modifier ce test.
  it('accepte « evil.finance » (suffixe hors liste, sans barre oblique)', () => {
    expect(hasLinkOrInvisible('evil.finance')).toBe(false);
  });
  it('refuse « evil.finance/login » (barre oblique)', () => {
    expect(hasLinkOrInvisible('evil.finance/login')).toBe(true);
  });
});

describe('hasLinkOrInvisible : temps borné', () => {
  const BUDGET_MS = 200;
  const timed = (text: string): { ms: number; result: boolean } => {
    const start = performance.now();
    const result = hasLinkOrInvisible(text);
    return { ms: performance.now() - start, result };
  };

  it('refuse sans délai une entrée démesurée (100 000 caractères)', () => {
    const { ms, result } = timed('a.'.repeat(50_000));
    expect(result).toBe(true);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('refuse sans délai une entrée « a.a.a. » sans suffixe listé', () => {
    const { ms, result } = timed('a.a.a.'.repeat(20_000));
    expect(result).toBe(true);
    expect(ms).toBeLessThan(BUDGET_MS);
  });

  it('accepte un texte ordinaire de la longueur du plus grand plafond', () => {
    const text = 'a '.repeat(INVITATION_MESSAGE_MAX / 2);
    expect(text.length).toBe(INVITATION_MESSAGE_MAX);
    expect(hasLinkOrInvisible(text)).toBe(false);
  });

  it('refuse un texte plus long que le plus grand plafond', () => {
    expect(hasLinkOrInvisible('a'.repeat(INVITATION_MESSAGE_MAX + 1))).toBe(
      true
    );
  });
});

describe('constantes partagées', () => {
  it('expose les plafonds et les langues en un seul endroit', () => {
    expect(CAMPAIGN_TITLE_MAX).toBe(160);
    expect(INVITE_ADDRESS_MAX).toBe(254);
    expect(invitationLocales).toEqual(['fr', 'ar', 'en']);
    expect(invitationLocales.every(isInvitationLocale)).toBe(true);
  });
});
