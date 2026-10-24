import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

// Pages du relevé : écran de la personne (404 uniforme), lien depuis « Mes
// résultats » seulement quand un relevé existe, page du consultant (nombres
// seulement) et export JSON.

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
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));

vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; className?: string }) =>
    createElement(
      'a',
      { href: props.href, className: props.className },
      props.children as never
    ),
  useRouter: () => ({ refresh: () => undefined, push: () => undefined })
}));

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'p@client.test',
  accessToken: 't'
};
const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  requireViewer: (locale: string, path: string) => requireViewer(locale, path),
  isTengaAdmin: async () => false
}));

const loadMesRelevesReseau = vi.fn();
const loadReleveReseau = vi.fn();
const loadReseauCampagne = vi.fn();
const exportReseauCampagne = vi.fn();
vi.mock('@/lib/reseau-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/reseau-data')>()),
  loadMesRelevesReseau: (viewer: unknown) => loadMesRelevesReseau(viewer),
  // Enveloppe tolérante aux pannes : testée seule (reseau-actions.test.ts).
  loadMesRelevesReseauOuVide: (viewer: unknown) => loadMesRelevesReseau(viewer),
  loadReleveReseau: (viewer: unknown, id: string) =>
    loadReleveReseau(viewer, id),
  loadReseauCampagne: (viewer: unknown, id: string) =>
    loadReseauCampagne(viewer, id),
  exportReseauCampagne: (viewer: unknown, id: string) =>
    exportReseauCampagne(viewer, id)
}));

const loadMesParticipations = vi.fn();
vi.mock('@/lib/mes-resultats-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mes-resultats-data')>()),
  loadMesParticipations: (viewer: unknown) => loadMesParticipations(viewer)
}));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug)
}));
const loadCampagneOrganisation = vi.fn();
vi.mock('@/lib/consultant-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consultant-data')>()),
  loadCampagneOrganisation: (viewer: unknown, org: string, id: string) =>
    loadCampagneOrganisation(viewer, org, id)
}));

vi.mock('@/actions/reseau', () => ({
  informerReseau: vi.fn(),
  consentirReseau: vi.fn(),
  repondreReseau: vi.fn(),
  retirerReseau: vi.fn()
}));

import ReleveReseauPage, {
  generateMetadata as metaReleve
} from '@/app/[locale]/mes-resultats/reseau/[participation]/page';
import MesResultatsPage from '@/app/[locale]/mes-resultats/page';
import ReseauConsultantPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/reseau/page';
import { GET as exporter } from '@/app/[locale]/o/[slug]/campagnes/[campagne]/reseau/export/route';

const PART = '66666666-6666-4666-8666-666666666666';
const M1 = '77777777-7777-4777-8777-777777777771';
const ORG = '22222222-2222-4222-8222-222222222222';
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';
const GROUPE = '44444444-4444-4444-8444-444444444444';

const racine = resolve(__dirname, '../..');
const lire = (relatif: string): string =>
  readFileSync(resolve(racine, relatif), 'utf8');

beforeEach(() => {
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  loadMesRelevesReseau.mockReset().mockResolvedValue([]);
  loadReleveReseau.mockReset();
  loadReseauCampagne.mockReset();
  exportReseauCampagne.mockReset();
  loadMesParticipations.mockReset().mockResolvedValue([]);
  loadOrgPage.mockReset().mockResolvedValue({
    org: { id: ORG, nom: 'Acme', slug: 'acme' },
    isAdmin: false,
    role: 'consultant'
  });
  loadCampagneOrganisation
    .mockReset()
    .mockResolvedValue({ id: CAMPAGNE, titre: 'Cohorte 1' });
});

// ---------------------------------------------------------------------------
// Écran de la personne.

const releve = {
  ferme: false,
  nbReponses: 0,
  campagneOuverte: true,
  moi: null,
  membres: [],
  reponses: []
};

const rendreReleve = async (participation = PART): Promise<string> =>
  renderToStaticMarkup(
    (await ReleveReseauPage({
      params: Promise.resolve({ locale: 'fr', participation })
    })) as ReactElement
  );

