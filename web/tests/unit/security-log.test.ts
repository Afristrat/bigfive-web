import { afterEach, describe, expect, it, vi } from 'vitest';
import { holdUntil } from '@/lib/min-duration';
import { ipTag, logSecurityEvent } from '@/lib/security-log';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ipTag', () => {
  it('est stable pour une même IP et distinct entre deux IP', () => {
    expect(ipTag('203.0.113.7')).toBe(ipTag('203.0.113.7'));
    expect(ipTag('203.0.113.7')).not.toBe(ipTag('203.0.113.8'));
  });

  it('est un hachage tronqué de 12 caractères hexadécimaux, sans l’IP', () => {
    const tag = ipTag('203.0.113.7');
    expect(tag).toMatch(/^[0-9a-f]{12}$/);
    expect(tag).not.toContain('203');
  });
});

describe('logSecurityEvent', () => {
  it('journalise l’événement et l’étiquette d’IP, jamais l’IP elle-même', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSecurityEvent('login.code_failed', {
      ip: '203.0.113.7',
      reason: 'wrong_or_expired'
    });
    expect(warn).toHaveBeenCalledTimes(1);
    const line = String(warn.mock.calls[0]?.[0]);
    const parsed: unknown = JSON.parse(line);
    expect(parsed).toEqual({
      event: 'login.code_failed',
      ip: ipTag('203.0.113.7'),
      reason: 'wrong_or_expired'
    });
    expect(line).not.toContain('203.0.113.7');
    expect(line).not.toContain('@');
  });

  it('inscrit le plafond atteint avec sa portée', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    logSecurityEvent('login.rate_limited', {
      ip: '198.51.100.2',
      scope: 'address'
    });
    expect(String(warn.mock.calls[0]?.[0])).toContain('"scope":"address"');
  });
});

describe('holdUntil', () => {
  const clock = (start: number) => {
    let now = start;
    const slept: number[] = [];
    return {
      slept,
      deps: {
        now: () => now,
        sleep: async (ms: number) => {
          slept.push(ms);
          now += ms;
        }
      }
    };
  };

  it('complète jusqu’à la durée minimale', async () => {
    const c = clock(1000);
    await holdUntil(900, 800, c.deps);
    expect(c.slept).toEqual([700]);
  });

  it('donne la même durée totale quel que soit le travail déjà fait', async () => {
    const fast = clock(10);
    const slow = clock(500);
    await holdUntil(0, 800, fast.deps);
    await holdUntil(0, 800, slow.deps);
    expect(fast.deps.now()).toBe(800);
    expect(slow.deps.now()).toBe(800);
  });

  it('n’attend pas si la durée est déjà dépassée', async () => {
    const c = clock(2000);
    await holdUntil(0, 800, c.deps);
    expect(c.slept).toEqual([]);
  });
});
