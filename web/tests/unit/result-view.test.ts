import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getItems } from '@bigfive-org/questions';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/espace/mesResultats.ar.js';
import fr from '@/messages/fr.js';
import { blocFacette, avertissementFacette } from '@/lib/bibliotheque';
import { facetLabel } from '@/lib/domain-labels';
import {
  calculerScores,
  profilDepuisScores,
  type DomainCode,
  type Niveau,
  type ProfilCalcule
} from '@/lib/moteur';

// next-intl/server lit le catalogue réel : une clé absente lève.
type Tree = { [key: string]: string | Tree };
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

const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  requireViewer: (locale: string, path: string) => requireViewer(locale, path),
  isTengaAdmin: async () => false
}));

const loadMesParticipations = vi.fn();
const loadMaParticipation = vi.fn();
vi.mock('@/lib/mes-resultats-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mes-resultats-data')>()),
  loadMesParticipations: (viewer: unknown) => loadMesParticipations(viewer),
  loadMaParticipation: (viewer: unknown, id: string) =>
    loadMaParticipation(viewer, id)
}));

vi.mock('@/lib/account-data', () => ({
  loadAccount: async () => ({ nom: null, langue: 'fr', roles: [] })
}));
vi.mock('@/actions/auth', () => ({ signOutAction: vi.fn() }));
vi.mock('@/components/profile-form', () => ({ ProfileForm: () => null }));

import ListePage from '@/app/[locale]/mes-resultats/page';
import DetailPage from '@/app/[locale]/mes-resultats/[participation]/page';
import AccountPage from '@/app/[locale]/mon-compte/page';
import {
  ResultView,
  type ResultViewLabels
} from '@/components/resultats/result-view';

const items = getItems('en');
const esc = (texte: string): string =>
  texte
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

// Un domaine par niveau : N bas, E plutôt bas, O milieu, A plutôt haut, C haut.
const parDomaine: Record<DomainCode, (rang: number) => number> = {
  N: () => 1,
  E: (rang) => (rang < 12 ? 2 : 3),
  O: () => 3,
  A: (rang) => (rang < 12 ? 4 : 3),
  C: () => 5
};
const reponsesCinqNiveaux = (): Record<string, number> => {
  const rang: Record<string, number> = {};
  return Object.fromEntries(
    items.map((item) => {
      const r = rang[item.domain] ?? 0;
      rang[item.domain] = r + 1;
      return [item.id, parDomaine[item.domain as DomainCode](r)];
    })
  );
};
const profilCinqNiveaux = (): ProfilCalcule =>
  profilDepuisScores(calculerScores(reponsesCinqNiveaux(), 600));
const SCORES_UNIFORMES = calculerScores(
  Object.fromEntries(items.map((item) => [item.id, 3])),
  600
);

const RAIL_FR = (fr as unknown as { flow: Record<string, string> }).flow;
const libellesDe = (
  locale: 'fr' | 'ar',
  vue: ResultViewLabels['vue'],
  niveaux: ResultViewLabels['niveaux']
): ResultViewLabels => ({
  vue,
  niveaux,
  rail: {
    label: RAIL_FR.railLabel ?? '',
    profil: RAIL_FR.railProfile ?? '',
    scores: RAIL_FR.railScores ?? '',
    facettes: RAIL_FR.railDetail ?? ''
  },
  passeLe: locale === 'fr' ? 'Passé le {date}' : 'تم الاختبار في {date}'
});
const LIBELLES_FR = libellesDe(
  'fr',
  (fr as unknown as { mesResultats: { vue: ResultViewLabels['vue'] } })
    .mesResultats.vue,
  (fr as unknown as { niveaux: ResultViewLabels['niveaux'] }).niveaux
);

const rendre = (
  props: Partial<Parameters<typeof ResultView>[0]> = {}
): string =>
  renderToStaticMarkup(
    createElement(ResultView, {
      profil: profilCinqNiveaux(),
      locale: 'fr',
      audience: 'personne',
      libelles: LIBELLES_FR,
      date: null,
      ...props
    })
  );

const NBSP = ' ';

afterEach(() => {
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
});

