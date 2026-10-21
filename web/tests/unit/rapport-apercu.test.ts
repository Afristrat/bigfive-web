import { describe, expect, it } from 'vitest';
import { rapportApercuHtml } from '@/data/rapport-apercu-html';
import {
  rapportApercuDocxBase64,
  rapportApercuMarkdown,
  rapportApercuPdfBase64
} from '@/data/rapport-apercu-fichiers';

// Garde du rapport « cabinet » servi sous /admin/apercu-rapport : les cinq niveaux
// du mandat, l'étiquetage fictif, aucun avatar animé, et des exports non vides.
const NIVEAUX = [
  'n1-individuel',
  'n2-relations',
  'n3-equipe',
  'n4-organisation',
  'n5-accompagnement'
];

describe('rapport cabinet : page et exports', () => {
  it('porte les cinq niveaux dans l’ordre du mandat', () => {
    const positions = NIVEAUX.map((id) =>
      rapportApercuHtml.indexOf(`id="${id}"`)
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('étiquette le cas comme fictif et le profil d’Amine comme une estimation', () => {
    expect(rapportApercuHtml).toMatch(/fictif/i);
    expect(rapportApercuHtml).toMatch(/estimation/i);
  });

  it('n’anime aucun avatar et n’évoque aucune voix', () => {
    expect(rapportApercuHtml).not.toMatch(/\.avatar[^{]*\{[^}]*animation/);
    expect(rapportApercuHtml).not.toMatch(/<audio|speechSynthesis/);
  });

  it('exporte un PDF, un Word, un Markdown non vides', () => {
    expect(
      Buffer.from(rapportApercuPdfBase64, 'base64').subarray(0, 5).toString()
    ).toBe('%PDF-');
    expect(
      Buffer.from(rapportApercuDocxBase64, 'base64').subarray(0, 2).toString()
    ).toBe('PK');
    expect(rapportApercuMarkdown.length).toBeGreaterThan(5000);
  });

  it('ne contient aucun pourcentage de compatibilité', () => {
    expect(rapportApercuMarkdown).not.toMatch(/\d\s?%\s+de\s+compatibilit/i);
  });
});
