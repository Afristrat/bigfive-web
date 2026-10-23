import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { blocFacette } from '@/lib/bibliotheque';
import { facetLabel } from '@/lib/domain-labels';
import {
  DOMAINES,
  FACETTES,
  INDEX_FACETTES,
  profilDepuisScores,
  type DomainCode,
  type FacetIndex,
  type FacetteCode,
  type Niveau,
  type ScoreFacette,
  type ScoresTenga
} from '@/lib/moteur';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';

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
    )
}));
vi.mock('@/lib/session', () => ({
  requireViewer: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'lecteur@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  }),
  isTengaAdmin: async () => false
}));

const loadMaParticipation = vi.fn();
vi.mock('@/lib/mes-resultats-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mes-resultats-data')>()),
  loadMaParticipation: (viewer: unknown, id: string) =>
    loadMaParticipation(viewer, id)
}));

const loadOrgPage = vi.fn();
const loadCampaigns = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug),
  loadCampaigns: () => loadCampaigns(),
  loadCampaignStats: async () => null
}));

const loadResultatsCampagne = vi.fn();
const loadResultatIndividuel = vi.fn();
const loadCampagneOrganisation = vi.fn();
vi.mock('@/lib/consultant-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consultant-data')>()),
  loadResultatsCampagne: (viewer: unknown, id: string) =>
    loadResultatsCampagne(viewer, id),
  loadResultatIndividuel: (viewer: unknown, id: string) =>
    loadResultatIndividuel(viewer, id),
  loadCampagneOrganisation: (viewer: unknown, org: string, id: string) =>
    loadCampagneOrganisation(viewer, org, id)
}));

vi.mock('@/actions/members', () => ({ inviteMember: vi.fn() }));
vi.mock('@/actions/invitations', () => ({ inviteParticipants: vi.fn() }));
vi.mock('@/actions/campaigns', () => ({
  createCampaign: vi.fn(),
  openCampaign: vi.fn(),
  closeCampaign: vi.fn()
}));

import OrganizationPage from '@/app/[locale]/o/[slug]/page';
import ListeResultatsPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/page';
import LectureResultatPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/[participation]/page';
import RapportPersonnePage from '@/app/[locale]/mes-resultats/[participation]/rapport/page';
import {
  RapportIndividuel,
  libellesRapport
} from '@/components/rapports/rapport-individuel';

// ---------------------------------------------------------------------------
// Données de référence : profil fictif AM et faits du rapport cabinet.

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
type FaitsPersonne = {
  facettes: Record<
    FacetteCode,
    { moy: number; niveau: Niveau; bloc_id: string }
  >;
  tensions: {
    id: string;
    facettes: [FacetteCode, FacetteCode];
    ecart: number;
  }[];
  contribution: { points_forts_hypothese: FacetteCode[] };
};

// Scores équivalents à un profil de moyennes : 4 réponses par facette, 24 par domaine.
const scoresDepuisProfil = (
  p: Pick<ProfilFictif, 'domaine' | 'facette'>,
  duree: number | null = null
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
    meta: { duree_secondes: duree },
    ...domaines
  } as ScoresTenga;
};

const profils = lireJson<ProfilFictif[]>('profils-fictifs/profils.json');
const faits = lireJson<{ personnes: Record<string, FaitsPersonne> }>(
  'rapport-cabinet/sortie/faits.json'
);
const profilAM = profils.find((p) => p.code === 'AM');
if (!profilAM) throw new Error('profil AM absent');
const SCORES_AM = scoresDepuisProfil(profilAM, 754);
const FAITS_AM = faits.personnes.AM;
const BLOCS_AM = FACETTES.map((k) => FAITS_AM.facettes[k].bloc_id);

const LIBELLE_O6 = facetLabel('O', 6, 'fr');
const texte = (html: string): string => html.replace(/<[^>]*>/g, ' ');

afterEach(() => {
  vi.unstubAllEnvs();
});

// ---------------------------------------------------------------------------
// individuel.ts : construction pure.

