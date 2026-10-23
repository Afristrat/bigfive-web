import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { domainLabel, facetLabel } from '@/lib/domain-labels';
import {
  DOMAINES,
  FACETTES,
  INDEX_FACETTES,
  type DomainCode,
  type FacetIndex,
  type FacetteCode,
  type Niveau,
  type ScoreFacette,
  type ScoresTenga
} from '@/lib/moteur';
import { construireRapportBinome } from '@/lib/rapports/binome';

// next-intl/server lit le catalogue réel : une clé absente lève.
type Tree = { [key: string]: string | Tree };
const chercher = (namespace: string, key: string): string => {
  let node: string | Tree | undefined = (fr as Tree)[namespace];
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node !== 'string')
    throw new Error(`Message absent ${namespace}.${key}`);
  return node;
};
const traducteur =
  (namespace: string) =>
  (key: string, values?: Record<string, string>): string =>
    chercher(namespace, key).replace(
      /\{(\w+)\}/g,
      (whole, name: string) => values?.[name] ?? whole
    );

vi.mock('next-intl/server', () => ({
  setRequestLocale: () => undefined,
  getTranslations: async (arg: string | { namespace: string }) =>
    traducteur(typeof arg === 'string' ? arg : arg.namespace)
}));
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
    ),
  useRouter: () => ({ refresh: () => undefined })
}));
vi.mock('@/lib/session', () => ({
  requireViewer: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'lecteur@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  }),
  isTengaAdmin: async () => false
}));
vi.mock('@/actions/binome', () => ({
  repondreBinome: vi.fn(),
  retirerBinome: vi.fn(),
  proposerBinome: vi.fn()
}));

const loadMesBinomes = vi.fn();
const loadBinome = vi.fn();
vi.mock('@/lib/binome-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/binome-data')>()),
  loadMesBinomes: (viewer: unknown) => loadMesBinomes(viewer),
  loadBinome: (viewer: unknown, id: string) => loadBinome(viewer, id)
}));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug)
}));

const loadResultatsCampagne = vi.fn();
const loadCampagneOrganisation = vi.fn();
vi.mock('@/lib/consultant-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consultant-data')>()),
  loadResultatsCampagne: (viewer: unknown, id: string) =>
    loadResultatsCampagne(viewer, id),
  loadCampagneOrganisation: (viewer: unknown, org: string, id: string) =>
    loadCampagneOrganisation(viewer, org, id)
}));

import BinomesPage from '@/app/[locale]/mes-resultats/binomes/page';
import BinomePage from '@/app/[locale]/mes-resultats/binomes/[binome]/page';
import PropositionPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/binomes/page';
import {
  RapportBinome,
  libellesRapportBinome
} from '@/components/rapports/rapport-binome';

// ---------------------------------------------------------------------------
// Données de référence : profils fictifs AM et KB, faits du rapport cabinet.

const lireJson = <T>(relatif: string): T =>
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL(`../../../docs/design/${relatif}`, import.meta.url)
      ),
      'utf8'
    )
  ) as T;

type ProfilFictif = {
  code: string;
  domaine: Record<DomainCode, number>;
  facette: Record<FacetteCode, number>;
};
type Faits = {
  relations: {
    id: string;
    domaines: { d: DomainCode; ecart: number; classe: string }[];
    facettes_notables: {
      k: FacetteCode;
      ecart: number;
      niveau_a: Niveau;
      niveau_b: Niveau;
    }[];
  }[];
};

// Scores équivalents à un profil de moyennes : 4 réponses par facette, 24 par domaine.
const scoresDepuisProfil = (
  p: Pick<ProfilFictif, 'domaine' | 'facette'>
): ScoresTenga => {
  const domaines = Object.fromEntries(
    DOMAINES.map((d) => {
      const facettes = Object.fromEntries(
        INDEX_FACETTES.map((f: FacetIndex): [string, ScoreFacette] => {
          const moyenne = p.facette[`${d}${f}`];
          return [String(f), { score: moyenne * 4, count: 4, moyenne }];
        })
      );
      const moyenne = Math.round((p.domaine[d] / 24) * 1e6) / 1e6;
      return [d, { score: p.domaine[d], count: 24, moyenne, facettes }];
    })
  );
  return {
    format: 'tenga-scores-1',
    meta: { duree_secondes: null },
    ...domaines
  } as ScoresTenga;
};

// Un profil dont toutes les facettes valent `v`, sauf celles qu'on surcharge.
const uniforme = (
  v: number,
  surcharge: Partial<Record<FacetteCode, number>> = {}
): ScoresTenga => {
  const facette = Object.fromEntries(
    FACETTES.map((k) => [k, surcharge[k] ?? v])
  ) as Record<FacetteCode, number>;
  const domaine = Object.fromEntries(
    DOMAINES.map((d) => [
      d,
      INDEX_FACETTES.reduce((n, f) => n + facette[`${d}${f}`] * 4, 0)
    ])
  ) as Record<DomainCode, number>;
  return scoresDepuisProfil({ domaine, facette });
};