describe('page du relevé : /mes-resultats/reseau/[participation]', () => {
  it('identifiant hors format : 404 avant toute lecture', async () => {
    await expect(rendreReleve('x')).rejects.toThrow('NOT_FOUND');
    expect(loadReleveReseau).not.toHaveBeenCalled();
  });

  it('interrupteur fermé ou refus de la base : 404 uniforme', async () => {
    loadReleveReseau.mockResolvedValue(null);
    await expect(rendreReleve()).rejects.toThrow('NOT_FOUND');
    expect(requireViewer).toHaveBeenCalledWith(
      'fr',
      `/mes-resultats/reseau/${PART}`
    );
  });

  it('relevé ouvert : l’écran au premier temps, avec l’organisation et la campagne', async () => {
    loadReleveReseau.mockResolvedValue(releve);
    loadMesRelevesReseau.mockResolvedValue([
      {
        participationId: PART,
        organisationNom: 'Acme',
        campagneTitre: 'Cohorte 1',
        campagneStatut: 'ouverte'
      }
    ]);
    const html = await rendreReleve();
    expect(html).toContain('data-etape="information"');
    expect(html).toContain('Acme');
    expect(html).toContain('Cohorte 1');
  });

  it('campagne en préparation : le statut réel atteint l’écran', async () => {
    loadReleveReseau.mockResolvedValue({ ...releve, campagneOuverte: false });
    loadMesRelevesReseau.mockResolvedValue([
      {
        participationId: PART,
        organisationNom: 'Acme',
        campagneTitre: 'Cohorte 1',
        campagneStatut: 'brouillon'
      }
    ]);
    const html = await rendreReleve();
    expect(html).toContain(fr.reseau.brouillon.texte);
    expect(html).not.toContain(fr.reseau.close.titre);
  });

  it('lien de reconnexion qui ramène au relevé', () => {
    expect(
      lire('src/app/[locale]/mes-resultats/reseau/[participation]/page.tsx')
    ).toContain('/connexion?next=${encodeURIComponent(chemin)}');
  });

  it('relevé fermé avec ma ligne : seulement retrait et opposition', async () => {
    loadReleveReseau.mockResolvedValue({
      ferme: true,
      nbReponses: 3,
      campagneOuverte: false,
      moi: {
        informeLe: '2026-10-23T09:00:00Z',
        opposeLe: null,
        accordRepondreLe: '2026-10-23T09:05:00Z',
        accordCarteLe: null
      },
      membres: [],
      reponses: []
    });
    const html = await rendreReleve();
    expect(html).toContain('data-etape="ferme"');
    expect(html).toContain(fr.reseau.retrait.bouton);
    expect(html).not.toContain('<fieldset');
  });

  it('noindex et rendu dynamique', async () => {
    const meta = await metaReleve({
      params: Promise.resolve({ locale: 'fr', participation: PART })
    });
    expect(meta.robots).toEqual({ index: false, follow: false });
    const source = lire(
      'src/app/[locale]/mes-resultats/reseau/[participation]/page.tsx'
    );
    expect(source).toContain("export const dynamic = 'force-dynamic'");
  });
});

// ---------------------------------------------------------------------------
// Lien depuis « Mes résultats ».

const rendreMesResultats = async (): Promise<string> =>
  renderToStaticMarkup(
    (await MesResultatsPage({
      params: Promise.resolve({ locale: 'fr' })
    })) as ReactElement
  );

describe('« Mes résultats » : lien vers le relevé', () => {
  it('aucune ligne (interrupteur fermé) : aucun lien', async () => {
    const html = await rendreMesResultats();
    expect(html).not.toContain('/mes-resultats/reseau/');
    expect(html).not.toContain(fr.reseau.liste.titre);
  });

  it('une ligne : un lien vers le relevé de cette participation', async () => {
    loadMesRelevesReseau.mockResolvedValue([
      {
        participationId: PART,
        organisationNom: 'Acme',
        campagneTitre: 'Cohorte 1',
        campagneStatut: 'ouverte'
      }
    ]);
    const html = await rendreMesResultats();
    expect(html).toContain(`href="/mes-resultats/reseau/${PART}"`);
    expect(html).toContain(fr.reseau.liste.titre);
    expect(html).toContain(`>${fr.reseau.liste.ouvrir}</a>`);
  });

  it('libellés neutres : la liste ignore l’interrupteur, elle ne promet pas de répondre', () => {
    expect(fr.reseau.liste.ouvrir).toBe('Voir mon relevé');
    for (const [lang, motif] of [
      ['fr', /répond|réponse|questions/i],
      ['en', /answer|question/i],
      ['ar', /إجاب|أسئلة|سؤال/]
    ] as const) {
      const catalogue = { fr, en, ar }[lang].reseau.liste;
      for (const cle of ['intro', 'ouvrir', 'ouvrirAria'] as const) {
        expect(catalogue[cle], `${lang} ${cle}`).not.toMatch(motif);
      }
    }
  });

  it('passe par l’enveloppe tolérante aux pannes', () => {
    expect(lire('src/app/[locale]/mes-resultats/page.tsx')).toContain(
      'loadMesRelevesReseauOuVide(viewer)'
    );
  });
});

// ---------------------------------------------------------------------------
// Page du consultant.

const lecture = {
  statut: 'ouverte' as const,
  groupes: [
    {
      groupeId: GROUPE,
      nom: 'Équipe Atlas',
      effectif: 6,
      informes: 5,
      oppositions: 1,
      repondants: 4,
      accordsCarte: 3
    }
  ]
};

// Rendu de reseau_exporter : celui du consultant, sans ligne de personne
// opposée, le nombre d'oppositions par groupe seul.
const rendu = {
  campagne_id: CAMPAGNE,
  campagne_statut: 'ouverte',
  groupes: [
    {
      groupe_id: GROUPE,
      nom: 'Équipe Atlas',
      effectif: 6,
      oppositions: 1,
      membres: [
        {
          participation_id: M1,
          nom: 'Karim Bennani',
          informe: true,
          oppose: false,
          accord_repondre: true,
          accord_carte: true,
          a_repondu: true
        }
      ],
      reponses: []
    }
  ]
};

