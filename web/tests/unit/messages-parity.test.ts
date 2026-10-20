import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : flatten(value, `${prefix}${key}.`)
  );

const catalogs: Record<'fr' | 'en' | 'ar', Tree> = { fr, en, ar };

// Espaces de noms du lot 1 : parité stricte des clés dans les trois langues.
const namespaces = ['login', 'account', 'roles', 'admin'] as const;

describe('parité des messages fr / en / ar', () => {
  for (const namespace of namespaces) {
    it(`« ${namespace} » a les mêmes clés dans les trois langues`, () => {
      const keys = (lang: 'fr' | 'en' | 'ar'): string[] => {
        const subtree = catalogs[lang][namespace];
        expect(typeof subtree).toBe('object');
        return flatten(subtree as Tree).sort();
      };
      expect(keys('fr').length).toBeGreaterThan(0);
      expect(keys('en')).toEqual(keys('fr'));
      expect(keys('ar')).toEqual(keys('fr'));
    });
  }

  it('« toolbar » a la clé « account » partout et plus de comparaison', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const toolbar = catalogs[lang].toolbar as Tree;
      expect(typeof toolbar.account).toBe('string');
      expect(toolbar).not.toHaveProperty('compare');
      expect(toolbar).not.toHaveProperty('compare_with');
    }
  });

  it('le partage de résultat n’existe plus dans les messages', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      expect(catalogs[lang]).not.toHaveProperty('share');
      expect(catalogs[lang]).not.toHaveProperty('getCompare');
      expect(catalogs[lang]).not.toHaveProperty('shareLinks');
    }
  });

  it('aucune chaîne du lot 1 n’est vide, ni tiret cadratin, ni promesse de marque', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      for (const namespace of namespaces) {
        const text = JSON.stringify(catalogs[lang][namespace]);
        expect(text).not.toContain('""');
        expect(text).not.toContain('—');
        expect(text.toLowerCase()).not.toMatch(
          /gratuit|open source|scientifiquement/
        );
      }
    }
  });

  it('le français du lot 1 met une espace insécable avant ? ! : et ;', () => {
    const leaves = (tree: Tree): string[] =>
      Object.values(tree).flatMap((v) =>
        typeof v === 'string' ? [v] : leaves(v)
      );
    for (const namespace of namespaces) {
      for (const text of leaves(fr[namespace] as Tree)) {
        expect(text).not.toMatch(/[^\s ][?!:;]/);
      }
    }
  });
});
