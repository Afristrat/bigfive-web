import { describe, expect, it } from 'vitest';
import { localizedPath, safeInternalPath } from '@/lib/safe-path';

describe('safeInternalPath', () => {
  it('garde un chemin interne, requête comprise', () => {
    expect(safeInternalPath('/espace')).toBe('/espace');
    expect(safeInternalPath('/o/acme?tab=2#x')).toBe('/o/acme?tab=2#x');
    expect(safeInternalPath('/')).toBe('/');
  });

  it('refuse les URL externes et les schémas', () => {
    expect(safeInternalPath('https://evil.example')).toBe('/');
    expect(safeInternalPath('http://evil.example/x')).toBe('/');
    expect(safeInternalPath('javascript:alert(1)')).toBe('/');
    expect(safeInternalPath('evil.example')).toBe('/');
  });

  it('refuse les formes protocole-relatives « // » et « /\\ »', () => {
    expect(safeInternalPath('//evil.example')).toBe('/');
    expect(safeInternalPath('/\\evil.example')).toBe('/');
  });

  it('refuse tout ce qui n’est pas une chaîne', () => {
    expect(safeInternalPath(undefined)).toBe('/');
    expect(safeInternalPath(null)).toBe('/');
    expect(safeInternalPath(42)).toBe('/');
    expect(safeInternalPath(['/a'])).toBe('/');
    expect(safeInternalPath('')).toBe('/');
  });

  it('utilise le repli fourni', () => {
    expect(safeInternalPath('//x', '/mes-resultats')).toBe('/mes-resultats');
    expect(safeInternalPath('/ok', '/mes-resultats')).toBe('/ok');
  });
});

describe('localizedPath', () => {
  it('ne préfixe pas l’anglais', () => {
    expect(localizedPath('en', '/connexion')).toBe('/connexion');
  });

  it('préfixe le français et l’arabe', () => {
    expect(localizedPath('fr', '/connexion?next=%2Fa')).toBe(
      '/fr/connexion?next=%2Fa'
    );
    expect(localizedPath('ar', '/')).toBe('/ar/');
  });
});
