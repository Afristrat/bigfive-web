import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// La clé secrète Supabase ne doit jamais atteindre le navigateur (plan § 2.3).
// Deux contrôles :
//  1. le graphe d'imports de chaque fichier « use client » n'atteint ni le
//     module serveur Supabase ni un fichier qui lit SUPABASE_* ;
//  2. si un build existe (.next/static), aucun fichier livré au navigateur ne
//     contient la clé, les variables ni le module.

const root = resolve(__dirname, '../..');
const srcDir = join(root, 'src');
const SERVER_MODULE = join(srcDir, 'lib/supabase/server.ts');

const SOURCE = /\.(ts|tsx|js|jsx|mjs)$/;

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === 'node_modules' || name.startsWith('.') ? [] : walk(path);
    }
    return SOURCE.test(name) ? [path] : [];
  });
}

const directive = (source: string): 'client' | 'server' | null => {
  const head = source.trimStart();
  if (/^(['"])use client\1/.test(head)) return 'client';
  if (/^(['"])use server\1/.test(head)) return 'server';
  return null;
};

const importsOf = (source: string): string[] =>
  [...source.matchAll(/(?:from|import)\s*\(?\s*['"]([^'"]+)['"]/g)].map(
    (match) => match[1] ?? ''
  );

function resolveImport(from: string, specifier: string): string | null {
  let base: string;
  if (specifier.startsWith('@/')) base = join(srcDir, specifier.slice(2));
  else if (specifier.startsWith('.')) base = resolve(dirname(from), specifier);
  else return null; // paquet externe
  for (const candidate of [
    base,
    ...['.ts', '.tsx', '.js', '.jsx'].map((ext) => base + ext),
    ...['index.ts', 'index.tsx'].map((name) => join(base, name))
  ]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const files = walk(srcDir);
const sources = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const get = (file: string): string => sources.get(file) ?? '';

/** Chaîne d'imports menant d'un fichier client à un fichier interdit, ou null. */
function forbiddenPath(entry: string): string[] | null {
  const seen = new Set<string>();
  const walkFrom = (file: string, trail: string[]): string[] | null => {
    if (seen.has(file)) return null;
    seen.add(file);
    const source = get(file);
    if (
      file === SERVER_MODULE ||
      /SUPABASE_(SECRET_KEY|URL)/.test(source) ||
      /['"]server-only['"]/.test(source)
    ) {
      return [...trail, file];
    }
    // Importer une action serveur depuis un composant client est permis : le
    // compilateur la remplace par une référence, son code ne part pas au navigateur.
    if (file !== entry && directive(source) === 'server') return null;
    for (const specifier of importsOf(source)) {
      const next = resolveImport(file, specifier);
      if (!next) continue;
      const found = walkFrom(next, [...trail, file]);
      if (found) return found;
    }
    return null;
  };
  return walkFrom(entry, []);
}

describe('frontière client / serveur', () => {
  const clientFiles = files.filter((f) => directive(get(f)) === 'client');

  it('trouve des composants client à contrôler', () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it('aucun composant client n’atteint le module Supabase serveur ni SUPABASE_*', () => {
    const offenders = clientFiles.flatMap((entry) => {
      const trail = forbiddenPath(entry);
      return trail ? [trail.map((f) => relative(root, f)).join(' -> ')] : [];
    });
    expect(offenders).toEqual([]);
  });

  it('le contrôle est efficace : il voit une importation interdite (vu rouge)', () => {
    const fake = join(srcDir, 'zz-fake-client.tsx');
    sources.set(
      fake,
      "'use client';\nimport { serviceClient } from '@/lib/supabase/server';\n"
    );
    try {
      expect(forbiddenPath(fake)).not.toBeNull();
    } finally {
      sources.delete(fake);
    }
  });

  it('SUPABASE_URL et SUPABASE_SECRET_KEY ne sont lues que par le module serveur', () => {
    const readers = files
      .filter((f) => /process\.env\.SUPABASE_/.test(get(f)))
      .map((f) => relative(root, f).replaceAll('\\', '/'));
    expect(readers).toEqual(['src/lib/supabase/server.ts']);
  });

  it('aucune variable NEXT_PUBLIC_SUPABASE_* n’existe', () => {
    const offenders = files.filter((f) => /NEXT_PUBLIC_SUPABASE/.test(get(f)));
    expect(offenders).toEqual([]);
  });
});

describe('bundle livré au navigateur', () => {
  const staticDir = join(root, '.next/static');

  it('ne contient ni clé, ni variable, ni module serveur (si un build existe)', () => {
    if (!existsSync(staticDir)) return; // pas de build local : contrôle des imports ci-dessus
    const offenders = walk(staticDir).filter((file) => {
      const content = readFileSync(file, 'utf8');
      return /sb_secret_|SUPABASE_SECRET_KEY|SUPABASE_URL|tenga-sb(-preprod)?-gw|lib\/supabase\/server/.test(
        content
      );
    });
    expect(offenders.map((f) => relative(root, f))).toEqual([]);
  });
});
