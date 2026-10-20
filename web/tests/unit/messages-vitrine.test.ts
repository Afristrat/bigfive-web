import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { methodGroups, methodReferences } from '@/lib/method-references';

// Vitrine publique : accueil, FAQ, À propos, Méthode et références, et l'espace
// « upcoming » (textes validés mais pas encore vrais, non branchés).

type Tree = { [key: string]: string | Tree };
type Lang = 'fr' | 'en' | 'ar';

const langs: readonly Lang[] = ['fr', 'en', 'ar'];
const catalogs: Record<Lang, Tree> = { fr, en, ar };

const flatten = (tree: Tree, prefix = ''): Record<string, string> =>
  Object.entries(tree).reduce<Record<string, string>>(
    (acc, [key, value]) =>
      typeof value === 'string'
        ? { ...acc, [`${prefix}${key}`]: value }
        : { ...acc, ...flatten(value, `${prefix}${key}.`) },
    {}
  );

const namespaces = ['home', 'method', 'upcoming', 'faq', 'about'] as const;

const subtree = (lang: Lang, path: string): Tree => {
  const node = path
    .split('.')
    .reduce<
      string | Tree | undefined
    >((current, key) => (current !== undefined && typeof current !== 'string' ? current[key] : undefined), catalogs[lang]);
  if (node === undefined || typeof node === 'string') {
    throw new Error(`Espace de noms absent : ${lang}.${path}`);
  }
  return node;
};

const entries = (lang: Lang): Record<string, string> =>
  namespaces.reduce<Record<string, string>>(
    (acc, namespace) => ({
      ...acc,
      ...flatten(subtree(lang, namespace), `${namespace}.`)
    }),
    {}
  );

const single: readonly string[] = [
  'test.instructions',
  'test.halfway',
  'results.intro',
  'common.signature',
  'toolbar.method'
];

const placeholders = (text: string): string[] =>
  [
    ...new Set([...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? ''))
  ].sort();

describe('parité fr / en / ar de la vitrine', () => {
  for (const namespace of namespaces) {
    it(`« ${namespace} » a les mêmes clés dans les trois langues`, () => {
      const keys = (lang: Lang): string[] =>
        Object.keys(flatten(subtree(lang, namespace))).sort();
      expect(keys('fr').length).toBeGreaterThan(0);
      expect(keys('en')).toEqual(keys('fr'));
      expect(keys('ar')).toEqual(keys('fr'));
    });
  }

  it('les clés isolées existent partout, avec les mêmes variables', () => {
    for (const path of single) {
      const parent = path.split('.').slice(0, -1).join('.');
      const key = path.split('.').slice(-1)[0] ?? '';
      const values = langs.map((lang) => subtree(lang, parent)[key]);
      for (const value of values) expect(typeof value).toBe('string');
      const [first, ...rest] = values.map((value) =>
        placeholders(String(value))
      );
      for (const other of rest) expect(other).toEqual(first);
    }
  });

  it('les variables {…} sont les mêmes dans les trois langues, clé par clé', () => {
    const base = entries('fr');
    for (const lang of ['en', 'ar'] as const) {
      const other = entries(lang);
      for (const [key, value] of Object.entries(base)) {
        expect(placeholders(other[key] ?? ''), `${lang}.${key}`).toEqual(
          placeholders(value)
        );
      }
    }
  });
});

describe('hygiène des textes de la vitrine', () => {
  const banned =
    /gratuit|open[ -]source|scientifiquement valid|free of charge|مجاني|مفتوح المصدر/i;
  const moroccanAdaptation =
    /adapt[ée]+s? au (contexte )?maroc|adapted to the moroccan|كُيِّفت|كيّف/i;

  for (const lang of langs) {
    it(`${lang} : aucune chaîne vide, ni tiret cadratin, ni promesse interdite`, () => {
      for (const [key, text] of Object.entries(entries(lang))) {
        expect(text.trim(), `${lang}.${key}`).not.toBe('');
        expect(text, `${lang}.${key}`).not.toContain('—');
        expect(text, `${lang}.${key}`).not.toMatch(banned);
        expect(text, `${lang}.${key}`).not.toMatch(moroccanAdaptation);
        expect(text, `${lang}.${key}`).not.toContain("'");
      }
    });
  }

  it('le français met une espace insécable avant ? ! : ; et dans les guillemets', () => {
    for (const [key, text] of Object.entries(entries('fr'))) {
      expect(text, key).not.toMatch(/[^\s ][?!:;]/);
      expect(text, key).not.toMatch(/«(?! )/);
      expect(text, key).not.toMatch(/(?<! )»/);
    }
  });

  it('aucun zéro octet dans les fichiers de messages', () => {
    for (const lang of langs) {
      const source = readFileSync(
        resolve(__dirname, `../../src/messages/${lang}.js`),
        'utf8'
      );
      expect(source.includes('\u0000')).toBe(false);
    }
  });
});

