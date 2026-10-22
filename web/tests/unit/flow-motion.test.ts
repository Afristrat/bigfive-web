import { describe, expect, it } from 'vitest';
import { progressByDomain, progressQuarter } from '@/lib/questionnaire-keys';
import { decelere, valeurMontee } from '@/lib/count-up';

const questions = [
  { id: 'a', domain: 'N' },
  { id: 'b', domain: 'E' },
  { id: 'c', domain: 'N' },
  { id: 'd', domain: 'O' }
];

describe('progressByDomain', () => {
  it('compte les réponses et les affirmations de chaque facteur, dans l’ordre donné', () => {
    const answers = [
      { id: 'a', domain: 'N', score: 5 },
      { id: 'd', domain: 'O', score: 1 }
    ];
    expect(progressByDomain(questions, answers, ['N', 'E', 'O'])).toEqual([
      { code: 'N', fait: 1, total: 2 },
      { code: 'E', fait: 0, total: 1 },
      { code: 'O', fait: 1, total: 1 }
    ]);
  });

  it('ignore une réponse dont l’affirmation est inconnue', () => {
    const answers = [{ id: 'z', domain: 'N' }];
    expect(progressByDomain(questions, answers, ['N'])[0].fait).toBe(0);
  });
});

describe('progressQuarter', () => {
  it('donne le quart franchi, borné de 0 à 4', () => {
    expect(progressQuarter(0, 120)).toBe(0);
    expect(progressQuarter(29, 120)).toBe(0);
    expect(progressQuarter(30, 120)).toBe(1);
    expect(progressQuarter(60, 120)).toBe(2);
    expect(progressQuarter(120, 120)).toBe(4);
    expect(progressQuarter(5, 0)).toBe(0);
  });
});

describe('montée des compteurs', () => {
  it('décélère de 0 à 1 et borne la progression', () => {
    expect(decelere(0)).toBe(0);
    expect(decelere(1)).toBe(1);
    expect(decelere(0.5)).toBeCloseTo(0.875);
    expect(decelere(-1)).toBe(0);
    expect(decelere(2)).toBe(1);
  });

  it('part de 0, arrive exactement à la cible et ne la dépasse jamais', () => {
    expect(valeurMontee(87, 0, 700)).toBe(0);
    expect(valeurMontee(87, 700, 700)).toBe(87);
    expect(valeurMontee(87, 9999, 700)).toBe(87);
    expect(valeurMontee(87, 350, 700)).toBe(76);
    expect(valeurMontee(87, 10, 0)).toBe(87);
  });
});
