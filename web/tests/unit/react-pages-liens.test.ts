import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

// Liens de sortie des pages de résultats et de synthèse, lien vers le rapport,
// alignement du score d'une facette. Le catalogue français réel est lu : une clé
// absente lève.
type Tree = { [key: string]: string | Tree };
const chercher = (namespace: string, key: string): string => {
  let node: string | Tree | undefined = (fr as Tree)[namespace];
  for (const part of key.split('.')) {
    node = typeof node === 'object' ? node[part] : undefined;
  }
  if (typeof node !== 'string') {
    throw new Error(`Message absent ${namespace}.${key}`);
  }
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
  Link: (props: { href: string; children?: unknown }) =>
    createElement('a', { href: props.href }, props.children as never)
}));
vi.mock('@/lib/session', () => ({
  requireViewer: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'lecteur@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  })
}));

const loadMaParticipation = vi.fn();
vi.mock('@/lib/mes-resultats-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mes-resultats-data')>()),
  loadMaParticipation: (viewer: unknown, id: string) =>
    loadMaParticipation(viewer, id)
}));
vi.mock('@/lib/moteur', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/moteur')>()),
  profilDepuisScores: () => ({})
}));
vi.mock('@/components/resultats/result-view', () => ({
  ResultView: () => createElement('div', { 'data-vue': 'resultat' }),
  libellesResultView: () => ({})
}));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug)
}));
vi.mock('@/lib/consultant-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consultant-data')>()),
  loadCampagneOrganisation: async () => ({ id: CAMPAGNE, titre: 'Cohorte 1' }),
  loadResultatsCampagne: async () => []
}));
vi.mock('@/lib/synthese-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/synthese-data')>()),
  loadSynthese: async () => ({
    etat: 'non_close',
    campagne: { id: CAMPAGNE, titre: 'Cohorte 1' }
  })
}));

import MaParticipationPage from '@/app/[locale]/mes-resultats/[participation]/page';
import ListeResultatsPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/page';
import SynthesePage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/synthese/page';
import { FacetCard } from '@/components/resultats/facet-card';

const ID = '22222222-2222-4222-8222-222222222222';
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';
const ORG = {
  id: '44444444-4444-4444-8444-444444444444',
  nom: 'Acme',
  slug: 'acme',
  statut: 'active'
};

const rendre = async (page: Promise<ReactElement>): Promise<string> =>
  renderToStaticMarkup(createElement('div', null, await page));

const participation = (surcharge: Record<string, unknown> = {}) => ({
  participationId: ID,
  campagneId: CAMPAGNE,
  campagneTitre: 'Cohorte 1',
  campagneStatut: 'close',
  organisationNom: 'Acme',
  organisationSlug: 'acme',
  statut: 'terminee',
  ouverteLe: '2026-10-01T00:00:00Z',
  termineeLe: '2026-10-20T10:00:00Z',
  scores: {},
  scoresIllisibles: false,
  questionnaireVersion: 'b5-120-ma-2026-10',
  calculVersion: 'tenga-somme-1',
  ...surcharge
});

beforeEach(() => {
  loadMaParticipation.mockReset();
  loadOrgPage.mockReset();
});

describe('page « ma participation » : lien vers le rapport', () => {
  const appeler = (): Promise<string> =>
    rendre(
      MaParticipationPage({
        params: Promise.resolve({ locale: 'fr', participation: ID })
      })
    );

  it('avec des scores : lien vers le rapport de cette participation', async () => {
    loadMaParticipation.mockResolvedValue(participation());
    const html = await appeler();
    expect(html).toContain(`href="/mes-resultats/${ID}/rapport"`);
    expect(html).toContain(fr.rapport.personne.titre);
  });

  it.each([
    ['sans résultat', { scores: null }],
    ['résultat illisible', { scores: null, scoresIllisibles: true }]
  ])('%s : aucun lien vers le rapport', async (_nom, surcharge) => {
    loadMaParticipation.mockResolvedValue(participation(surcharge));
    expect(await appeler()).not.toContain('/rapport"');
  });
});

describe('liens de retour des pages consultant', () => {
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
  const synthese = (): Promise<string> =>
    rendre(
      SynthesePage({
        params: Promise.resolve({
          locale: 'fr',
          slug: 'acme',
          campagne: CAMPAGNE
        })
      })
    );

  it.each([
    ['liste des résultats', lister, 'consultant'],
    ['synthèse', synthese, 'consultant']
  ] as const)(
    '%s, consultant : jamais de lien vers /o/<slug> (404 pour lui), retour à son compte',
    async (_nom, page, role) => {
      loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: false, role });
      const html = await page();
      expect(html).not.toContain('href="/o/acme"');
      expect(html).toContain('href="/mon-compte"');
      expect(html).toContain(fr.passation.backToAccount);
    }
  );

  it('synthèse, responsable : retour à la page de l’organisation, qui existe pour lui', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'responsable'
    });
    const html = await synthese();
    expect(html).toContain('href="/o/acme"');
    expect(html).toContain(fr.synthese.retour);
  });

  it.each([
    ['liste des résultats', lister],
    ['synthèse', synthese]
  ] as const)(
    '%s, administrateur Tenga : retour à l’organisation',
    async (_nom, page) => {
      loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: true, role: null });
      const html = await page();
      expect(html).toContain('href="/o/acme"');
      expect(html).not.toContain('href="/mon-compte"');
    }
  );
});

describe('FacetCard : alignement du score', () => {
  const rendreCarte = (locale: string): string =>
    renderToStaticMarkup(
      createElement(FacetCard, {
        label: 'Anxiété',
        score: 12,
        niveau: 'milieu',
        niveauLabel: 'Milieu',
        etat: { etat: 'en_relecture' },
        avertissement: null,
        locale,
        rang: 0,
        labels: {
          facetOutOf: 'sur 20',
          description: 'd',
          apport: 'a',
          cout: 'c',
          question: 'q',
          avertissement: 'av',
          enRelecture: 'r',
          langueAbsente: 'l',
          nonRelu: 'n'
        }
      })
    );

  it('le paragraphe suit le sens de la page (fin logique) ; seul le nombre est isolé en LTR', () => {
    const html = rendreCarte('ar');
    // Le nombre et son plafond forment un bloc posé en fin de ligne logique.
    expect(html).toMatch(/<p class="flex-none">/);
    expect(html).toMatch(/<span dir="ltr"[^>]*>/);
    expect(html).not.toMatch(/<p[^>]*dir="ltr"/);
  });
});
