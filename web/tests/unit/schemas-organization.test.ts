import { describe, expect, it } from 'vitest';
import { organizationSchema } from '@/schemas';

const parse = (nom: string) =>
  organizationSchema.safeParse({ nom, slug: 'acme-ma' });

describe('organizationSchema : nom refusé (hameçonnage)', () => {
  const refused: [string, string][] = [
    ['URL https', 'https://evil.example'],
    ['URL https dans un nom', 'Acme https://evil.example/login'],
    ['domaine avec chemin', 'evil.example/login'],
    ['mailto', 'mailto:a@evil.example'],
    ['arobase', 'Acme @ evil'],
    ['U+200B', 'Ac​me'],
    ['U+200E', 'Ac‎me'],
    ['U+200F', 'Ac‏me'],
    ['U+061C', 'Ac؜me'],
    ['U+2060', 'Ac⁠me'],
    ['U+FEFF', 'Ac﻿me']
  ];
  for (const [label, nom] of refused) {
    it(`refuse ${label}`, () => {
      expect(parse(nom).success).toBe(false);
    });
  }
});

describe('organizationSchema : nom légitime accepté', () => {
  const accepted: [string, string][] = [
    ['français', 'Société Générale du Maroc S.A.'],
    ['accents', 'Éléctricité de l’Atlas'],
    ['apostrophe droite', "L'Oréal Maroc"],
    ['tiret', 'Saint-Gobain Maroc'],
    ['point final', 'Acme Maroc.'],
    ['arabe', 'شركة الأطلس للتأمين'],
    ['arabe avec U+200C entre lettres', 'می‌خواهم'],
    ['arabe avec U+200D entre lettres', 'ب‍ر']
  ];
  for (const [label, nom] of accepted) {
    it(`accepte ${label}`, () => {
      expect(parse(nom).success).toBe(true);
    });
  }

  it('conserve le nom rogné', () => {
    const r = parse('  Acme  ');
    expect(r.success && r.data.nom).toBe('Acme');
  });
});