describe('ResultView : niveaux', () => {
  it('le profil de test couvre bien les cinq niveaux de domaine', () => {
    const niveaux = Object.values(profilCinqNiveaux().domaines).map(
      (d) => d.niveau
    );
    expect(new Set(niveaux).size).toBe(5);
  });

  it('affiche les cinq niveaux en toutes lettres, un par domaine', () => {
    const html = rendre();
    const attendu: Record<DomainCode, [Niveau, string]> = {
      N: ['bas', 'bas'],
      E: ['plutot_bas', 'plutôt bas'],
      O: ['milieu', 'milieu de l’échelle'],
      A: ['plutot_haut', 'plutôt haut'],
      C: ['haut', 'haut']
    };
    for (const [code, [niveau, mot]] of Object.entries(attendu)) {
      const section = html.split(`data-domaine="${code}"`)[1] ?? '';
      const badge = section.match(
        /<span[^>]*data-niveau="([a-z_]+)"[^>]*>([^<]*)<\/span>/
      );
      expect(badge?.[1], code).toBe(niveau);
      expect(badge?.[2], code).toBe(esc(mot));
    }
  });

  it('n’affiche jamais les anciens niveaux du paquet (low, neutral, high)', () => {
    for (const audience of [
      'personne',
      'consultant',
      'administrateur'
    ] as const) {
      expect(rendre({ audience })).not.toMatch(/\b(low|neutral|high)\b/i);
    }
  });

  it('affiche les sommes de domaine sur 120 et les sommes de facette sur 20', () => {
    const html = rendre({
      profil: profilDepuisScores(SCORES_UNIFORMES)
    });
    expect(html).toContain('72');
    expect(html).toContain('sur 120');
    expect(html).toContain('12');
    expect(html).toContain('sur 20');
    expect(html).toContain('role="img"');
  });

  it('nomme les 30 facettes avec le lexique de la marque', () => {
    const html = rendre();
    for (const code of ['N', 'E', 'O', 'A', 'C'] as const) {
      for (const index of [1, 2, 3, 4, 5, 6]) {
        expect(html).toContain(esc(facetLabel(code, index, 'fr')));
      }
    }
  });

  it('indique la version du moteur et la phrase de convention', () => {
    const html = rendre();
    expect(html).toContain('Lecture établie avec le moteur m-1.0');
    expect(html).toContain(
      'Lecture de convention, sans comparaison à un groupe'
    );
  });

  it('affiche la date quand elle est fournie, rien sinon', () => {
    expect(rendre({ date: '2 octobre 2026' })).toContain(
      'Passé le 2 octobre 2026'
    );
    expect(rendre({ date: null })).not.toContain('Passé le');
  });
});

describe('ResultView : blocs de la bibliothèque et textes non relus', () => {
  const profil = profilCinqNiveaux();
  const description = (id: `${keyof ProfilCalcule['facettes']}/${Niveau}`) => {
    const etat = blocFacette(id, 'fr', 'consultant');
    if (etat.etat !== 'affiche') throw new Error('bloc attendu');
    return esc(etat.bloc.description[0] ?? '');
  };
  const idsBlocs = Object.values(profil.facettes).map((f) => f.blocId);

  it('personne : aucun bloc non relu, la mention « texte en relecture » à la place', () => {
    const html = rendre({ audience: 'personne' });
    for (const id of idsBlocs) {
      expect(html, id).not.toContain(description(id));
    }
    expect(html.split(`Texte en relecture${NBSP}:`).length - 1).toBe(30);
    expect(html).not.toContain('Texte non relu');
  });

  it('consultant : tous les blocs, chacun précédé du bandeau « texte non relu »', () => {
    const html = rendre({ audience: 'consultant' });
    for (const id of idsBlocs) {
      expect(html, id).toContain(description(id));
    }
    expect(html.split(`Texte non relu${NBSP}:`).length - 1).toBe(30);
    expect(html).not.toContain('Texte en relecture');
  });

  it('administrateur : même vue que le consultant', () => {
    const html = rendre({ audience: 'administrateur' });
    expect(html.split(`Texte non relu${NBSP}:`).length - 1).toBe(30);
  });

  it('personne avec la variable d’exploitation « afficher » : blocs montrés, bandeau conservé', () => {
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = 'afficher';
    const html = rendre({ audience: 'personne' });
    expect(html).toContain(description(idsBlocs[0] as never));
    expect(html.split(`Texte non relu${NBSP}:`).length - 1).toBe(30);
  });

  it('affiche description, apport, coût et question d’un bloc', () => {
    const html = rendre({ audience: 'consultant' });
    const etat = blocFacette(profil.facettes.N1.blocId, 'fr', 'consultant');
    if (etat.etat !== 'affiche') throw new Error('bloc attendu');
    expect(html).toContain(esc(etat.bloc.apport[0] ?? ''));
    expect(html).toContain(esc(etat.bloc.cout[0] ?? ''));
    expect(html).toContain(esc(etat.bloc.question));
    for (const titre of ['Description', 'Ce que cela apporte']) {
      expect(html).toContain(titre);
    }
  });

  it('affiche l’avertissement d’une facette qui en porte un', () => {
    const avertissement = avertissementFacette('N1', 'fr');
    expect(avertissement).not.toBeNull();
    expect(rendre({ audience: 'personne' })).toContain(
      esc(avertissement ?? '')
    );
  });

  it('langue autre que le français : mention « langue absente » pour chaque facette, aucun texte français', () => {
    const html = rendre({
      locale: 'ar',
      audience: 'consultant',
      libelles: libellesDe(
        'ar',
        (ar as unknown as { vue: ResultViewLabels['vue'] }).vue,
        (fr as unknown as { niveaux: ResultViewLabels['niveaux'] }).niveaux
      )
    });
    const mention = esc(
      (ar as unknown as { vue: { langueAbsente: string } }).vue.langueAbsente
    );
    expect(html.split(mention).length - 1).toBe(30);
    for (const id of idsBlocs) {
      expect(html, id).not.toContain(description(id));
    }
  });
});

