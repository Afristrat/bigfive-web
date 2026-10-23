import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openPending, sealPending } from '@/lib/mfa-pending';

// B1 (revue de sécurité du 21/10) : le cookie d'étape entre le mot de passe et
// le code TOTP ne doit jamais remettre au navigateur un jeton GoTrue valide.
// Il est scellé (AES-256-GCM, clé dérivée d'un secret serveur) et daté.

const FACTOR_ID = '22222222-2222-4222-8222-222222222222';
const LEVEL1 = 'aaaa.bbbb.cccc';
const T0 = 1_760_000_000_000;
const pending = { factorId: FACTOR_ID, accessToken: LEVEL1 };

beforeEach(() => {
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test_cle_de_service_longue');
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe('cookie d’étape scellé', () => {
  it('ne contient ni le jeton ni le facteur en clair', () => {
    const sealed = sealPending(pending, T0);
    expect(sealed).not.toContain(LEVEL1);
    expect(sealed).not.toContain('aaaa');
    expect(sealed).not.toContain(FACTOR_ID);
    expect(sealed).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it('deux scellements du même contenu diffèrent (vecteur aléatoire)', () => {
    expect(sealPending(pending, T0)).not.toBe(sealPending(pending, T0));
  });

  it('se rouvre côté serveur pendant 5 minutes', () => {
    const sealed = sealPending(pending, T0);
    expect(openPending(sealed, T0 + 4 * 60_000)).toEqual(pending);
  });

  it('expiré au-delà de 5 minutes', () => {
    const sealed = sealPending(pending, T0);
    expect(openPending(sealed, T0 + 5 * 60_000 + 1)).toBeNull();
  });

  it('refuse un cookie altéré d’un seul caractère', () => {
    const sealed = sealPending(pending, T0);
    const i = Math.floor(sealed.length / 2);
    const flipped = `${sealed.slice(0, i)}${sealed[i] === 'A' ? 'B' : 'A'}${sealed.slice(i + 1)}`;
    expect(openPending(flipped, T0)).toBeNull();
  });

  it('refuse un cookie scellé avec une autre clé', () => {
    const sealed = sealPending(pending, T0);
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_une_autre_cle_de_service');
    expect(openPending(sealed, T0)).toBeNull();
  });

  it('refuse l’ancien format en clair et toute valeur informe', () => {
    for (const value of [
      `${FACTOR_ID}:${LEVEL1}`,
      '',
      'abc',
      undefined,
      42,
      'A'.repeat(500)
    ]) {
      expect(openPending(value, T0)).toBeNull();
    }
  });

  it('sans secret serveur : le scellement échoue, rien n’est émis', () => {
    vi.stubEnv('SUPABASE_SECRET_KEY', '');
    expect(() => sealPending(pending, T0)).toThrow();
  });
});
