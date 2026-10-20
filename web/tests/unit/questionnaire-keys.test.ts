import { describe, expect, it } from 'vitest';
import { progressPercent, scoreForKey } from '@/lib/questionnaire-keys';

const scores = [1, 2, 3, 4, 5];

describe('scoreForKey', () => {
  it('associe les touches 1 à 5 aux cinq choix', () => {
    expect(
      ['1', '2', '3', '4', '5'].map((k) => scoreForKey(k, scores))
    ).toEqual(scores);
  });
  it('ignore 0, 6, 9 et les touches non chiffrées', () => {
    for (const k of ['0', '6', '9', 'a', 'Enter', 'ArrowRight', '10', ''])
      expect(scoreForKey(k, scores)).toBeNull();
  });
  it('suit la taille de l’échelle fournie', () => {
    expect(scoreForKey('4', [1, 2, 3])).toBeNull();
    expect(scoreForKey('3', [1, 2, 3])).toBe(3);
  });
  it('ignore les combinaisons Ctrl, Alt et Méta', () => {
    expect(scoreForKey('1', scores, null, { ctrlKey: true })).toBeNull();
    expect(scoreForKey('1', scores, null, { altKey: true })).toBeNull();
    expect(scoreForKey('1', scores, null, { metaKey: true })).toBeNull();
  });
  it('ignore la saisie dans un champ de texte', () => {
    expect(
      scoreForKey('1', scores, { tagName: 'INPUT', type: 'text' })
    ).toBeNull();
    expect(scoreForKey('1', scores, { tagName: 'input' })).toBeNull();
    expect(scoreForKey('1', scores, { tagName: 'TEXTAREA' })).toBeNull();
    expect(
      scoreForKey('1', scores, { tagName: 'DIV', isContentEditable: true })
    ).toBeNull();
  });
  it('accepte le raccourci depuis un bouton radio ou un bouton', () => {
    expect(scoreForKey('2', scores, { tagName: 'INPUT', type: 'radio' })).toBe(
      2
    );
    expect(scoreForKey('2', scores, { tagName: 'BUTTON' })).toBe(2);
  });
});

describe('progressPercent', () => {
  it('reste entre 0 et 100', () => {
    expect(progressPercent(1, 120)).toBeCloseTo(0.8333, 3);
    expect(progressPercent(120, 120)).toBe(100);
    expect(progressPercent(150, 120)).toBe(100);
    expect(progressPercent(-3, 120)).toBe(0);
    expect(progressPercent(5, 0)).toBe(0);
  });
});