// Chiffres des références : ceux lus dans docs/design/dossier-preuves.md, rien
// d'autre. Chaque jeton numérique d'une fiche doit être attendu, et chaque
// jeton attendu doit y figurer, dans les trois langues.
const expectedNumbers: Record<string, string[]> = {
  johnson2014: ['120', '30', '0.63', '0.88', '619150', '0.66', '0.91'],
  kajonius2019: ['320128'],
  ipip: [],
  mccrae2005: ['50', '11985'],
  schmitt2007: ['28', '17837', '56'],
  sackett2022: ['0.19', '0.25', '0.05', '0.1', '0.42', '3.6', '0.31', '1998'],
  judge2013: ['1176', '410', '406029', '0.16', '0.04', '0.06'],
  barrick2001: ['15', '11'],
  judge2002: ['73', '222', '0.31', '0.28', '0.24', '0.08', '0.48'],
  peeters2006: ['106', '527', '0.24', '0.2', '0.12'],
  bell2007: ['0.34'],
  birkeland2006: ['33', '0.44', '0.45', '0.11', '0.13'],
  morgeson2007: ['2004', '2022'],
  ones2007: ['2022'],
  kluger1996: ['607', '23663', '0.41'],
  chraibi2025: ['1537', '0.72', '44']
};

// Séparateur de milliers : espace insécable (fr, ar) ou virgule (en). Aucune
// fiche n'a de décimale à trois chiffres, donc pas d'ambiguïté.
const numbersIn = (text: string): string[] =>
  [
    ...text
      .replace(/IPIP-NEO-120/g, '')
      .replace(/(\d)[   ,](?=\d{3}(?!\d))/g, '$1')
      .matchAll(/\d+(?:[.,]\d+)?/g)
  ].map((match) => String(Number(match[0].replace(',', '.'))));

describe('références de « Méthode et références »', () => {
  const ids = methodReferences.map((reference) => reference.id);

  it('chaque référence a ses textes dans les trois langues et rien de plus', () => {
    for (const lang of langs) {
      const refs = subtree(lang, 'method.refs');
      expect(Object.keys(refs).sort()).toEqual([...ids].sort());
      for (const id of ids) {
        const card = refs[id];
        expect(typeof card).toBe('object');
        expect(Object.keys(card as Tree).sort()).toEqual([
          'finding',
          'limit',
          'strength'
        ]);
      }
    }
  });

  it('chaque référence figure dans exactement un groupe', () => {
    const grouped = methodGroups.flatMap((group) => [...group.refs]);
    expect([...grouped].sort()).toEqual([...ids].sort());
  });

  it('seules les fiches « preuve forte » ou « preuve partielle » du dossier sont citées', () => {
    const allowed = new Set([
      'P1',
      'P2',
      'P4',
      'P7',
      'P8',
      'P9',
      'P11',
      'P12',
      'P15',
      'P18',
      'P26',
      'P28',
      'P30',
      'P33 bis',
      'P34',
      'P35'
    ]);
    for (const reference of methodReferences) {
      expect(allowed.has(reference.fiche), reference.id).toBe(true);
    }
    expect(Object.keys(expectedNumbers).sort()).toEqual([...ids].sort());
  });

  for (const lang of langs) {
    it(`${lang} : les chiffres des fiches sont exactement ceux du dossier`, () => {
      const refs = subtree(lang, 'method.refs');
      for (const id of ids) {
        const card = refs[id] as Tree;
        const text = [card['finding'], card['limit'], card['strength']].join(
          ' '
        );
        const found = [...new Set(numbersIn(text))].sort();
        const expected = [
          ...new Set((expectedNumbers[id] ?? []).map((n) => String(Number(n))))
        ].sort();
        expect(found, `${lang}.${id}`).toEqual(expected);
      }
    });
  }
});

// L'espace « upcoming » ne doit être référencé par aucun fichier de src/ (hors
// des fichiers de messages) : ses textes ne sont pas encore vrais.
const sourceRoot = resolve(__dirname, '../../src');

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return walk(path);
    return /\.(ts|tsx|js|jsx|mjs|css|mdx?)$/.test(name) ? [path] : [];
  });

describe('espace « upcoming »', () => {
  const files = walk(sourceRoot).filter(
    (path) => !path.includes(`${join('src', 'messages')}`)
  );

  it('aucun fichier de src/ ne le référence', () => {
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toMatch(/upcoming/i);
    }
  });

  it('aucune de ses chaînes n’est recopiée dans le code', () => {
    const sources = files.map((path) => readFileSync(path, 'utf8'));
    for (const lang of langs) {
      const texts = Object.values(flatten(subtree(lang, 'upcoming'))).filter(
        (text) => text.length > 25
      );
      for (const text of texts) {
        for (const source of sources) expect(source).not.toContain(text);
      }
    }
  });

  it('chaque groupe porte un commentaire indiquant le lot', () => {
    for (const lang of langs) {
      const source = readFileSync(
        resolve(__dirname, `../../src/messages/${lang}.js`),
        'utf8'
      );
      const block = source.slice(source.indexOf('  upcoming: {'));
      const comments = block.match(
        /^ {4,6}\/\/ .*(Lot|الدفعة|Étape|Step|الخطوة)/gm
      );
      expect((comments ?? []).length, lang).toBeGreaterThanOrEqual(8);
    }
  });
});