const profils = lireJson<ProfilFictif[]>('profils-fictifs/profils.json');
const faits = lireJson<Faits>('rapport-cabinet/sortie/faits.json');
const profil = (code: string): ProfilFictif => {
  const trouve = profils.find((p) => p.code === code);
  if (!trouve) throw new Error(`profil ${code} absent`);
  return trouve;
};
const SCORES_AM = scoresDepuisProfil(profil('AM'));
const SCORES_KB = scoresDepuisProfil(profil('KB'));
const RELATION = faits.relations.find((r) => r.id === 'AM-KB');
if (!RELATION) throw new Error('relation AM-KB absente');

const LIBELLE_O6 = facetLabel('O', 6, 'fr');
const texte = (html: string): string => html.replace(/<[^>]*>/g, ' ');

// Une personne dont la facette O6 et le total du domaine O sont des valeurs
// repérables : si l'une apparaît dans le rapport, le test le voit.
const AVEC_O_SENTINELLE = (base: ScoresTenga): ScoresTenga => ({
  ...base,
  O: {
    ...base.O,
    score: 117,
    moyenne: 4.875,
    facettes: {
      ...base.O.facettes,
      '6': { score: 20, count: 4, moyenne: 5 }
    }
  }
});

// ---------------------------------------------------------------------------
// binome.ts : construction pure.

describe('construireRapportBinome : test doré contre faits.json (relation AM-KB)', () => {
  const rapport = construireRapportBinome({ a: SCORES_AM, b: SCORES_KB });

  it('les différences notables sont exactement celles de comparerBinome dans faits.json, dans le même ordre', () => {
    expect(
      rapport.notables.map((n) => ({
        k: n.code,
        ecart: n.ecart,
        niveau_a: n.niveauA,
        niveau_b: n.niveauB
      }))
    ).toEqual(RELATION.facettes_notables);
  });

  it('les écarts de domaine sont ceux de faits.json, hors le domaine Ouverture', () => {
    expect(
      rapport.domaines.map((d) => ({
        d: d.code,
        ecart: d.ecart,
        classe: d.classe
      }))
    ).toEqual(RELATION.domaines.filter((d) => d.d !== 'O'));
  });

  it('la carte porte vingt-neuf facettes (O6 retirée), classées par écart décroissant puis par ordre fixe', () => {
    expect(rapport.facettes).toHaveLength(29);
    expect(rapport.facettes.map((f) => f.code)).not.toContain('O6');
    const ecarts = rapport.facettes.map((f) => f.ecart);
    expect(ecarts).toEqual([...ecarts].sort((x, y) => y - x));
    // À égalité, l'ordre N1 à C6 décide.
    const o2 = rapport.facettes.findIndex((f) => f.code === 'O2');
    const o4 = rapport.facettes.findIndex((f) => f.code === 'O4');
    expect(o2).toBeLessThan(o4);
  });

  it('les notables de la carte sont ceux du moteur : une seule vérité', () => {
    expect(
      rapport.facettes.filter((f) => f.classe === 'notable').map((f) => f.code)
    ).toEqual(rapport.notables.map((n) => n.code));
  });

  it('les trois classes recouvrent les vingt-neuf facettes, sans reste', () => {
    const parClasse = (c: string): number =>
      rapport.facettes.filter((f) => f.classe === c).length;
    expect(
      parClasse('proche') + parClasse('intermediaire') + parClasse('notable')
    ).toBe(29);
    expect(parClasse('notable')).toBe(11);
  });
});