describe('construireRapportIndividuel : test doré contre faits.json (profil AM)', () => {
  it('personne : les blocs cités sont exactement les bloc_id des 30 facettes de AM', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect([...rapport.blocIds].sort()).toEqual([...BLOCS_AM].sort());
    expect(rapport.blocIds).toHaveLength(30);
    expect(rapport.facetteRetiree).toBe(false);
  });

  it('consultant : les mêmes blocs, sans celui de O6', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    const attendu = BLOCS_AM.filter((id) => !id.startsWith('O6/'));
    expect([...rapport.blocIds].sort()).toEqual([...attendu].sort());
    expect(rapport.blocIds).toHaveLength(29);
    expect(rapport.facetteRetiree).toBe(true);
  });

  it('administrateur : même vue que le consultant, O6 retirée', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'administrateur'
    });
    expect(rapport.blocIds.some((id) => id.startsWith('O6/'))).toBe(false);
  });

  it('personne : les tensions sont celles de faits.json', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.tensions.map((t) => t.id)).toEqual(
      FAITS_AM.tensions.map((t) => t.id)
    );
  });

  it('consultant : aucune trace de O6, ni dans les tensions, ni dans la carte, ni dans le reste', () => {
    expect(FAITS_AM.tensions.some((t) => t.id.includes('O6'))).toBe(true);
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    expect(rapport.tensions.map((t) => t.id)).toEqual(
      FAITS_AM.tensions.map((t) => t.id).filter((id) => !id.includes('O6'))
    );
    expect(rapport.carte).toHaveLength(29);
    expect(JSON.stringify(rapport)).not.toContain('O6');
    expect(rapport.domaines.find((d) => d.code === 'O')?.facettes).toHaveLength(
      5
    );
  });

  it('personne : la carte compte les 30 facettes dans l’ordre N, E, O, A, C', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.carte.map((c) => c.code)).toEqual([...FACETTES]);
    for (const ligne of rapport.carte) {
      expect(ligne.niveau).toBe(FAITS_AM.facettes[ligne.code].niveau);
    }
  });

  it('les cinq domaines gardent le niveau et le total de faits.json', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    expect(rapport.domaines.map((d) => d.code)).toEqual([...DOMAINES]);
    expect(rapport.domaines.map((d) => d.score)).toEqual(
      DOMAINES.map((d) => SCORES_AM[d].score)
    );
  });

  it('ce qui ressort : règle CONTRIB-1, cinq facettes de niveau bas ou haut, les plus éloignées du milieu d’abord', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.ressort.map((r) => r.code)).toEqual(
      FAITS_AM.contribution.points_forts_hypothese
    );
    expect(rapport.ressort).toHaveLength(5);
    for (const point of rapport.ressort) {
      expect(['bas', 'haut']).toContain(point.niveau);
    }
  });

  it.each(['AM', 'KB', 'SR', 'HT'])(
    '%s : ce qui ressort égale points_forts_hypothese de faits.json',
    (code) => {
      const source = profils.find((p) => p.code === code);
      if (!source) throw new Error(`profil ${code} absent`);
      const rapport = construireRapportIndividuel({
        scores: scoresDepuisProfil(source),
        locale: 'fr',
        audience: 'personne'
      });
      expect(rapport.ressort.map((r) => r.code)).toEqual(
        faits.personnes[code].contribution.points_forts_hypothese
      );
    }
  );

  it('ce qui ressort : une facette de niveau « plutôt haut » ou « plutôt bas » n’y figure jamais', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    const intermediaires = FACETTES.filter((k) =>
      ['plutot_haut', 'plutot_bas'].includes(FAITS_AM.facettes[k].niveau)
    );
    expect(intermediaires.length).toBeGreaterThan(0);
    for (const k of intermediaires) {
      expect(rapport.ressort.map((r) => r.code)).not.toContain(k);
    }
  });

  it('ce qui ressort : moins de cinq facettes de niveau bas ou haut, on n’y ajoute pas de facette « plutôt »', () => {
    const facette = Object.fromEntries(FACETTES.map((k) => [k, 3.5])) as Record<
      FacetteCode,
      number
    >;
    facette.N1 = 4.5;
    facette.N2 = 1.5;
    const domaine = Object.fromEntries(
      DOMAINES.map((d) => [
        d,
        INDEX_FACETTES.reduce((n, f) => n + facette[`${d}${f}`] * 4, 0)
      ])
    ) as Record<DomainCode, number>;
    const rapport = construireRapportIndividuel({
      scores: scoresDepuisProfil({ domaine, facette }),
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.ressort).toEqual([
      { code: 'N1', niveau: 'haut' },
      { code: 'N2', niveau: 'bas' }
    ]);
  });

  it('consultant : ce qui ressort ne contient jamais O6', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    expect(rapport.ressort.map((r) => r.code)).not.toContain('O6');
  });
});

