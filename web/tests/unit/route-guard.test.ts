import { describe, expect, it } from 'vitest';
import {
  decideRouteAccess,
  isPrivatePath,
  splitLocale
} from '@/lib/route-guard';

const locales = ['en', 'fr', 'ar', 'no'];
const decide = (pathname: string, hasSession: boolean, search = '') =>
  decideRouteAccess({ pathname, search, hasSession, locales });

describe('splitLocale', () => {
  it('sépare une langue connue', () => {
    expect(splitLocale('/fr/admin', locales)).toEqual({
      locale: 'fr',
      rest: '/admin'
    });
    expect(splitLocale('/ar', locales)).toEqual({ locale: 'ar', rest: '/' });
  });

  it('prend l’anglais sans préfixe', () => {
    expect(splitLocale('/admin', locales)).toEqual({
      locale: 'en',
      rest: '/admin'
    });
    expect(splitLocale('/', locales)).toEqual({ locale: 'en', rest: '/' });
  });
});

describe('isPrivatePath', () => {
  it('reconnaît les routes privées et leurs sous-chemins', () => {
    expect(isPrivatePath('/admin')).toBe(true);
    expect(isPrivatePath('/admin/journal')).toBe(true);
    expect(isPrivatePath('/mon-compte')).toBe(true);
    expect(isPrivatePath('/o/acme')).toBe(true);
  });

  it('ne confond pas un préfixe avec un autre chemin', () => {
    expect(isPrivatePath('/administrateur')).toBe(false);
    expect(isPrivatePath('/connexion')).toBe(false);
    expect(isPrivatePath('/c/abc')).toBe(false);
    expect(isPrivatePath('/i/jeton')).toBe(false);
    expect(isPrivatePath('/')).toBe(false);
    expect(isPrivatePath('/test')).toBe(false);
  });
});

describe('decideRouteAccess', () => {
  it('laisse passer les pages publiques, connecté ou non', () => {
    expect(decide('/', false)).toEqual({ action: 'next' });
    expect(decide('/fr/test', false)).toEqual({ action: 'next' });
    expect(decide('/fr/connexion', false)).toEqual({ action: 'next' });
    expect(decide('/c/jeton', false)).toEqual({ action: 'next' });
    expect(decide('/fr/i/jeton', false)).toEqual({ action: 'next' });
  });

  it('laisse passer une route privée avec une session', () => {
    expect(decide('/fr/admin', true)).toEqual({ action: 'next' });
  });

  it('redirige vers la connexion de la même langue, avec retour sûr', () => {
    expect(decide('/fr/admin', false)).toEqual({
      action: 'redirect',
      pathname: '/fr/connexion',
      search: '?next=%2Fadmin'
    });
    expect(decide('/mon-compte', false)).toEqual({
      action: 'redirect',
      pathname: '/connexion',
      search: '?next=%2Fmon-compte'
    });
  });

  it('conserve la requête dans le retour', () => {
    expect(decide('/ar/o/acme', false, '?tab=2')).toEqual({
      action: 'redirect',
      pathname: '/ar/connexion',
      search: '?next=%2Fo%2Facme%3Ftab%3D2'
    });
  });

  it('ne produit jamais de destination externe', () => {
    const out = decide('/admin', false, '?x=//exemple.org');
    expect(out.action).toBe('redirect');
    if (out.action === 'redirect') {
      const next = decodeURIComponent(out.search.replace('?next=', ''));
      expect(next.startsWith('/')).toBe(true);
      expect(next.startsWith('//')).toBe(false);
    }
  });
});