describe('construireRapportBinome : le domaine Ouverture et sa facette O6 ne sortent jamais', () => {
  it('aucune ligne du domaine O, aucune facette O6, nulle part dans le modèle', () => {
    const rapport = construireRapportBinome({
      a: AVEC_O_SENTINELLE(SCORES_AM),
      b: AVEC_O_SENTINELLE(SCORES_KB)
    });
    expect(rapport.domaines.map((d) => d.code)).toEqual(['N', 'E', 'A', 'C']);
    const json = JSON.stringify(rapport);
    expect(json).not.toContain('O6');
    expect(json).not.toContain('"O"');
    expect(json).not.toContain('117');
  });

  it('le rapport ne dépend ni du total du domaine O ni de O6, ni de leur niveau', () => {
    const base = construireRapportBinome({ a: SCORES_AM, b: SCORES_KB });
    const autreO = construireRapportBinome({
      a: AVEC_O_SENTINELLE(SCORES_AM),
      b: AVEC_O_SENTINELLE(SCORES_KB)
    });
    expect(autreO).toEqual(base);
  });

  it('un écart notable sur O6 seul ne crée aucune différence ni aucun point', () => {
    const a = uniforme(3, { O6: 1 });
    const b = uniforme(3, { O6: 5 });
    const rapport = construireRapportBinome({ a, b });
    expect(rapport.notables).toEqual([]);
    expect(rapport.facettes.every((f) => f.classe === 'proche')).toBe(true);
    expect(rapport.conversation).toEqual([]);
  });

  it('les cinq premières facettes du domaine O restent comparées', () => {
    const rapport = construireRapportBinome({
      a: uniforme(3, { O1: 5 }),
      b: uniforme(3, { O1: 1.5 })
    });
    expect(rapport.notables.map((n) => n.code)).toEqual(['O1']);
  });
});

describe('construireRapportBinome : lecture rapprochée', () => {
  it('domaines proches, domaines qui distinguent, facettes à parler (trois au plus)', () => {
    const rapport = construireRapportBinome({
      a: uniforme(3),
      b: uniforme(3, { N1: 4.5, N2: 4.5, N3: 4.5, N4: 4.5, N5: 4.5, N6: 4.5 })
    });
    expect(rapport.rapproche).toEqual(['E', 'A', 'C']);
    expect(rapport.distingue).toEqual(['N']);
    expect(rapport.conversation).toEqual(['N1', 'N2', 'N3']);
  });

  it('deux profils identiques : tout rapproche, rien à distinguer, aucune conversation proposée', () => {
    const rapport = construireRapportBinome({ a: SCORES_AM, b: SCORES_AM });
    expect(rapport.rapproche).toEqual(['N', 'E', 'A', 'C']);
    expect(rapport.distingue).toEqual([]);
    expect(rapport.conversation).toEqual([]);
    expect(rapport.notables).toEqual([]);
  });

  it('classes aux bornes : 0,5 proche, 1,0 notable', () => {
    const rapport = construireRapportBinome({
      a: uniforme(3, { N1: 3.5, N2: 4 }),
      b: uniforme(3)
    });
    const classe = (k: FacetteCode): string | undefined =>
      rapport.facettes.find((f) => f.code === k)?.classe;
    expect(classe('N1')).toBe('proche');
    expect(classe('N2')).toBe('notable');
    expect(classe('N3')).toBe('proche');
  });
});

describe('construireRapportBinome : points d’attention documentés', () => {
  it('écart de conscienciosité notable : le point apparaît, avec sa source', () => {
    const c = { C1: 4.5, C2: 4.5, C3: 4.5, C4: 4.5, C5: 4.5, C6: 4.5 };
    const rapport = construireRapportBinome({
      a: uniforme(3),
      b: uniforme(3, c)
    });
    expect(rapport.attention).toContain('conscienciosite');
  });

  it('écart de conscienciosité seulement intermédiaire : pas de point', () => {
    const c = { C1: 3.8, C2: 3.8, C3: 3.8, C4: 3.8, C5: 3.8, C6: 3.8 };
    const rapport = construireRapportBinome({
      a: uniforme(3),
      b: uniforme(3, c)
    });
    expect(rapport.attention).not.toContain('conscienciosite');
  });

  it('agréabilité minimale bas ou plutôt bas chez l’un des deux : le point apparaît', () => {
    const bas = { A1: 1.5, A2: 1.5, A3: 1.5, A4: 1.5, A5: 1.5, A6: 1.5 };
    const plutotBas = { A1: 2.2, A2: 2.2, A3: 2.2, A4: 2.2, A5: 2.2, A6: 2.2 };
    expect(
      construireRapportBinome({ a: uniforme(3, bas), b: uniforme(3) }).attention
    ).toContain('agreabilite');
    expect(
      construireRapportBinome({ a: uniforme(3), b: uniforme(3, plutotBas) })
        .attention
    ).toContain('agreabilite');
  });

  it('agréabilité au milieu de l’échelle chez les deux : pas de point', () => {
    const milieu = { A1: 2.6, A2: 2.6, A3: 2.6, A4: 2.6, A5: 2.6, A6: 2.6 };
    const rapport = construireRapportBinome({
      a: uniforme(3, milieu),
      b: uniforme(3)
    });
    expect(rapport.attention).not.toContain('agreabilite');
  });

  it('aucun point quand rien ne s’y prête', () => {
    expect(
      construireRapportBinome({ a: uniforme(3), b: uniforme(3) }).attention
    ).toEqual([]);
  });
});