describe('construireRapportIndividuel : questions d’entretien issues des blocs', () => {
  it('consultant : trois questions, la première vient de la plus forte tension', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    const tensions = FAITS_AM.tensions
      .filter((t) => !t.id.includes('O6'))
      .sort((a, b) => b.ecart - a.ecart);
    expect(rapport.entretien).toHaveLength(3);
    expect(new Set(rapport.entretien.map((q) => q.code)).size).toBe(3);
    expect(rapport.entretien[0]?.code).toBe(tensions[0]?.facettes[0]);
    for (const q of rapport.entretien) {
      const etat = blocFacette(q.blocId, 'fr', 'consultant');
      expect(etat.etat).toBe('affiche');
      if (etat.etat === 'affiche') expect(q.question).toBe(etat.bloc.question);
      expect(q.blocId).toBe(FAITS_AM.facettes[q.code].bloc_id);
    }
  });

  it('personne, blocs non relus masqués : aucune question', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.entretien).toEqual([]);
    expect(
      rapport.domaines.every((d) =>
        d.facettes.every((f) => f.etat.etat === 'en_relecture')
      )
    ).toBe(true);
  });

  it('personne, masquage levé par l’exploitation : les questions reviennent', () => {
    vi.stubEnv('BIBLIOTHEQUE_NON_RELUS_PERSONNES', 'afficher');
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.entretien).toHaveLength(3);
  });

  it('langue sans bibliothèque : aucun texte, aucune question', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'ar',
      audience: 'consultant'
    });
    expect(rapport.entretien).toEqual([]);
    expect(
      rapport.domaines.every((d) =>
        d.facettes.every((f) => f.etat.etat === 'langue_absente')
      )
    ).toBe(true);
  });

  it('aucun accord grammatical tant que la décision D8 est ouverte : forme sans accord', () => {
    const facette = Object.fromEntries(FACETTES.map((k) => [k, 3])) as Record<
      FacetteCode,
      number
    >;
    facette.C5 = 1;
    const domaine = { N: 72, E: 72, O: 72, A: 72, C: 72 };
    const rapport = construireRapportIndividuel({
      scores: scoresDepuisProfil({ domaine, facette }),
      locale: 'fr',
      audience: 'consultant'
    });
    const c5 = rapport.domaines
      .find((d) => d.code === 'C')
      ?.facettes.find((f) => f.code === 'C5');
    expect(c5?.blocId).toBe('C5/bas');
    const etat = c5?.etat;
    expect(etat?.etat).toBe('affiche');
    const tout =
      etat?.etat === 'affiche'
        ? [
            ...etat.bloc.description,
            ...etat.bloc.apport,
            ...etat.bloc.cout,
            etat.bloc.question
          ].join(' ')
        : '';
    expect(tout).not.toMatch(/[{}|]/);
    expect(tout).toContain('rester disponible à l’imprévu');
  });
});

describe('construireRapportIndividuel : fiabilité', () => {
  it('durée donnée telle quelle, sans seuil, et aucun compteur de réponses (le schéma en garantit 120)', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.fiabilite).toEqual({ dureeSecondes: 754 });
  });

  it('durée absente : null, rien d’inventé', () => {
    const rapport = construireRapportIndividuel({
      scores: scoresDepuisProfil(profilAM, null),
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.fiabilite.dureeSecondes).toBeNull();
  });

  it('durée de zéro seconde (passation reprise : le client n’a pas pu la mesurer) : durée inconnue', () => {
    const rapport = construireRapportIndividuel({
      scores: scoresDepuisProfil(profilAM, 0),
      locale: 'fr',
      audience: 'personne'
    });
    expect(rapport.fiabilite.dureeSecondes).toBeNull();
  });
});

describe('construireRapportIndividuel : pureté', () => {
  it('même entrée, même sortie, versions portées par le rapport', () => {
    const entree = {
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    } as const;
    const a = construireRapportIndividuel(entree);
    const b = construireRapportIndividuel(entree);
    expect(a).toEqual(b);
    expect(a.versionMoteur).toBe(profilDepuisScores(SCORES_AM).versionMoteur);
    expect(a.versionBibliotheque).toMatch(/\S/);
  });
});

// ---------------------------------------------------------------------------
// Catalogue : lexique interdit, typographie.

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

