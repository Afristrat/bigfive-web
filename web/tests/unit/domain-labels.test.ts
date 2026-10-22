import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { domainCodes, facetLabel } from '@/lib/domain-labels';

const source = resolve(
  __dirname,
  '../../../docs/design/bibliotheque-textes/facettes.json'
);
const bibliotheque = JSON.parse(readFileSync(source, 'utf8')) as {
  facettes: { code: string; domaine: string; libelle: { fr: string } }[];
};

const CODES = domainCodes.flatMap((d) =>
  [1, 2, 3, 4, 5, 6].map((i) => ({ d, i, code: `${d}${i}` }))
);

describe('libellés des 30 facettes', () => {
  it('la bibliothèque porte bien 30 facettes', () => {
    expect(bibliotheque.facettes).toHaveLength(30);
    expect(CODES).toHaveLength(30);
  });

  for (const { d, i, code } of CODES) {
    it(`${code} : le libellé français est celui de la bibliothèque`, () => {
      const attendu = bibliotheque.facettes.find((f) => f.code === code);
      expect(attendu, code).toBeDefined();
      expect(facetLabel(d, i, 'fr')).toBe(attendu?.libelle.fr);
    });
  }

  it('chaque libellé existe dans les trois langues, sans doublon dans une langue', () => {
    for (const lang of ['fr', 'en', 'ar']) {
      const libelles = CODES.map(({ d, i }) => facetLabel(d, i, lang));
      for (const libelle of libelles) expect(libelle.trim()).not.toBe('');
      expect(new Set(libelles).size, lang).toBe(30);
    }
  });

  it('les libellés anglais et arabes ne reprennent pas le français (traductions)', () => {
    const differents = (lang: string): number =>
      CODES.filter(
        ({ d, i }) => facetLabel(d, i, lang) !== facetLabel(d, i, 'fr')
      ).length;
    expect(differents('ar')).toBe(30);
    expect(differents('en')).toBeGreaterThanOrEqual(28);
  });

  it('une langue routable autre que fr et ar retombe sur l’anglais', () => {
    expect(facetLabel('N', 1, 'de')).toBe(facetLabel('N', 1, 'en'));
  });

  it('refuse une facette hors de 1 à 6', () => {
    expect(() => facetLabel('N', 7, 'fr')).toThrow(RangeError);
    expect(() => facetLabel('N', 0, 'fr')).toThrow(RangeError);
  });
});