describe('construireRapportBinome : pureté et symétrie', () => {
  it('même entrée, même sortie', () => {
    const entree = { a: SCORES_AM, b: SCORES_KB };
    expect(construireRapportBinome(entree)).toEqual(
      construireRapportBinome(entree)
    );
  });

  it('échanger les deux personnes échange les niveaux et garde les écarts', () => {
    const ab = construireRapportBinome({ a: SCORES_AM, b: SCORES_KB });
    const ba = construireRapportBinome({ a: SCORES_KB, b: SCORES_AM });
    expect(ba.notables.map((n) => n.code)).toEqual(
      ab.notables.map((n) => n.code)
    );
    expect(ba.notables.map((n) => [n.niveauA, n.niveauB])).toEqual(
      ab.notables.map((n) => [n.niveauB, n.niveauA])
    );
  });
});

// ---------------------------------------------------------------------------
// Catalogue : aucun mot de comparaison globale, lexique, typographie.

const feuilles = (arbre: Tree, prefixe = ''): [string, string][] =>
  Object.entries(arbre).flatMap(([cle, valeur]) =>
    typeof valeur === 'string'
      ? [[`${prefixe}${cle}`, valeur] as [string, string]]
      : feuilles(valeur, `${prefixe}${cle}.`)
  );

// Lexique de docs/design/bibliotheque-textes/controle.py (INTERDITS_FR).
const INTERDITS_FR = [
  /\bmoyenne\b/i,
  /\bnormes?\b/i,
  /\bpercentiles?\b/i,
  /\bmeilleur/i,
  /\bpire/i,
  /\bmauvais/i,
  /\bbon score\b/i,
  /\bfaibles?\b/i,
  /\bfortes?\b/i,
  /\bforts\b/i,
  /\bexcellent/i,
  /\bscores?\b/i,
  /\bnotes?\b/i,
  /\bitems?\b/i,
  /\bpassation/i,
  /\btests?\b/i,
  /\bfeedback/i,
  /\bdebrief/i,
  /\bcoach/i,
  /\bpsychologue/i,
  /\bcompatibilit/i,
  /\baptitudes?\b/i,
  /\bcomp[ée]tences?\b/i,
  /\bpr[ée]dit/i,
  /\bgarantit/i,
  /\bvous [êe]tes\b/i,
  /\btroubles?\b/i,
  /\bmaladie/i,
  /\bdiagnostic/i,
  /\bpopulation/i,
  /\b(plus|moins|mieux|davantage|autant) que (les|d.)autres/i,
  /\bque la plupart/i,
  /\bau-dessus de la moyenne/i
];
const NIEES_FR = [
  /jamais d.un diagnostic/gi,
  /non un diagnostic/gi,
  /ni d.un diagnostic/gi,
  /pas un diagnostic/gi,
  /n.est pas un diagnostic/gi
];
const INTERDITS_AR = [
  'ضعيف',
  'جيد',
  'سيئ',
  'ممتاز',
  'أعلى من المتوسط',
  'المتوسط',
  'درجتك',
  'علامتك',
  'اختبار',
  'بند',
  'قارن',
  'التوافق بينكم',
  'أفضل',
  'أسوأ',
  'الأضعف',
  'كوتش'
];
const motsInterdits = (phrase: string): string[] => {
  let s = phrase;
  for (const nie of NIEES_FR) s = s.replace(nie, ' ');
  return INTERDITS_FR.filter((motif) => motif.test(s)).map(String);
};
const TIRETS = new RegExp(
  `[${String.fromCodePoint(0x2013)}${String.fromCodePoint(0x2014)}]`
);

const catalogues = { fr: fr as Tree, en: en as Tree, ar: ar as Tree };