describe('ResultView : tensions internes', () => {
  it('aucune section quand aucune tension', () => {
    const html = rendre({ profil: profilDepuisScores(SCORES_UNIFORMES) });
    expect(html).not.toContain('Tensions internes');
  });

  it('liste les tensions avec les libellés des deux facettes et l’écart', () => {
    const reponses = Object.fromEntries(
      items.map((item) => [
        item.id,
        item.domain === 'O' && item.facet === 1
          ? 5
          : item.domain === 'O' && item.facet === 2
            ? 1
            : 3
      ])
    );
    const profil = profilDepuisScores(calculerScores(reponses, null));
    expect(profil.tensions.length).toBeGreaterThan(0);
    const html = rendre({ profil });
    expect(html).toContain('Tensions internes');
    expect(html).toContain(
      `Entre ${esc(facetLabel('O', 1, 'fr'))} et ${esc(facetLabel('O', 2, 'fr'))}${NBSP}: écart de`
    );
  });
});

describe('composants du dossier resultats', () => {
  it('n’importent aucun paquet @bigfive-org/results ni @bigfive-org/score', () => {
    const dossier = join(process.cwd(), 'src', 'components', 'resultats');
    const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.tsx'));
    expect(fichiers.sort()).toEqual([
      'facet-card.tsx',
      'level-badge.tsx',
      'result-header.tsx',
      'result-motion.tsx',
      'result-rail.tsx',
      'result-view.tsx',
      'score-value.tsx'
    ]);
    for (const f of fichiers) {
      expect(readFileSync(join(dossier, f), 'utf8'), f).not.toMatch(
        /@bigfive-org\/(results|score)/
      );
    }
  });
});

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const P1 = '22222222-2222-4222-8222-222222222222';

const participation = (extra: Record<string, unknown> = {}) => ({
  participationId: P1,
  campagneId: '55555555-5555-4555-8555-555555555555',
  campagneTitre: 'Cohorte 2026',
  campagneStatut: 'close',
  organisationNom: 'Atelier Atlas',
  organisationSlug: 'atelier-atlas',
  statut: 'terminee',
  ouverteLe: '2026-10-01T08:00:00+00:00',
  termineeLe: '2026-10-02T09:00:00+00:00',
  scores: SCORES_UNIFORMES,
  questionnaireVersion: 'b5-120-ma-2026-10',
  calculVersion: 'tenga-somme-1',
  scoresIllisibles: false,
  ...extra
});

const rendrePage = async (element: Promise<ReactElement>): Promise<string> =>
  renderToStaticMarkup(await element);

beforeEach(() => {
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  loadMesParticipations.mockReset();
  loadMaParticipation.mockReset();
});

describe('page /mes-resultats', () => {
  const rendreListe = (): Promise<string> =>
    rendrePage(ListePage({ params: Promise.resolve({ locale: 'fr' }) }));

  it('exige une personne connectée', async () => {
    loadMesParticipations.mockResolvedValue([]);
    await rendreListe();
    expect(requireViewer).toHaveBeenCalledWith('fr', '/mes-resultats');
  });

  it('aucune passation : message vide', async () => {
    loadMesParticipations.mockResolvedValue([]);
    expect(await rendreListe()).toContain(
      'Vous n’avez aucune passation pour le moment.'
    );
  });

  it('une ligne par participation, avec campagne, organisation et statut', async () => {
    loadMesParticipations.mockResolvedValue([
      participation(),
      participation({
        participationId: '33333333-3333-4333-8333-333333333333',
        campagneTitre: 'Cohorte 2027',
        statut: 'en_cours',
        campagneStatut: 'ouverte',
        scores: null
      })
    ]);
    const html = await rendreListe();
    for (const texte of [
      'Cohorte 2026',
      'Cohorte 2027',
      'Atelier Atlas',
      'Terminée',
      'En cours'
    ]) {
      expect(html).toContain(texte);
    }
  });

  it('terminée : « Voir » vers le détail', async () => {
    loadMesParticipations.mockResolvedValue([participation()]);
    const html = await rendreListe();
    expect(html).toContain(`href="/mes-resultats/${P1}"`);
    expect(html).toContain('Voir');
    expect(html).not.toContain('/questionnaire');
  });

  it('ouverte et campagne ouverte : « Commencer » vers le questionnaire', async () => {
    loadMesParticipations.mockResolvedValue([
      participation({
        statut: 'ouverte',
        campagneStatut: 'ouverte',
        scores: null,
        termineeLe: null
      })
    ]);
    const html = await rendreListe();
    expect(html).toContain(`href="/mes-resultats/${P1}/questionnaire"`);
    expect(html).toContain('Commencer');
  });

  it('en cours et campagne ouverte : « Reprendre » vers le questionnaire', async () => {
    loadMesParticipations.mockResolvedValue([
      participation({
        statut: 'en_cours',
        campagneStatut: 'ouverte',
        scores: null,
        termineeLe: null
      })
    ]);
    const html = await rendreListe();
    expect(html).toContain(`href="/mes-resultats/${P1}/questionnaire"`);
    expect(html).toContain('Reprendre');
  });

  it('non terminée mais campagne close : « Voir », jamais de lien vers le questionnaire', async () => {
    loadMesParticipations.mockResolvedValue([
      participation({
        statut: 'en_cours',
        campagneStatut: 'close',
        scores: null,
        termineeLe: null
      })
    ]);
    const html = await rendreListe();
    expect(html).not.toContain('/questionnaire');
    expect(html).toContain(`href="/mes-resultats/${P1}"`);
    expect(html).toContain('Campagne close');
  });
});

