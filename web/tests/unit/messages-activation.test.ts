import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

// Application du patch de copywriting (docs/design/patch-copywriting-panache.md) :
// une phrase n'est publiée que si elle est vraie aujourd'hui. Lot 1 livré
// (cloisonnement, rôles, journal) ; lot 2 livré pour les invitations seulement ;
// reprise sur serveur (lot 2), export (lot 3), synthèses de groupe (lot 4) et
// restitution PDF (lot 6) ne sont pas en ligne.

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

const flat: Record<Lang, Record<string, string>> = {
  fr: flatten(fr),
  en: flatten(en),
  ar: flatten(ar)
};

const read = (path: string): string =>
  readFileSync(resolve(__dirname, '../../src', path), 'utf8');

describe('catalogues fr / en / ar entiers', () => {
  it('ont exactement les mêmes clés', () => {
    const keys = (lang: Lang): string[] => Object.keys(flat[lang]).sort();
    expect(keys('fr').length).toBeGreaterThan(500);
    expect(keys('en')).toEqual(keys('fr'));
    expect(keys('ar')).toEqual(keys('fr'));
  });

  for (const lang of langs) {
    it(`${lang} : aucun tiret cadratin ni demi-cadratin`, () => {
      for (const [key, text] of Object.entries(flat[lang])) {
        expect(text, `${lang}.${key}`).not.toMatch(/[–—]/);
      }
    });
  }

  it('l’e-mail de connexion n’a ni tiret cadratin ni demi-cadratin', () => {
    expect(read('lib/login-mail.ts')).not.toMatch(/[–—]/);
  });
});

describe('aucune clé orpheline dans « home »', () => {
  const sources = [
    read('app/[locale]/page.tsx'),
    read('components/home-sections.tsx')
  ].join('\n');

  it('chaque clé de premier niveau de « home » est lue par l’accueil', () => {
    for (const key of Object.keys(fr.home as Tree)) {
      expect(sources, `home.${key}`).toMatch(new RegExp(`['\`]${key}[.'\`]`));
    }
  });
});

// Clé publiée -> clé « upcoming » qui la remplacera au lot indiqué. La valeur
// publiée doit rester l'ancienne valeur vraie, jamais la nouvelle.
const blocked: ReadonlyArray<readonly [string, string, string]> = [
  ['home.lead', 'upcoming.home.lead', 'lots 1 et 4'],
  ['test.instructions', 'upcoming.test.instructions', 'lot 2 (reprise)'],
  ['test.halfway', 'upcoming.test.halfway', 'lot 2 (reprise)']
];

// Clés nouvelles qui ne doivent pas exister hors de « upcoming ».
const absent: ReadonlyArray<readonly [string, string]> = [
  ['home.outcome', 'lots 4 et 6'],
  ['home.hidden', 'lots 1 et 4'],
  ['home.process', 'lots 2, 4 et 6'],
  ['home.journey', 'lots 2 et 6'],
  ['faq.employer', 'lots 1, 3 et 4'],
  ['results.introRestitution', 'parcours public sans consultant'],
  ['about.restitution', 'parcours public sans consultant']
];

const subtreeOf = (lang: Lang, path: string): unknown =>
  path
    .split('.')
    .reduce<unknown>(
      (node, key) =>
        node !== null && typeof node === 'object'
          ? (node as Tree)[key]
          : undefined,
      catalogs[lang]
    );

describe('phrases bloquées : la valeur vraie reste publiée', () => {
  for (const lang of langs) {
    for (const [live, upcoming, lot] of blocked) {
      it(`${lang}.${live} ne porte pas la valeur du ${lot}`, () => {
        const published = flat[lang][live];
        const future = flat[lang][upcoming];
        expect(typeof published).toBe('string');
        expect(typeof future).toBe('string');
        expect(published).not.toBe(future);
      });
    }

    for (const [path, lot] of absent) {
      it(`${lang}.${path} n’est pas publié (${lot})`, () => {
        expect(subtreeOf(lang, path)).toBeUndefined();
      });
    }

    it(`${lang} : les textes du lot non livré restent en réserve`, () => {
      for (const path of [
        'upcoming.home.outcome',
        'upcoming.home.hidden',
        'upcoming.home.process',
        'upcoming.faq.employer',
        'upcoming.results.introRestitution'
      ]) {
        expect(subtreeOf(lang, path), `${lang}.${path}`).toBeDefined();
      }
    });

    it(`${lang} : la phrase de restitution n’est pas ajoutée au résultat`, () => {
      const future = flat[lang]['upcoming.results.introRestitution'] ?? '';
      expect(future.length).toBeGreaterThan(0);
      expect(flat[lang]['results.intro']).not.toContain(future);
    });
  }

  it('fr : la reprise est annoncée « sur cet appareil » tant que le lot 2 n’est pas en ligne', () => {
    expect(flat.fr['test.instructions']).toContain('sur cet appareil');
    expect(flat.fr['test.halfway']).toContain('sur cet appareil');
    expect(flat.fr['home.how.answer.text']).toContain('sur cet appareil');
  });

  it('fr : aucune synthèse de groupe ni restitution PDF promise hors réserve', () => {
    const published = Object.entries(flat.fr).filter(
      ([key]) => !key.startsWith('upcoming.')
    );
    for (const [key, text] of published) {
      expect(text, key).not.toMatch(/synthèses? d[e’]+ ?(groupe|équipe)/i);
    }
  });

  it('le bouton d’accueil reste « Commencer le questionnaire »', () => {
    expect(flat.fr['frontpage.call_to_action']).toBe(
      'Commencer le questionnaire'
    );
    expect(flat.en['frontpage.call_to_action']).toBe('Start the questionnaire');
    expect(flat.ar['frontpage.call_to_action']).toBe('بدء الاستبيان');
  });
});

describe('phrases du lot 1 activées', () => {
  for (const lang of langs) {
    it(`${lang} : « home.trust » est publié et a quitté la réserve`, () => {
      expect(typeof flat[lang]['home.trust.title']).toBe('string');
      expect(typeof flat[lang]['home.trust.text']).toBe('string');
      expect(subtreeOf(lang, 'upcoming.home.trust')).toBeUndefined();
    });
  }
});
