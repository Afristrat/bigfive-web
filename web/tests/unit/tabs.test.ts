import { describe, expect, it } from 'vitest';
import { nextTabIndex } from '@/lib/tabs';

describe('nextTabIndex', () => {
  it('avance avec la flèche droite en lecture de gauche à droite', () => {
    expect(nextTabIndex(1, 'ArrowRight', 5, false)).toBe(2);
    expect(nextTabIndex(1, 'ArrowLeft', 5, false)).toBe(0);
  });

  it('inverse les flèches en lecture de droite à gauche', () => {
    expect(nextTabIndex(1, 'ArrowLeft', 5, true)).toBe(2);
    expect(nextTabIndex(1, 'ArrowRight', 5, true)).toBe(0);
  });

  it('boucle aux extrémités', () => {
    expect(nextTabIndex(4, 'ArrowRight', 5, false)).toBe(0);
    expect(nextTabIndex(0, 'ArrowLeft', 5, false)).toBe(4);
    expect(nextTabIndex(0, 'ArrowRight', 5, true)).toBe(4);
  });

  it('gère Début et Fin', () => {
    expect(nextTabIndex(3, 'Home', 5, false)).toBe(0);
    expect(nextTabIndex(1, 'End', 5, true)).toBe(4);
  });

  it('ignore les autres touches et les listes vides', () => {
    expect(nextTabIndex(1, 'a', 5, false)).toBeUndefined();
    expect(nextTabIndex(0, 'ArrowRight', 0, false)).toBeUndefined();
  });
});
