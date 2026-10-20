import { describe, expect, it } from 'vitest';
import {
  codeLimits,
  createRateLimiter,
  magicLinkLimits
} from '@/lib/sliding-window';

const clock = () => {
  let t = 1_000_000;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    }
  };
};
const limit = { max: 3, windowMs: 1000 };

describe('createRateLimiter', () => {
  it('laisse passer jusqu’au plafond puis refuse', () => {
    const c = clock();
    const l = createRateLimiter({ now: c.now });
    expect([1, 2, 3].map(() => l.isLimited('a', limit, 's'))).toEqual([
      false,
      false,
      false
    ]);
    expect(l.isLimited('a', limit, 's')).toBe(true);
  });

  it('ne compte pas la requête refusée', () => {
    const c = clock();
    const l = createRateLimiter({ now: c.now });
    for (let i = 0; i < 3; i++) l.isLimited('a', limit, 's');
    c.advance(500);
    expect(l.isLimited('a', limit, 's')).toBe(true);
    c.advance(501); // les 3 premières sortent de la fenêtre
    expect(l.isLimited('a', limit, 's')).toBe(false);
  });

  it('fait glisser la fenêtre', () => {
    const c = clock();
    const l = createRateLimiter({ now: c.now });
    l.isLimited('a', limit, 's');
    c.advance(600);
    l.isLimited('a', limit, 's');
    l.isLimited('a', limit, 's');
    expect(l.isLimited('a', limit, 's')).toBe(true);
    c.advance(401); // seule la première sort
    expect(l.isLimited('a', limit, 's')).toBe(false);
    expect(l.isLimited('a', limit, 's')).toBe(true);
  });

  it('sépare les actions et les sujets', () => {
    const c = clock();
    const l = createRateLimiter({ now: c.now });
    for (let i = 0; i < 3; i++) l.isLimited('a', limit, 's1');
    expect(l.isLimited('a', limit, 's1')).toBe(true);
    expect(l.isLimited('a', limit, 's2')).toBe(false);
    expect(l.isLimited('b', limit, 's1')).toBe(false);
  });

  it('refuse toute nouvelle clé quand la table est pleine, mais pas les clés connues', () => {
    const c = clock();
    const l = createRateLimiter({ now: c.now, maxKeys: 2, sweepThreshold: 2 });
    l.isLimited('a', limit, '1');
    l.isLimited('a', limit, '2');
    expect(l.isLimited('a', limit, '3')).toBe(true);
    expect(l.isLimited('a', limit, '1')).toBe(false);
  });

  it('nettoie les clés expirées pour faire de la place', () => {
    const c = clock();
    const l = createRateLimiter({
      now: c.now,
      maxKeys: 2,
      sweepThreshold: 2,
      sweepIntervalMs: 10
    });
    l.isLimited('a', limit, '1');
    l.isLimited('a', limit, '2');
    c.advance(1001);
    expect(l.isLimited('a', limit, '3')).toBe(false);
    expect(l.size()).toBe(1);
  });

  it('expose les plafonds de la demande de lien', () => {
    expect(magicLinkLimits.perIp.max).toBe(10);
    expect(codeLimits.perIp.max).toBe(20);
    expect(magicLinkLimits.perAddress.max).toBe(3);
  });
});