const paramsConsultant = (surcharge: Record<string, string> = {}) =>
  Promise.resolve({
    locale: 'fr',
    slug: 'acme',
    campagne: CAMPAGNE,
    ...surcharge
  });

const rendreConsultant = async (
  surcharge: Record<string, string> = {}
): Promise<string> =>
  renderToStaticMarkup(
    (await ReseauConsultantPage({
      params: paramsConsultant(surcharge)
    })) as ReactElement
  );

describe('page du consultant : /o/[slug]/campagnes/[campagne]/reseau', () => {
  it('nombres par groupe, aucun nom de personne', async () => {
    loadReseauCampagne.mockResolvedValue(lecture);
    const html = await rendreConsultant();
    for (const n of ['6', '5', '1', '4', '3']) expect(html).toContain(`>${n}<`);
    expect(html).toContain('Équipe Atlas');
    expect(html).not.toContain('Karim');
    expect(html).not.toContain(M1);
    expect(loadReseauCampagne).toHaveBeenCalledWith(VIEWER, CAMPAGNE);
    // Affichage par reseau_lire : la page ne déclenche jamais l'export.
    expect(exportReseauCampagne).not.toHaveBeenCalled();
  });

  it('propose l’export JSON par la route serveur', async () => {
    loadReseauCampagne.mockResolvedValue(lecture);
    const html = await rendreConsultant();
    expect(html).toContain(
      `href="/fr/o/acme/campagnes/${CAMPAGNE}/reseau/export"`
    );
  });

  it('aucun groupe : état vide', async () => {
    loadReseauCampagne.mockResolvedValue({ ...lecture, groupes: [] });
    expect(await rendreConsultant()).toContain(
      fr.reseau.consultant.aucunGroupe
    );
  });

  it('responsable : 404 avant toute lecture du relevé', async () => {
    loadOrgPage.mockResolvedValue({
      org: { id: ORG, nom: 'Acme', slug: 'acme' },
      isAdmin: false,
      role: 'responsable'
    });
    await expect(rendreConsultant()).rejects.toThrow('NOT_FOUND');
    expect(loadReseauCampagne).not.toHaveBeenCalled();
  });

  it('campagne d’une autre organisation, refus de la base, identifiant hors format : 404', async () => {
    loadCampagneOrganisation.mockResolvedValue(null);
    await expect(rendreConsultant()).rejects.toThrow('NOT_FOUND');
    loadCampagneOrganisation.mockResolvedValue({ id: CAMPAGNE, titre: 'C' });
    loadReseauCampagne.mockResolvedValue(null);
    await expect(rendreConsultant()).rejects.toThrow('NOT_FOUND');
    await expect(rendreConsultant({ campagne: 'x' })).rejects.toThrow(
      'NOT_FOUND'
    );
  });
});

describe('export JSON du relevé', () => {
  const appeler = (surcharge: Record<string, string> = {}) =>
    exporter(new Request('https://tenga.test/x'), {
      params: paramsConsultant(surcharge)
    });

  it('rend le rendu de reseau_exporter (export journalisé), en pièce jointe, sans cache', async () => {
    exportReseauCampagne.mockResolvedValue(rendu);
    const reponse = await appeler();
    expect(exportReseauCampagne).toHaveBeenCalledWith(VIEWER, CAMPAGNE);
    // L'export ne passe jamais par la fonction d'affichage.
    expect(loadReseauCampagne).not.toHaveBeenCalled();
    expect(reponse.status).toBe(200);
    expect(reponse.headers.get('Content-Type')).toBe(
      'application/json; charset=utf-8'
    );
    expect(reponse.headers.get('Content-Disposition')).toBe(
      `attachment; filename="reseau-${CAMPAGNE}.json"`
    );
    expect(reponse.headers.get('Cache-Control')).toBe('private, no-store');
    expect(reponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(await reponse.json()).toEqual(rendu);
  });

  it('refus, responsable ou campagne étrangère : 404 sans contenu', async () => {
    exportReseauCampagne.mockResolvedValue(null);
    expect((await appeler()).status).toBe(404);
    loadOrgPage.mockResolvedValue({
      org: { id: ORG, nom: 'Acme', slug: 'acme' },
      isAdmin: false,
      role: 'responsable'
    });
    exportReseauCampagne.mockResolvedValue(rendu);
    exportReseauCampagne.mockClear();
    const refus = await appeler();
    expect(refus.status).toBe(404);
    expect(await refus.text()).not.toContain('Karim');
    // Responsable : refusé avant tout appel, rien n'est journalisé.
    expect(exportReseauCampagne).not.toHaveBeenCalled();
    loadOrgPage.mockResolvedValue(null);
    expect((await appeler()).status).toBe(404);
    expect((await appeler({ campagne: 'x' })).status).toBe(404);
  });

  it('langue inconnue : 404', async () => {
    expect((await appeler({ locale: 'xx' })).status).toBe(404);
  });
});