describe('page /mes-resultats/[participation]', () => {
  const rendreDetail = (id: string): Promise<string> =>
    rendrePage(
      DetailPage({
        params: Promise.resolve({ locale: 'fr', participation: id })
      })
    );

  it('identifiant hors format : 404 sans interroger la base', async () => {
    await expect(rendreDetail('abc')).rejects.toThrow('NOT_FOUND');
    expect(loadMaParticipation).not.toHaveBeenCalled();
  });

  it('participation absente : 404', async () => {
    loadMaParticipation.mockResolvedValue(null);
    await expect(rendreDetail(P1)).rejects.toThrow('NOT_FOUND');
    expect(requireViewer).toHaveBeenCalledWith('fr', `/mes-resultats/${P1}`);
  });

  it('résultat lisible : vue complète à l’audience « personne » (aucun bloc non relu)', async () => {
    loadMaParticipation.mockResolvedValue(participation());
    const html = await rendreDetail(P1);
    expect(html).toContain('Cohorte 2026');
    expect(html).toContain('Atelier Atlas');
    expect(html).toContain('2 octobre 2026');
    expect(html).toContain(`Texte en relecture${NBSP}:`);
    expect(html).not.toContain('Texte non relu');
    expect(html).toContain('Retour à mes résultats');
  });

  it('même présentation animée que le résultat public : sommaire et compteurs', async () => {
    loadMaParticipation.mockResolvedValue(participation());
    const html = await rendreDetail(P1);
    expect(html).toContain('aria-label="Sommaire du résultat"');
    expect(html).toContain('data-compte="72"');
    expect(html).toContain('animate-tracer');
  });

  it('scores illisibles : message de format antérieur, jamais d’erreur', async () => {
    loadMaParticipation.mockResolvedValue(
      participation({ scores: null, scoresIllisibles: true })
    );
    const html = await rendreDetail(P1);
    expect(html).toContain(
      `Résultat enregistré dans un format antérieur${NBSP}: il ne peut pas être affiché ici.`
    );
    expect(html).not.toContain('role="img"');
  });

  it('pas de résultat, campagne ouverte : message et lien pour reprendre', async () => {
    loadMaParticipation.mockResolvedValue(
      participation({
        statut: 'en_cours',
        campagneStatut: 'ouverte',
        scores: null,
        termineeLe: null
      })
    );
    const html = await rendreDetail(P1);
    expect(html).toContain('Aucun résultat pour cette passation.');
    expect(html).toContain(`href="/mes-resultats/${P1}/questionnaire"`);
    expect(html).toContain('Reprendre');
  });

  it('pas de résultat, campagne close : message de clôture, aucun lien de passation', async () => {
    loadMaParticipation.mockResolvedValue(
      participation({
        statut: 'ouverte',
        campagneStatut: 'close',
        scores: null,
        termineeLe: null
      })
    );
    const html = await rendreDetail(P1);
    expect(html).toContain(
      `La campagne est close${NBSP}: cette passation n’a pas été terminée.`
    );
    expect(html).not.toContain('/questionnaire');
  });
});

describe('page /mon-compte', () => {
  it('porte un lien « Mes résultats » vers /mes-resultats', async () => {
    const html = await rendrePage(
      AccountPage({ params: Promise.resolve({ locale: 'fr' }) })
    );
    expect(html).toContain('href="/mes-resultats"');
    expect(html).toContain('Mes résultats');
  });
});