describe('catalogue « rapport »', () => {
  const rapportFr = feuilles(catalogues.fr.rapport as Tree);

  it('les trois langues portent les mêmes clés', () => {
    const cles = (arbre: Tree): string[] =>
      feuilles(arbre.rapport as Tree)
        .map(([k]) => k)
        .sort();
    expect(cles(catalogues.en)).toEqual(cles(catalogues.fr));
    expect(cles(catalogues.ar)).toEqual(cles(catalogues.fr));
    expect(rapportFr.length).toBeGreaterThan(30);
  });

  it('français : aucun mot du lexique interdit dans les textes fixes du rapport', () => {
    const fautes = rapportFr
      .map(([cle, valeur]) => [cle, motsInterdits(valeur)] as const)
      .filter(([, mots]) => mots.length > 0);
    expect(fautes).toEqual([]);
  });

  it('français : aucun mot interdit non plus dans les libellés que le rapport emprunte', () => {
    const emprunts = [
      ...feuilles(catalogues.fr.niveaux as Tree),
      ...[
        'facetOutOf',
        'description',
        'apport',
        'cout',
        'question',
        'avertissement',
        'enRelecture',
        'langueAbsente',
        'nonRelu'
      ].map((cle): [string, string] => [
        `mesResultats.vue.${cle}`,
        chercher('mesResultats', `vue.${cle}`)
      ])
    ];
    const fautes = emprunts
      .map(([cle, valeur]) => [cle, motsInterdits(valeur)] as const)
      .filter(([, mots]) => mots.length > 0);
    expect(fautes).toEqual([]);
  });

  it('le lexique attrape bien un mot interdit, et laisse passer le diagnostic nié', () => {
    expect(motsInterdits('Votre score est bon')).not.toEqual([]);
    expect(motsInterdits('Ce n’est pas un diagnostic.')).toEqual([]);
    expect(motsInterdits('Un diagnostic précis.')).not.toEqual([]);
  });

  it('arabe : aucun mot du lexique interdit', () => {
    const fautes = feuilles(catalogues.ar.rapport as Tree).flatMap(
      ([cle, valeur]) =>
        INTERDITS_AR.filter((mot) => valeur.includes(mot)).map(
          (mot) => `${cle} : ${mot}`
        )
    );
    expect(fautes).toEqual([]);
  });

  it('aucun tiret cadratin ni demi-cadratin, aucune clé vide', () => {
    for (const langue of ['fr', 'en', 'ar'] as const) {
      for (const [cle, valeur] of feuilles(
        catalogues[langue].rapport as Tree
      )) {
        expect(valeur, `${langue}.${cle}`).toMatch(/\S/);
        expect(valeur, `${langue}.${cle}`).not.toMatch(TIRETS);
      }
    }
  });

  it('français : espace insécable avant : ; ? !', () => {
    for (const [cle, valeur] of rapportFr) {
      for (const m of valeur.matchAll(/[:;?!]/g)) {
        const avant = valeur[(m.index ?? 0) - 1];
        // Les modèles « {nom} : » et les marqueurs ne portent pas d’exception.
        expect(avant, `${cle} : « ${valeur} »`).toBe(' ');
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Composant.

const libelles = libellesRapport(
  traducteur('rapport'),
  traducteur('mesResultats'),
  traducteur('niveaux')
);
const rendreRapport = (
  audience: 'personne' | 'consultant',
  options: { scores?: ScoresTenga; date?: string | null } = {}
): string =>
  renderToStaticMarkup(
    createElement(RapportIndividuel, {
      rapport: construireRapportIndividuel({
        scores: options.scores ?? SCORES_AM,
        locale: 'fr',
        audience
      }),
      locale: 'fr',
      libelles,
      date: options.date === undefined ? '20 octobre 2026' : options.date
    })
  );

describe('RapportIndividuel : rendu', () => {
  it('porte les sections dans l’ordre : lire, vue d’ensemble, cinq domaines, carte, tensions, fiabilité', () => {
    const html = rendreRapport('consultant');
    const ordre = [
      'data-section="lire"',
      'data-section="ensemble"',
      'data-section="domaines"',
      'data-section="carte"',
      'data-section="tensions"',
      'data-section="fiabilite"'
    ].map((marque) => html.indexOf(marque));
    expect(ordre.every((i) => i >= 0)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
    for (const d of DOMAINES) expect(html).toContain(`data-domaine="${d}"`);
  });

  it('« Lire ce rapport » dit ce que le rapport ne dit pas, et à qui il va (personne)', () => {
    const html = rendreRapport('personne');
    expect(html).toContain(fr.rapport.lire.titre);
    for (const texteLire of Object.values(fr.rapport.lire.personne)) {
      expect(html).toContain(texteLire);
    }
    expect(html).toContain(fr.rapport.lire.destinatairesPersonne);
    expect(html).not.toContain(fr.rapport.lire.destinatairesConsultant);
    expect(html).not.toContain(fr.rapport.lire.consultant.ce);
  });

  it('« Lire ce rapport » côté consultant : destinataires propres au consultant', () => {
    const html = rendreRapport('consultant');
    expect(html).toContain(fr.rapport.lire.destinatairesConsultant);
    expect(html).not.toContain(fr.rapport.lire.destinatairesPersonne);
  });

  it('côté consultant, le rapport parle de la personne à la troisième personne', () => {
    const html = rendreRapport('consultant');
    for (const texteLire of Object.values(fr.rapport.lire.consultant)) {
      expect(html).toContain(texteLire);
    }
    expect(html).not.toContain(fr.rapport.lire.personne.ce);
    const lire = /data-section="lire"[\s\S]*?<\/section>/.exec(html)?.[0];
    expect(lire).toBeDefined();
    expect(texte(lire ?? '')).not.toMatch(/\b(vous|votre|vos)\b/i);
    // La question d'entretien s'adresse au consultant, pas à la personne.
    expect(html).toContain(fr.rapport.consultant.question);
    expect(html).not.toContain(fr.mesResultats.vue.question);
  });

  it('les textes « Lire ce rapport » existent dans les deux voix, dans les trois langues', () => {
    for (const catalogue of [fr, en, ar]) {
      const lire = catalogue.rapport.lire;
      expect(Object.keys(lire.consultant).sort()).toEqual(
        Object.keys(lire.personne).sort()
      );
    }
    for (const valeur of Object.values(en.rapport.lire.consultant)) {
      expect(valeur).not.toMatch(/\b(you|your)\b/i);
    }
    for (const valeur of Object.values(ar.rapport.lire.consultant)) {
      expect(valeur).not.toMatch(/(إجابتك|مستقبلك|عنك|تضعك)/);
    }
  });

  it('personne : les 30 facettes dans la carte, dont O6', () => {
    const html = rendreRapport('personne');
    expect((html.match(/data-carte="/g) ?? []).length).toBe(30);
    expect(html).toContain('data-carte="O6"');
    expect(html).toContain(LIBELLE_O6);
  });

  it('consultant : O6 absente de partout, et la mention de retrait présente', () => {
    const html = rendreRapport('consultant');
    expect((html.match(/data-carte="/g) ?? []).length).toBe(29);
    expect(html).not.toContain('data-carte="O6"');
    expect(html).not.toContain(LIBELLE_O6);
    expect(html).not.toContain('O6');
    expect(html).toContain(fr.rapport.consultant.facetteRetiree);
  });

  it('personne : pas de mention de retrait', () => {
    expect(rendreRapport('personne')).not.toContain(
      fr.rapport.consultant.facetteRetiree
    );
  });

  it('aucun pourcentage, aucune compatibilité, aucune comparaison à un groupe', () => {
    for (const audience of ['personne', 'consultant'] as const) {
      const t = texte(rendreRapport(audience));
      expect(t).not.toMatch(/%/);
      expect(t).not.toMatch(/compatibilit/i);
    }
  });

  it('niveaux en toutes lettres, convention et version du moteur affichées', () => {
    const html = rendreRapport('consultant');
    expect(html).toContain(fr.niveaux.haut);
    expect(html).toContain(fr.niveaux.echelle);
    expect(html).toContain('m-1.0');
  });

  it('consultant : bandeau « texte non relu » sur les blocs montrés', () => {
    const html = rendreRapport('consultant');
    expect(html).toContain(fr.mesResultats.vue.nonRelu);
  });

  it('personne, blocs non relus : « en relecture », aucune question d’entretien', () => {
    const html = rendreRapport('personne');
    expect(html).toContain(fr.mesResultats.vue.enRelecture);
    expect(html).not.toContain(fr.mesResultats.vue.nonRelu);
    expect(html).toContain(fr.rapport.ensemble.entretienAucune);
  });

  it('consultant : les trois questions d’entretien sont listées', () => {
    const rapport = construireRapportIndividuel({
      scores: SCORES_AM,
      locale: 'fr',
      audience: 'consultant'
    });
    const html = rendreRapport('consultant');
    const entretien = /data-section="entretien"[\s\S]*?<\/section>/.exec(html);
    expect(entretien).not.toBeNull();
    expect((entretien?.[0].match(/<li/g) ?? []).length).toBe(3);
    for (const q of rapport.entretien) {
      expect(entretien?.[0]).toContain(
        q.question.replace(/'/g, '&#x27;').replace(/"/g, '&quot;')
      );
    }
  });

  it('durée affichée seulement si elle existe', () => {
    const avec = texte(rendreRapport('personne'));
    expect(avec).toMatch(/Durée de réponse/);
    expect(avec).toMatch(/13\s+minutes/);
    const sans = texte(
      rendreRapport('personne', { scores: scoresDepuisProfil(profilAM, null) })
    );
    expect(sans).not.toMatch(/Durée de réponse/);
  });

  it('n’annonce aucun décompte de réponses (le schéma en garantit 120, rien à mesurer)', () => {
    const rendu = texte(rendreRapport('personne'));
    expect(rendu).not.toMatch(/120\s+réponses/);
    expect(rendu).not.toMatch(/réponses\s+sur\s+120/);
    expect(rendu).not.toMatch(/Toutes les réponses sont présentes/);
  });

  it('durée de zéro seconde : aucune durée affichée', () => {
    const rendu = texte(
      rendreRapport('personne', { scores: scoresDepuisProfil(profilAM, 0) })
    );
    expect(rendu).not.toMatch(/Durée de réponse/);
  });

  it('aucune tension : phrase neutre, sans liste', () => {
    const plat = Object.fromEntries(FACETTES.map((k) => [k, 3])) as Record<
      FacetteCode,
      number
    >;
    const html = rendreRapport('personne', {
      scores: scoresDepuisProfil({
        domaine: { N: 72, E: 72, O: 72, A: 72, C: 72 },
        facette: plat
      })
    });
    expect(html).toContain(fr.rapport.tensions.aucune);
  });
});

// ---------------------------------------------------------------------------
// Pages.

const ID = '44444444-4444-4444-8444-444444444444';
const ORG = {
  id: '22222222-2222-4222-8222-222222222222',
  nom: 'Acme',
  slug: 'acme',
  statut: 'active'
};
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';

const rendre = async (page: Promise<unknown>): Promise<string> =>
  renderToStaticMarkup(createElement('div', null, (await page) as never));

const participation = (surcharge: Record<string, unknown> = {}) => ({
  participationId: ID,
  campagneId: CAMPAGNE,
  campagneTitre: 'Cohorte 1',
  campagneStatut: 'close',
  organisationNom: 'Acme',
  organisationSlug: 'acme',
  statut: 'terminee',
  ouverteLe: '2026-10-01T08:00:00Z',
  termineeLe: '2026-10-20T10:00:00Z',
  scores: SCORES_AM,
  scoresIllisibles: false,
  questionnaireVersion: 'b5-120-ma-2026-10',
  calculVersion: 'tenga-somme-1',
  ...surcharge
});

beforeEach(() => {
  loadMaParticipation.mockReset();
  loadOrgPage.mockReset();
  loadCampaigns.mockReset();
  loadCampaigns.mockResolvedValue([]);
  loadResultatsCampagne.mockReset();
  loadResultatIndividuel.mockReset();
  loadCampagneOrganisation.mockReset();
  loadCampagneOrganisation.mockResolvedValue({
    id: CAMPAGNE,
    titre: 'Cohorte 1'
  });
});

describe('page /mes-resultats/[participation]/rapport : audience personne', () => {
  const appeler = (participationId: string): Promise<string> =>
    rendre(
      RapportPersonnePage({
        params: Promise.resolve({
          locale: 'fr',
          participation: participationId
        })
      })
    );

  it('rend le rapport complet de la personne, O6 comprise, blocs non relus masqués', async () => {
    loadMaParticipation.mockResolvedValue(participation());
    const html = await appeler(ID);
    expect(loadMaParticipation).toHaveBeenCalledWith(expect.anything(), ID);
    // Le titre monte mot à mot : on le lit dans le texte de la page.
    expect(texte(html).replace(/\s+/g, ' ')).toContain(
      fr.rapport.personne.titre
    );
    expect(html).toContain('data-carte="O6"');
    expect(html).toContain(fr.rapport.lire.destinatairesPersonne);
    expect(html).toContain(fr.mesResultats.vue.enRelecture);
    expect(html).not.toContain(fr.mesResultats.vue.nonRelu);
  });

  it('identifiant hors format : 404 sans requête', async () => {
    await expect(appeler('pas-un-uuid')).rejects.toThrow('NOT_FOUND');
    expect(loadMaParticipation).not.toHaveBeenCalled();
  });

  it('participation absente ou d’autrui : 404', async () => {
    loadMaParticipation.mockResolvedValue(null);
    await expect(appeler(ID)).rejects.toThrow('NOT_FOUND');
  });

  it('participation sans résultat lisible : 404', async () => {
    loadMaParticipation.mockResolvedValue(participation({ scores: null }));
    await expect(appeler(ID)).rejects.toThrow('NOT_FOUND');
  });
});

describe('pages consultant : liste et lecture', () => {
  const lister = (): Promise<string> =>
    rendre(
      ListeResultatsPage({
        params: Promise.resolve({
          locale: 'fr',
          slug: 'acme',
          campagne: CAMPAGNE
        })
      })
    );
  const lire = (
    participationId: string = ID,
    campagne: string = CAMPAGNE
  ): Promise<string> =>
    rendre(
      LectureResultatPage({
        params: Promise.resolve({
          locale: 'fr',
          slug: 'acme',
          campagne,
          participation: participationId
        })
      })
    );
  const lecture = (surcharge: Record<string, unknown> = {}) => ({
    participationId: ID,
    campagneId: CAMPAGNE,
    organisationId: ORG.id,
    scores: SCORES_AM,
    soumisLe: '2026-10-20T10:00:00Z',
    questionnaireVersion: 'b5-120-ma-2026-10',
    calculVersion: 'tenga-somme-1',
    ...surcharge
  });

  describe('liste', () => {
    it.each([
      ['consultant', { isAdmin: false, role: 'consultant' }],
      ['administrateur Tenga', { isAdmin: true, role: null }]
    ])(
      '%s : lignes opaques, sans identité, avec lien vers la lecture',
      async (_, lecteur) => {
        loadOrgPage.mockResolvedValue({ org: ORG, ...lecteur });
        loadResultatsCampagne.mockResolvedValue([
          { participationId: ID, soumisLe: '2026-10-20T10:00:00Z' },
          {
            participationId: '55555555-5555-4555-8555-555555555555',
            soumisLe: '2026-10-21T10:00:00Z'
          }
        ]);
        const html = await lister();
        expect(loadResultatsCampagne).toHaveBeenCalledWith(
          expect.anything(),
          CAMPAGNE
        );
        expect(html).toContain(`/o/acme/campagnes/${CAMPAGNE}/resultats/${ID}`);
        expect(html).toContain('Résultat 1');
        expect(html).toContain('Résultat 2');
        expect(texte(html)).not.toMatch(/@/);
      }
    );

    it('liste vide : phrase neutre', async () => {
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      loadResultatsCampagne.mockResolvedValue([]);
      expect(await lister()).toContain(fr.rapport.liste.aucun);
    });

    it.each(['responsable', 'participant', null] as const)(
      'rôle %s : 404, la base n’est même pas interrogée',
      async (role) => {
        loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: false, role });
        await expect(lister()).rejects.toThrow('NOT_FOUND');
        expect(loadResultatsCampagne).not.toHaveBeenCalled();
      }
    );

    it('organisation invisible, campagne d’une autre organisation ou refus de la base : 404', async () => {
      loadOrgPage.mockResolvedValue(null);
      await expect(lister()).rejects.toThrow('NOT_FOUND');
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      loadCampagneOrganisation.mockResolvedValue(null);
      await expect(lister()).rejects.toThrow('NOT_FOUND');
      loadCampagneOrganisation.mockResolvedValue({
        id: CAMPAGNE,
        titre: 'Cohorte 1'
      });
      loadResultatsCampagne.mockResolvedValue(null);
      await expect(lister()).rejects.toThrow('NOT_FOUND');
    });
  });

  describe('lecture', () => {
    it('consultant : rapport en audience consultant, O6 absente, lecture par la fonction journalisée', async () => {
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      loadResultatIndividuel.mockResolvedValue(lecture());
      const html = await lire();
      expect(loadResultatIndividuel).toHaveBeenCalledWith(
        expect.anything(),
        ID
      );
      expect(html).toContain(fr.rapport.consultant.titre);
      expect(html).toContain(fr.rapport.lire.destinatairesConsultant);
      expect(html).toContain(fr.mesResultats.vue.nonRelu);
      expect(html).not.toContain(LIBELLE_O6);
      expect(html).not.toContain('O6');
      expect(texte(html)).not.toMatch(/@/);
    });

    it('administrateur Tenga : même vue, O6 absente aussi', async () => {
      loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: true, role: null });
      loadResultatIndividuel.mockResolvedValue(lecture());
      const html = await lire();
      expect(html).not.toContain(LIBELLE_O6);
    });

    it.each(['responsable', 'participant', null] as const)(
      'rôle %s : 404, aucune lecture, donc aucune ligne de journal',
      async (role) => {
        loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: false, role });
        await expect(lire()).rejects.toThrow('NOT_FOUND');
        expect(loadResultatIndividuel).not.toHaveBeenCalled();
      }
    );

    it('identifiants hors format : 404 sans lecture', async () => {
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      await expect(lire('pas-un-uuid')).rejects.toThrow('NOT_FOUND');
      await expect(lire(ID, 'pas-un-uuid')).rejects.toThrow('NOT_FOUND');
      expect(loadResultatIndividuel).not.toHaveBeenCalled();
    });

    it('refus de la base, résultat d’une autre campagne ou d’une autre organisation : 404', async () => {
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      loadResultatIndividuel.mockResolvedValue(null);
      await expect(lire()).rejects.toThrow('NOT_FOUND');
      loadResultatIndividuel.mockResolvedValue(
        lecture({ campagneId: '66666666-6666-4666-8666-666666666666' })
      );
      await expect(lire()).rejects.toThrow('NOT_FOUND');
      loadResultatIndividuel.mockResolvedValue(
        lecture({ organisationId: '77777777-7777-4777-8777-777777777777' })
      );
      await expect(lire()).rejects.toThrow('NOT_FOUND');
    });

    it('format de scores antérieur : message, pas de rapport', async () => {
      loadOrgPage.mockResolvedValue({
        org: ORG,
        isAdmin: false,
        role: 'consultant'
      });
      loadResultatIndividuel.mockResolvedValue(lecture({ scores: null }));
      const html = await lire();
      expect(html).toContain(fr.mesResultats.formatAnterieur);
      expect(html).not.toContain('data-section="ensemble"');
    });
  });
});

describe('page /o/[slug] : lien « Résultats » par campagne', () => {
  const campagne = (
    id: string,
    statut: 'brouillon' | 'ouverte' | 'close'
  ): Record<string, string> => ({
    id,
    titre: `Campagne ${id.slice(0, 4)}`,
    langue: 'fr',
    statut,
    cree_le: '2026-10-01T00:00:00Z'
  });
  const IDS = {
    brouillon: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    ouverte: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    close: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  };
  const page = (): Promise<string> =>
    rendre(
      OrganizationPage({
        params: Promise.resolve({ locale: 'fr', slug: 'acme' })
      })
    );
  const lien = (id: string): string => `/o/acme/campagnes/${id}/resultats`;

  beforeEach(() => {
    loadCampaigns.mockResolvedValue([
      campagne(IDS.brouillon, 'brouillon'),
      campagne(IDS.ouverte, 'ouverte'),
      campagne(IDS.close, 'close')
    ]);
  });

  it('administrateur Tenga : un lien par campagne ouverte ou close, pas pour un brouillon', async () => {
    loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: true, role: null });
    const html = await page();
    expect(html).toContain(lien(IDS.ouverte));
    expect(html).toContain(lien(IDS.close));
    expect(html).not.toContain(lien(IDS.brouillon));
    expect(html).toContain(`>${fr.rapport.liste.lien}</a>`);
  });

  it('responsable : aucun lien « Résultats »', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'responsable'
    });
    const html = await page();
    expect(html).not.toContain('/resultats');
    expect(html).not.toContain(`>${fr.rapport.liste.lien}</a>`);
  });
});
