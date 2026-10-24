import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getItems } from '@bigfive-org/questions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { facetLabel, type DomainCode } from '@/lib/domain-labels';

type Tree = { [key: string]: string | Tree };

// next-intl/server lit le catalogue réel : une clé absente lève.
vi.mock('next-intl/server', () => {
  const lookup = (namespace: string, key: string): string => {
    let node: string | Tree | undefined = (fr as Tree)[namespace];
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string')
      throw new Error(`Message absent ${namespace}.${key}`);
    return node;
  };
  return {
    setRequestLocale: () => undefined,
    getTranslations: async (arg: string | { namespace: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg.namespace;
      return (key: string, values?: Record<string, string>) =>
        lookup(namespace, key).replace(
          /\{(\w+)\}/g,
          (whole, name: string) => values?.[name] ?? whole
        );
    }
  };
});

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));
vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; className?: string }) =>
    createElement(
      'a',
      { href: props.href, className: props.className },
      props.children as never
    )
}));

// Rendu du parcours anonyme tel qu'il revient quand l'interrupteur est rouvert ;
// le parcours fermé est couvert par parcours-anonyme-ferme.test.ts.
vi.mock('@/config/site', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/config/site')>()),
  PARCOURS_ANONYME_OUVERT: true
}));

const findOne = vi.fn();
vi.mock('@/db', () => ({
  connectToDatabase: async () => ({
    collection: () => ({ findOne: (q: unknown) => findOne(q) })
  })
}));
const isRateLimited = vi.fn();
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: (...args: unknown[]) => isRateLimited(...args),
  limits: { getResult: {}, saveTest: {} }
}));

import { getTestResult } from '@/actions';
import ResultPage from '@/app/[locale]/result/[id]/page';

const ID = '64b7f0c2a1b2c3d4e5f60718';
const items = getItems('en');
const reponses = (valeur: (rang: number) => number) =>
  items.map((item, rang) => ({
    id: item.id,
    score: valeur(rang),
    domain: item.domain,
    facet: item.facet
  }));
const document = (answers = reponses(() => 3)) => ({
  _id: { toString: () => ID },
  lang: 'fr',
  answers,
  dateStamp: new Date('2026-10-20T09:00:00Z')
});

const nbOccurrences = (texte: string, motif: string): number =>
  texte.split(motif).length - 1;

const esc = (texte: string): string =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

beforeEach(() => {
  findOne.mockReset();
  isRateLimited.mockReset().mockResolvedValue(false);
});