describe('catalogue « binome »', () => {
  const binomeFr = feuilles(catalogues.fr.binome as Tree);

  it('les trois langues portent les mêmes clés', () => {
    const cles = (arbre: Tree): string[] =>
      feuilles(arbre.binome as Tree)
        .map(([k]) => k)
        .sort();
    expect(cles(catalogues.en)).toEqual(cles(catalogues.fr));
    expect(cles(catalogues.ar)).toEqual(cles(catalogues.fr));
    expect(binomeFr.length).toBeGreaterThan(60);
  });

  it('aucune langue n’annonce de compatibilité ni de pourcentage', () => {
    for (const langue of ['fr', 'en', 'ar'] as const) {
      for (const [cle, valeur] of feuilles(catalogues[langue].binome as Tree)) {
        expect(valeur, `${langue}.${cle}`).not.toMatch(/compatib/i);
        expect(valeur, `${langue}.${cle}`).not.toContain('توافق');
        expect(valeur, `${langue}.${cle}`).not.toContain('%');
        expect(valeur, `${langue}.${cle}`).not.toMatch(/percent|pourcent/i);
      }
    }
  });

  it('français : aucun mot du lexique interdit', () => {
    const fautes = binomeFr
      .map(([cle, valeur]) => [cle, motsInterdits(valeur)] as const)
      .filter(([, mots]) => mots.length > 0);
    expect(fautes).toEqual([]);
  });

  it('arabe : aucun mot du lexique interdit', () => {
    const fautes = feuilles(catalogues.ar.binome as Tree).flatMap(
      ([cle, valeur]) =>
        INTERDITS_AR.filter((mot) => valeur.includes(mot)).map(
          (mot) => `${cle} : ${mot}`
        )
    );
    expect(fautes).toEqual([]);
  });

  it('aucun tiret cadratin ni demi-cadratin, aucune clé vide', () => {
    for (const langue of ['fr', 'en', 'ar'] as const) {
      for (const [cle, valeur] of feuilles(catalogues[langue].binome as Tree)) {
        expect(valeur, `${langue}.${cle}`).toMatch(/\S/);
        expect(valeur, `${langue}.${cle}`).not.toMatch(TIRETS);
      }
    }
  });

  it('français : espace insécable avant : ; ? !', () => {
    for (const [cle, valeur] of binomeFr) {
      for (const m of valeur.matchAll(/[:;?!]/g)) {
        const avant = valeur[(m.index ?? 0) - 1];
        expect(avant, `${cle} : « ${valeur} »`).toBe(' ');
      }
    }
  });

  it('les sources citées sont celles du dossier de preuves, sans coefficient', () => {
    expect(chercher('binome', 'attention.conscienciosite.source')).toContain(
      'Peeters'
    );
    expect(chercher('binome', 'attention.conscienciosite.source')).toContain(
      '2006'
    );
    expect(chercher('binome', 'attention.agreabilite.source')).toContain(
      'Bell'
    );
    expect(chercher('binome', 'attention.agreabilite.source')).toContain(
      '2007'
    );
    expect(chercher('binome', 'attention.limite')).toMatch(/équipes/);
  });
});

// ---------------------------------------------------------------------------
// Composant.

const libelles = libellesRapportBinome(
  traducteur('binome'),
  traducteur('niveaux')
);
const ETIQUETTES = { a: 'Vous', b: 'L’autre personne' };
const rendreRapport = (
  a: ScoresTenga = SCORES_AM,
  b: ScoresTenga = SCORES_KB
): string =>
  renderToStaticMarkup(
    createElement(RapportBinome, {
      rapport: construireRapportBinome({ a, b }),
      locale: 'fr',
      libelles,
      etiquettes: ETIQUETTES,
      audience: 'personne'
    })
  );

