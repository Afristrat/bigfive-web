import { describe, expect, it } from 'vitest';
import { niveauDeScore } from '@/lib/niveau';

describe('niveauDeScore', () => {
  it('classe un domaine de 24 questions autour de 72', () => {
    expect(niveauDeScore(87, 24)).toBe('high');
    expect(niveauDeScore(64, 24)).toBe('low');
    expect(niveauDeScore(72, 24)).toBe('neutral');
    expect(niveauDeScore(73, 24)).toBe('high');
    expect(niveauDeScore(71, 24)).toBe('low');
  });

  it('classe une facette de 4 questions autour de 12', () => {
    expect(niveauDeScore(12, 4)).toBe('neutral');
    expect(niveauDeScore(4, 4)).toBe('low');
    expect(niveauDeScore(20, 4)).toBe('high');
  });
});