describe('getTestResult : profil du moteur', () => {
  it('renvoie id, horodatage et profil calculé, sans texte du paquet', async () => {
    findOne.mockResolvedValue(document());
    const report = await getTestResult(ID);
    expect(report?.id).toBe(ID);
    expect(report?.timestamp).toEqual(new Date('2026-10-20T09:00:00Z'));
    expect(report?.profil.versionMoteur).toBe('m-1.0');
    expect(report?.profil.domaines.N.score).toBe(72);
    expect(report?.profil.domaines.N.niveau).toBe('milieu');
    expect(Object.keys(report?.profil.facettes ?? {})).toHaveLength(30);
    expect(report).not.toHaveProperty('results');
    expect(report).not.toHaveProperty('availableLanguages');
  });

  it('un identifiant mal formé est introuvable avant toute lecture', async () => {
    await expect(getTestResult('pas-un-id')).rejects.toMatchObject({
      name: 'NotFoundError'
    });
    expect(findOne).not.toHaveBeenCalled();
  });

  it('un identifiant inconnu est introuvable', async () => {
    findOne.mockResolvedValue(null);
    await expect(getTestResult(ID)).rejects.toMatchObject({
      name: 'NotFoundError'
    });
  });

  it('limite de débit : refus', async () => {
    isRateLimited.mockResolvedValue(true);
    await expect(getTestResult(ID)).rejects.toMatchObject({
      name: 'RateLimitError'
    });
  });

  describe('résultat ancien ou atypique (illisible)', () => {
    let erreur: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      erreur = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    });
    afterEach(() => {
      erreur.mockRestore();
    });

    const atypiques: [string, () => unknown][] = [
      ['moins de 120 réponses', () => document(reponses(() => 3).slice(0, 10))],
      [
        'une question inconnue',
        () =>
          document(
            reponses(() => 3).map((a, i) =>
              i === 0 ? { ...a, id: 'ancienne-question' } : a
            )
          )
      ],
      [
        'une valeur hors de 1 à 5',
        () => document(reponses((r) => (r === 0 ? 9 : 3)))
      ],
      [
        'aucune liste de réponses',
        () => ({ ...document(), answers: undefined })
      ]
    ];

    it.each(atypiques)(
      '%s : introuvable (404), jamais une panne, jamais un profil',
      async (_nom, fabrique) => {
        findOne.mockResolvedValue(fabrique());
        await expect(getTestResult(ID)).rejects.toMatchObject({
          name: 'NotFoundError'
        });
      }
    );

    it('journalise la cause et l’identifiant du document, sans aucune réponse', async () => {
      findOne.mockResolvedValue(document(reponses(() => 4).slice(0, 10)));
      await expect(getTestResult(ID)).rejects.toMatchObject({
        name: 'NotFoundError'
      });
      expect(erreur).toHaveBeenCalledTimes(1);
      const trace = erreur.mock.calls[0].map(String).join(' ');
      expect(trace).toContain(ID);
      expect(trace).toContain('120 réponses attendues, 10 reçues');
      expect(trace).not.toContain(items[0].id);
    });

    it('la page publique rend alors un 404', async () => {
      findOne.mockResolvedValue(document(reponses(() => 3).slice(0, 10)));
      await expect(rendre()).rejects.toThrow('NOT_FOUND');
    });
  });

  it('une panne de base reste une panne : erreur générique, pas un 404', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    findOne.mockRejectedValue(new Error('ECONNRESET'));
    await expect(getTestResult(ID)).rejects.toThrow(
      'Something wrong happend. Failed to get test result!'
    );
    vi.restoreAllMocks();
  });
});

const rendre = async (locale = 'fr', id = ID): Promise<string> =>
  renderToStaticMarkup(
    await ResultPage({ params: Promise.resolve({ id, locale }) })
  );

const paquet = createRequire(import.meta.url)(
  '@bigfive-org/results/lib/data/fr'
) as {
  domain: string;
  shortDescription: string;
  description: string;
  facets: { facet: number; title: string; text: string }[];
}[];

const DOMAINES: DomainCode[] = ['N', 'E', 'O', 'A', 'C'];