describe('RapportBinome : rendu', () => {
  it('porte les sections dans l’ordre : lire, vue d’ensemble, domaines, carte, points d’attention, fiabilité', () => {
    const html = rendreRapport();
    const ordre = [
      'data-section="lire"',
      'data-section="ensemble"',
      'data-section="domaines"',
      'data-section="carte"',
      'data-section="attention"',
      'data-section="fiabilite"'
    ].map((marque) => html.indexOf(marque));
    expect(ordre.every((i) => i >= 0)).toBe(true);
    expect([...ordre].sort((x, y) => x - y)).toEqual(ordre);
  });

  it('« Lire ce rapport » : support de conversation, aucune note globale, pas un outil de décision', () => {
    const html = texte(rendreRapport());
    expect(html).toContain(fr.binome.lire.supportConversation);
    expect(html).toContain(fr.binome.lire.aucuneNote);
    expect(html).toContain(fr.binome.lire.pasDecision);
  });

  it('aucun pourcentage, aucun mot de compatibilité, dans tout le texte rendu', () => {
    const seul = texte(rendreRapport());
    expect(seul).not.toContain('%');
    expect(seul).not.toMatch(/compatib/i);
    expect(seul).not.toMatch(/pourcent/i);
  });

  it('radar superposé : deux tracés et un seul tableau de lecture à quatre domaines', () => {
    const html = rendreRapport();
    expect(html.match(/class="radar-trace/g)).toHaveLength(4); // grande et petite variantes, deux personnes
    expect(html).toContain(ETIQUETTES.a);
    expect(html).toContain(ETIQUETTES.b);
    const tableau = html.slice(
      html.indexOf('data-radar-table'),
      html.indexOf('</table>', html.indexOf('data-radar-table'))
    );
    expect(tableau.match(/<th scope="row"/g)).toHaveLength(4);
    expect(tableau).not.toContain(domainLabel('O', 'fr', 'short'));
  });

  it('carte des écarts : trois classes, toutes les différences notables, chacune avec ses deux niveaux', () => {
    const html = rendreRapport();
    for (const classe of ['notable', 'intermediaire', 'proche']) {
      expect(html).toContain(`data-classe-groupe="${classe}"`);
    }
    for (const n of RELATION.facettes_notables) {
      const ligne = html.match(
        new RegExp(`<tr data-ecart="${n.k}"[^>]*>[\\s\\S]*?</tr>`)
      )?.[0];
      expect(ligne, `ligne ${n.k}`).toBeDefined();
      expect(ligne).toContain('data-classe="notable"');
      expect(ligne).toContain(
        facetLabel(n.k[0] as DomainCode, Number(n.k[1]), 'fr')
      );
    }
    expect(html.match(/data-ecart="/g)).toHaveLength(29);
  });

  it('O6 et le domaine Ouverture : ni ligne, ni libellé, ni valeur sentinelle', () => {
    const html = rendreRapport(
      AVEC_O_SENTINELLE(SCORES_AM),
      AVEC_O_SENTINELLE(SCORES_KB)
    );
    const seul = texte(html);
    expect(html).not.toContain('data-ecart="O6"');
    expect(html).not.toContain('data-domaine="O"');
    expect(seul).not.toContain(LIBELLE_O6);
    expect(seul).not.toMatch(/\b117\b/);
    expect(html).toContain(fr.binome.ouverture.retiree);
  });

  it('les cinq premières facettes du domaine Ouverture figurent dans la carte', () => {
    const html = rendreRapport();
    for (const f of [1, 2, 3, 4, 5]) {
      expect(html).toContain(`data-ecart="O${f}"`);
    }
  });

  it('points d’attention : sources et mention « équipes, non binômes » quand un point s’applique', () => {
    const c = { C1: 4.5, C2: 4.5, C3: 4.5, C4: 4.5, C5: 4.5, C6: 4.5 };
    const html = rendreRapport(uniforme(3), uniforme(3, c));
    expect(html).toContain('data-attention="conscienciosite"');
    expect(texte(html)).toContain('Peeters');
    expect(texte(html)).toContain(fr.binome.attention.limite);
  });

  it('aucun point d’attention : phrase neutre, pas de source citée', () => {
    const html = rendreRapport(uniforme(3), uniforme(3));
    expect(texte(html)).toContain(fr.binome.attention.aucun);
    expect(html).not.toContain('data-attention=');
  });

  it('deux profils identiques : phrases neutres, aucune erreur', () => {
    const html = rendreRapport(SCORES_AM, SCORES_AM);
    expect(texte(html)).toContain(fr.binome.ensemble.conversationAucune);
    expect(texte(html)).toContain(fr.binome.carte.aucune);
  });

  it('chaque classe vide affiche sa phrase neutre', () => {
    const html = rendreRapport(SCORES_AM, SCORES_AM);
    expect(html.match(/data-classe-groupe="/g)).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// Pages.

const BINOME = '44444444-4444-4444-8444-444444444444';
const AUTRE_BINOME = '55555555-5555-4555-8555-555555555555';
const PART_A = '66666666-6666-4666-8666-666666666666';
const PART_B = '77777777-7777-4777-8777-777777777777';
const ORG = {
  id: '22222222-2222-4222-8222-222222222222',
  nom: 'Acme',
  slug: 'acme',
  statut: 'active'
};
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';

const rendre = async (page: Promise<unknown>): Promise<string> =>
  renderToStaticMarkup(createElement('div', null, (await page) as never));

const ligne = (surcharge: Record<string, unknown> = {}) => ({
  binomeId: BINOME,
  organisationNom: 'Acme',
  maParticipation: PART_A,
  proposeLe: '2026-10-20T10:00:00Z',
  statut: 'en_attente',
  monAccordLe: null,
  autreNom: 'Karim',
  ...surcharge
});

beforeEach(() => {
  loadMesBinomes.mockReset();
  loadBinome.mockReset();
  loadOrgPage.mockReset();
  loadResultatsCampagne.mockReset();
  loadCampagneOrganisation.mockReset();
  loadCampagneOrganisation.mockResolvedValue({
    id: CAMPAGNE,
    titre: 'Cohorte 1'
  });
});

describe('page /mes-resultats/binomes : mes propositions', () => {
  const appeler = (): Promise<string> =>
    rendre(BinomesPage({ params: Promise.resolve({ locale: 'fr' }) }));

  it('aucune proposition : phrase neutre', async () => {
    loadMesBinomes.mockResolvedValue([]);
    const html = await appeler();
    expect(texte(html)).toContain(fr.binome.liste.vide);
  });

  it('proposition en attente de ma décision : accepter et refuser, nom de l’autre personne, aucun lien vers le rapport', async () => {
    loadMesBinomes.mockResolvedValue([ligne()]);
    const html = await appeler();
    expect(texte(html)).toContain('Karim');
    expect(texte(html)).toContain(fr.binome.consent.accepter);
    expect(texte(html)).toContain(fr.binome.consent.refuser);
    expect(html).not.toContain(`/mes-resultats/binomes/${BINOME}`);
  });

  it('un seul accord, le mien : on peut le retirer, le rapport reste fermé', async () => {
    loadMesBinomes.mockResolvedValue([
      ligne({ monAccordLe: '2026-10-21T08:00:00Z' })
    ]);
    const html = await appeler();
    expect(texte(html)).toContain(fr.binome.consent.retirer);
    expect(texte(html)).not.toContain(fr.binome.consent.accepter);
    expect(html).not.toContain(`/mes-resultats/binomes/${BINOME}`);
    expect(texte(html)).not.toContain(fr.binome.liste.lire);
  });

  it('les deux accords : lien vers le rapport et retrait possible', async () => {
    loadMesBinomes.mockResolvedValue([
      ligne({ statut: 'actif', monAccordLe: '2026-10-21T08:00:00Z' })
    ]);
    const html = await appeler();
    expect(html).toContain(`/mes-resultats/binomes/${BINOME}`);
    expect(texte(html)).toContain(fr.binome.liste.lire);
    expect(texte(html)).toContain(fr.binome.consent.retirer);
  });

  it('proposition retirée : ni lien, ni bouton, ni nom', async () => {
    loadMesBinomes.mockResolvedValue([
      ligne({
        statut: 'retire',
        monAccordLe: '2026-10-21T08:00:00Z',
        autreNom: null
      })
    ]);
    const html = await appeler();
    expect(html).not.toContain(`/mes-resultats/binomes/${BINOME}`);
    expect(texte(html)).not.toContain(fr.binome.consent.retirer);
    expect(texte(html)).not.toContain(fr.binome.consent.accepter);
    expect(texte(html)).toContain(fr.binome.liste.statut.retire);
  });

  it('nom de l’autre personne absent : formule neutre, jamais « null »', async () => {
    loadMesBinomes.mockResolvedValue([ligne({ autreNom: null })]);
    const html = await appeler();
    expect(texte(html)).not.toContain('null');
    expect(texte(html)).toContain(fr.binome.liste.autreInconnu);
  });
});

describe('page /mes-resultats/binomes/[binome] : le rapport', () => {
  const appeler = (id: string = BINOME): Promise<string> =>
    rendre(
      BinomePage({
        params: Promise.resolve({ locale: 'fr', binome: id })
      })
    );

  // `moi` : rang (0 ou 1) de la ligne qui est la mienne, ou null pour le consultant.
  const lu = (moi: 0 | 1 | null, surcharge: Record<string, unknown> = {}) => ({
    binomeId: BINOME,
    personnes: [
      { participationId: PART_A, estLaMienne: moi === 0, scores: SCORES_AM },
      { participationId: PART_B, estLaMienne: moi === 1, scores: SCORES_KB }
    ],
    ...surcharge
  });

  it('identifiant hors format : 404 avant toute lecture', async () => {
    await expect(appeler('pas-un-uuid')).rejects.toThrow('NOT_FOUND');
    expect(loadBinome).not.toHaveBeenCalled();
  });

  it('sans double accord (ou retiré, ou interdit) : la lecture rend null et la page répond 404', async () => {
    loadBinome.mockResolvedValue(null);
    await expect(appeler()).rejects.toThrow('NOT_FOUND');
    expect(loadBinome).toHaveBeenCalledWith(expect.anything(), BINOME);
  });

  it('une personne du binôme : « Vous » et « L’autre personne », retrait possible, Ouverture absente', async () => {
    loadBinome.mockResolvedValue(lu(0));
    const html = await appeler();
    expect(texte(html)).toContain('Vous');
    expect(texte(html)).toContain('L’autre personne');
    expect(texte(html)).toContain(fr.binome.consent.retirer);
    expect(html).not.toContain('data-ecart="O6"');
    expect(html).not.toContain('data-domaine="O"');
  });

  it('la personne qui regarde passe en premier, même si la base la range en seconde', async () => {
    loadBinome.mockResolvedValue(lu(1));
    const html = await appeler();
    // O5 : AM « haut », KB « plutôt bas ». KB regarde : son niveau vient d'abord.
    const ligneO5 = texte(
      html.match(/<tr data-ecart="O5"[^>]*>[\s\S]*?<\/tr>/)?.[0] ?? ''
    );
    expect(ligneO5.indexOf(fr.niveaux.plutot_bas)).toBeGreaterThanOrEqual(0);
    expect(ligneO5.indexOf(fr.niveaux.plutot_bas)).toBeLessThan(
      ligneO5.lastIndexOf(fr.niveaux.haut)
    );
    expect(texte(html)).toContain('Vous');
  });

  it('consultant ou administrateur (aucune des deux lignes n’est la sienne) : « Personne 1 » et « Personne 2 », aucun bouton de retrait', async () => {
    loadBinome.mockResolvedValue(lu(null));
    const html = await appeler();
    expect(texte(html)).toContain('Personne 1');
    expect(texte(html)).toContain('Personne 2');
    expect(texte(html)).not.toContain(fr.binome.consent.retirer);
    expect(texte(html)).not.toContain('Vous');
  });

  it('un format de résultat antérieur : message, jamais d’erreur 500', async () => {
    loadBinome.mockResolvedValue(
      lu(0, {
        personnes: [
          { participationId: PART_A, estLaMienne: true, scores: null },
          { participationId: PART_B, estLaMienne: false, scores: SCORES_KB }
        ]
      })
    );
    const html = await appeler();
    expect(texte(html)).toContain(fr.mesResultats.formatAnterieur);
    expect(html).not.toContain('data-section="carte"');
  });

  it('une panne de la passerelle n’est pas masquée en 404', async () => {
    loadBinome.mockRejectedValue(new Error('panne'));
    await expect(appeler()).rejects.toThrow('panne');
  });

  it('le texte rendu ne contient ni pourcentage ni mot de compatibilité', async () => {
    loadBinome.mockResolvedValue(lu(0));
    const seul = texte(await appeler());
    expect(seul).not.toContain('%');
    expect(seul).not.toMatch(/compatib/i);
  });
});

describe('page consultant /o/[slug]/campagnes/[campagne]/binomes : proposer un binôme', () => {
  const appeler = (): Promise<string> =>
    rendre(
      PropositionPage({
        params: Promise.resolve({
          locale: 'fr',
          slug: 'acme',
          campagne: CAMPAGNE
        })
      })
    );
  const trois = [
    { participationId: PART_A, soumisLe: '2026-10-20T10:00:00Z' },
    { participationId: PART_B, soumisLe: '2026-10-21T10:00:00Z' },
    {
      participationId: AUTRE_BINOME,
      soumisLe: '2026-10-22T10:00:00Z'
    }
  ];

  it.each([
    ['consultant', { isAdmin: false, role: 'consultant' }],
    ['administrateur Tenga', { isAdmin: true, role: null }]
  ])(
    '%s : deux choix parmi les résultats numérotés, sans identité',
    async (_, lecteur) => {
      loadOrgPage.mockResolvedValue({ org: ORG, ...lecteur });
      loadResultatsCampagne.mockResolvedValue(trois);
      const html = await appeler();
      expect(loadResultatsCampagne).toHaveBeenCalledWith(
        expect.anything(),
        CAMPAGNE
      );
      expect(html).toContain('Résultat 1');
      expect(html).toContain('Résultat 3');
      expect(html).toContain(`value="${PART_A}"`);
      expect(html).toContain('name="a"');
      expect(html).toContain('name="b"');
      expect(texte(html)).not.toMatch(/@/);
    }
  );

  it.each(['responsable', 'participant', null])(
    'rôle %s : 404 avant toute lecture de la liste',
    async (role) => {
      loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: false, role });
      await expect(appeler()).rejects.toThrow('NOT_FOUND');
      expect(loadResultatsCampagne).not.toHaveBeenCalled();
    }
  );

  it('organisation absente, campagne d’une autre organisation, refus de la base : 404', async () => {
    loadOrgPage.mockResolvedValue(null);
    await expect(appeler()).rejects.toThrow('NOT_FOUND');
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'consultant'
    });
    loadCampagneOrganisation.mockResolvedValue(null);
    await expect(appeler()).rejects.toThrow('NOT_FOUND');
    loadCampagneOrganisation.mockResolvedValue({ id: CAMPAGNE, titre: 'C' });
    loadResultatsCampagne.mockResolvedValue(null);
    await expect(appeler()).rejects.toThrow('NOT_FOUND');
  });

  it('moins de deux résultats : phrase neutre, aucun formulaire', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'consultant'
    });
    loadResultatsCampagne.mockResolvedValue(trois.slice(0, 1));
    const html = await appeler();
    expect(texte(html)).toContain(fr.binome.proposition.moinsDeDeux);
    expect(html).not.toContain('<form');
  });

  it('identifiants d’URL hors format : 404', async () => {
    await expect(
      PropositionPage({
        params: Promise.resolve({
          locale: 'fr',
          slug: 'acme',
          campagne: 'pas-un-uuid'
        })
      })
    ).rejects.toThrow('NOT_FOUND');
  });
});
