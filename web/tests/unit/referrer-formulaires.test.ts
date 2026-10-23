import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// « no-referrer » fait partir un formulaire envoyé avant l'hydratation avec
// « Origin: null » ; Next lit cet en-tête par new URL() et répond 500
// (constaté en production le 23/10/2026 sur /c/[token]). Les pages à jeton
// réduisent le Referer à l'origine avec « strict-origin ».
const racine = resolve(__dirname, '../../src/app');

const fichiers = (dossier: string): string[] =>
  readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) return fichiers(chemin);
    return /\.tsx?$/.test(nom) ? [chemin] : [];
  });

describe('politique de Referer des pages', () => {
  it('aucune page ne déclare no-referrer', () => {
    const fautives = fichiers(racine).filter((f) =>
      readFileSync(f, 'utf8').includes("'no-referrer'")
    );
    expect(fautives).toEqual([]);
  });

  it.each(['[locale]/c/[token]/page.tsx', '[locale]/i/[jeton]/page.tsx'])(
    '%s : Referer réduit à l’origine',
    (page) => {
      expect(readFileSync(join(racine, page), 'utf8')).toContain(
        "referrer: 'strict-origin'"
      );
    }
  );
});