describe('page publique /result/[id] (interrupteur ouvert)', () => {
  it('rend par ResultView : cinq domaines, trente facettes, libellés de la bibliothèque', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    for (const code of DOMAINES) {
      expect(html).toContain(`data-domaine="${code}"`);
      for (let i = 1; i <= 6; i += 1) {
        expect(html, `${code}${i}`).toContain(esc(facetLabel(code, i, 'fr')));
      }
    }
    expect(html).toContain('m-1.0');
  });

  it('aucun texte du paquet @bigfive-org/results (trois domaines, trois facettes)', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    const domaines = paquet.filter((d) => ['N', 'O', 'C'].includes(d.domain));
    expect(domaines).toHaveLength(3);
    for (const d of domaines) {
      expect(html).not.toContain(esc(d.shortDescription));
      expect(html).not.toContain(esc(d.description.slice(0, 80)));
      const facette = d.facets[0];
      expect(facette).toBeDefined();
      expect(html).not.toContain(esc(facette?.text.slice(0, 80) ?? ''));
    }
  });

  it('cinq niveaux en toutes lettres, jamais low, neutral, high', async () => {
    // Un domaine par niveau : N bas, E plutôt bas, O milieu, A plutôt haut, C haut.
    const rangs: Record<string, number> = {};
    const valeurs = items.map((item) => {
      const r = rangs[item.domain] ?? 0;
      rangs[item.domain] = r + 1;
      if (item.domain === 'N') return 1;
      if (item.domain === 'E') return r < 12 ? 2 : 3;
      if (item.domain === 'A') return r < 12 ? 4 : 3;
      return item.domain === 'C' ? 5 : 3;
    });
    findOne.mockResolvedValue(document(reponses((rang) => valeurs[rang] ?? 3)));
    const html = await rendre();
    for (const niveau of [
      'bas',
      'plutot_bas',
      'milieu',
      'plutot_haut',
      'haut'
    ]) {
      expect(html).toContain(`data-niveau="${niveau}"`);
    }
    expect(html).not.toMatch(/\b(low|neutral|high)\b/i);
  });

  it('mentionne que les textes d’interprétation sont en relecture', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    const note = (fr as unknown as { results: { interpretationNote: string } })
      .results.interpretationNote;
    expect(note.length).toBeGreaterThan(10);
    expect(html).toContain(esc(note));
  });

  it('garde l’identifiant à copier et les boutons d’impression et de retour', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    expect(html).toContain(ID);
    expect(html).toContain(esc('Imprimer ou enregistrer en PDF'));
    expect(html).toContain('href="/"');
  });

  it('garde la présentation animée : sommaire à quatre ancres, compteurs, règles graduées', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    expect(html).toContain('aria-label="Sommaire du résultat"');
    for (const ancre of ['profil', 'scores', 'facettes', 'identifiant']) {
      expect(html, ancre).toContain(`href="#${ancre}"`);
      expect(html, ancre).toMatch(new RegExp(`<[a-z]+[^>]* id="${ancre}"`));
    }
    expect(html).toContain('data-compte="72"');
    expect(nbOccurrences(html, 'animate-tracer')).toBe(35);
  });

  it('en-tête : titre, date de passation puis introduction, dans cet ordre', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    const rang = ['<h1', 'Passé le 20 octobre 2026', 'Voici votre profil'].map(
      (m) => html.indexOf(m)
    );
    expect(rang.every((i) => i >= 0)).toBe(true);
    expect([...rang].sort((a, b) => a - b)).toEqual(rang);
  });

  it('arabe : même présentation animée (sommaire à quatre ancres, compteurs)', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre('ar');
    expect(html).toContain('href="#identifiant"');
    expect(html).toContain('data-compte="72"');
    expect(nbOccurrences(html, 'animate-tracer')).toBe(35);
  });

  it('audience « personne » : aucun bloc non relu, trente mentions « texte en relecture »', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    expect(nbOccurrences(html, 'Texte en relecture')).toBe(30);
    expect(html).not.toContain('Texte non relu');
  });

  it('un seul h1 et aucun identifiant en double', async () => {
    findOne.mockResolvedValue(document());
    const html = await rendre();
    expect(nbOccurrences(html, '<h1')).toBe(1);
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('identifiant inconnu : 404', async () => {
    findOne.mockResolvedValue(null);
    await expect(rendre()).rejects.toThrow('NOT_FOUND');
  });

  it('identifiant mal formé : 404', async () => {
    await expect(rendre('fr', 'zzz')).rejects.toThrow('NOT_FOUND');
  });
});

describe('catalogues de l’espace results', () => {
  const cles = (arbre: Tree, prefixe = ''): string[] =>
    Object.entries(arbre).flatMap(([cle, valeur]) =>
      typeof valeur === 'string'
        ? [`${prefixe}${cle}`]
        : cles(valeur, `${prefixe}${cle}.`)
    );
  const espace = (c: unknown): Tree => (c as { results: Tree }).results;

  it('mêmes clés en fr, en et ar', () => {
    const ref = cles(espace(fr)).sort();
    expect(cles(espace(en)).sort()).toEqual(ref);
    expect(cles(espace(ar)).sort()).toEqual(ref);
  });

  it('les clés des anciens niveaux et du paquet ont disparu', () => {
    const toutes = cles(espace(fr));
    for (const morte of [
      'level.low',
      'level.neutral',
      'level.high',
      'learnMore',
      'detailHint',
      'neuroticismGloss'
    ]) {
      expect(toutes, morte).not.toContain(morte);
    }
    expect(toutes).toContain('interpretationNote');
  });
});

describe('périmètre de l’étape', () => {
  const racine = resolve(__dirname, '../..');
  const lire = (chemin: string): string =>
    readFileSync(resolve(racine, chemin), 'utf8');

  it('actions et page publique n’importent plus @bigfive-org/results', () => {
    expect(lire('src/actions/index.ts')).not.toContain('@bigfive-org/results');
    expect(lire('src/app/[locale]/result/[id]/page.tsx')).not.toContain(
      '@bigfive-org/results'
    );
  });
});
