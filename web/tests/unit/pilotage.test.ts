import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

// Lot R2 : accès « Rapports » de l'en-tête (règles, route serveur, rendu) et
// écrans de pilotage (administration, organisation, résultats d'une campagne,
// synthèse de groupe, aperçus).

type Tree = { [key: string]: string | Tree };

vi.mock('next-intl/server', () => {
  const lookup = (namespace: string | undefined, key: string): string => {
    let node: string | Tree | undefined = namespace
      ? (fr as Tree)[namespace]
      : (fr as Tree);
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string') {
      throw new Error(`Message absent ${namespace ?? ''}.${key}`);
    }
    return node;
  };
  return {
    setRequestLocale: () => undefined,
    getTranslations: async (arg?: string | { namespace?: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg?.namespace;
      return (key: string, values?: Record<string, string>) =>
        lookup(namespace, key).replace(
          /\{(\w+)\}/g,
          (whole, name: string) => values?.[name] ?? whole
        );
    }
  };
});

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));

vi.mock('@/navigation', () => ({
  Link: (props: {
    href: string;
    children?: unknown;
    'aria-label'?: string;
    'aria-current'?: string;
  }) =>
    createElement(
      'a',
      {
        href: props.href,
        'aria-label': props['aria-label'],
        'aria-current': props['aria-current']
      },
      props.children as string
    )
}));

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'consultant@tenga.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const isTengaAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  requireAdmin: async () => VIEWER,
  requireViewer: async () => VIEWER,
  isTengaAdmin: (viewer: unknown) => isTengaAdmin(viewer)
}));

const getUser = vi.fn();
const select = vi.fn();
vi.mock('@/lib/supabase/server', () => ({
  userClient: () => ({ getUser, select })
}));

const loadOrganizations = vi.fn();
vi.mock('@/lib/admin-data', () => ({
  loadOrganizations: () => loadOrganizations(),
  loadJournal: async () => [],
  loadTengaAdmins: async () => []
}));
vi.mock('@/lib/password-locked-accounts', () => ({
  loadLockedAccounts: async () => []
}));
vi.mock('@/actions/admin', () => ({
  addTengaAdmin: vi.fn(),
  assignRole: vi.fn(),
  createOrganization: vi.fn(),
  removeTengaAdmin: vi.fn()
}));
vi.mock('@/actions/password-unlock', () => ({ unlockPassword: vi.fn() }));

const loadOrgPage = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug)
}));
const loadResultatsCampagne = vi.fn();
vi.mock('@/lib/consultant-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/consultant-data')>()),
  loadCampagneOrganisation: async () => ({
    id: CAMPAGNE,
    titre: 'Cohorte 1'
  }),
  loadResultatsCampagne: () => loadResultatsCampagne()
}));

import { GET } from '@/app/api/rapports-menu/route';
import AdminPage from '@/app/[locale]/admin/page';
import ListeResultatsPage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/resultats/page';
import { RapportsBarre, RapportsMenuMobile } from '@/components/rapports-menu';
import {
  GroupSynthesis,
  libellesSynthese
} from '@/components/synthese/group-synthesis';
import {
  construireMenuRapports,
  estPageCourante,
  type FaitsRapports,
  type LibellesRapports,
  type MenuRapports
} from '@/lib/rapports-menu';
import { ACCESS_COOKIE } from '@/lib/session-cookies';
import type { GroupeSynthese } from '@/lib/synthese-data';

const ORG_A = '22222222-2222-4222-8222-222222222222';
const ORG_B = '33333333-3333-4333-8333-333333333333';
const CAMPAGNE = '44444444-4444-4444-8444-444444444444';
const OUVERTE = '55555555-5555-4555-8555-555555555555';
const CLOSE = '66666666-6666-4666-8666-666666666666';

const libelles: LibellesRapports = {
  admin: 'ADMIN',
  organisations: 'ORGANISATIONS',
  apercuResultats: 'APERCU-RESULTATS',
  apercuRapport: 'APERCU-RAPPORT',
  campagnes: 'CAMPAGNES',
  resultats: 'RESULTATS',
  synthese: 'SYNTHESE',
  parcours: 'PARCOURS',
  mesResultats: 'MES-RESULTATS',
  mesBinomes: 'MES-BINOMES',
  roles: {
    responsable: 'R-RESPONSABLE',
    consultant: 'R-CONSULTANT',
    participant: 'R-PARTICIPANT'
  }
};

const faits = (surcharge: Partial<FaitsRapports> = {}): FaitsRapports => ({
  admin: false,
  appartenances: [],
  campagnes: [],
  ...surcharge
});

const campagnes = [
  {
    id: CAMPAGNE,
    titre: 'Brouillon',
    statut: 'brouillon' as const,
    organisationId: ORG_A
  },
  {
    id: OUVERTE,
    titre: 'Cohorte ouverte',
    statut: 'ouverte' as const,
    organisationId: ORG_A
  },
  {
    id: CLOSE,
    titre: 'Cohorte close',
    statut: 'close' as const,
    organisationId: ORG_A
  }
];

const hrefs = (menu: MenuRapports): string[] =>
  menu.flatMap((s) => s.entrees.map((e) => e.href));

describe('menu « Rapports » : règles', () => {
  it('visiteur ou compte sans rôle : aucune section', () => {
    expect(construireMenuRapports(faits(), libelles)).toEqual([]);
  });

  it('super administrateur : organisations et deux aperçus', () => {
    const menu = construireMenuRapports(faits({ admin: true }), libelles);
    expect(menu).toHaveLength(1);
    expect(menu[0]?.titre).toBe('ADMIN');
    expect(hrefs(menu)).toEqual([
      '/admin',
      '/admin/apercu-resultats',
      '/admin/apercu-rapport'
    ]);
  });

  it('responsable : page de l’organisation et synthèses closes, jamais de résultats individuels', () => {
    const menu = construireMenuRapports(
      faits({
        appartenances: [
          {
            organisationId: ORG_A,
            nom: 'Acme',
            slug: 'acme',
            role: 'responsable'
          }
        ],
        campagnes
      }),
      libelles
    );
    expect(menu).toHaveLength(1);
    expect(menu[0]?.sousTitre).toBe('R-RESPONSABLE');
    expect(hrefs(menu)).toEqual([
      '/o/acme',
      `/o/acme/campagnes/${CLOSE}/synthese`
    ]);
    expect(hrefs(menu).join(' ')).not.toContain('/resultats');
  });

  it('consultant : résultats des campagnes lancées, synthèse des closes, ni brouillon ni page d’organisation', () => {
    const menu = construireMenuRapports(
      faits({
        appartenances: [
          {
            organisationId: ORG_A,
            nom: 'Acme',
            slug: 'acme',
            role: 'consultant'
          }
        ],
        campagnes
      }),
      libelles
    );
    expect(hrefs(menu)).toEqual([
      `/o/acme/campagnes/${OUVERTE}/resultats`,
      `/o/acme/campagnes/${CLOSE}/resultats`,
      `/o/acme/campagnes/${CLOSE}/synthese`
    ]);
    expect(menu[0]?.entrees[0]).toMatchObject({
      libelle: 'Cohorte ouverte',
      detail: 'RESULTATS'
    });
    expect(hrefs(menu)).not.toContain('/o/acme');
    expect(hrefs(menu).join(' ')).not.toContain(CAMPAGNE);
  });

  it('consultant sans campagne lancée : aucune section vide', () => {
    const menu = construireMenuRapports(
      faits({
        appartenances: [
          {
            organisationId: ORG_A,
            nom: 'Acme',
            slug: 'acme',
            role: 'consultant'
          }
        ],
        campagnes: [campagnes[0]!]
      }),
      libelles
    );
    expect(menu).toEqual([]);
  });

  it('participant : mes résultats et mes binômes, rien d’autre', () => {
    const menu = construireMenuRapports(
      faits({
        appartenances: [
          {
            organisationId: ORG_B,
            nom: 'Borj',
            slug: 'borj',
            role: 'participant'
          }
        ],
        campagnes
      }),
      libelles
    );
    expect(menu.map((s) => s.titre)).toEqual(['PARCOURS']);
    expect(hrefs(menu)).toEqual(['/mes-resultats', '/mes-resultats/binomes']);
  });

  it('page courante : chemin avec ou sans préfixe de langue', () => {
    expect(estPageCourante('/admin', '/fr/admin')).toBe(true);
    expect(estPageCourante('/admin', '/admin')).toBe(true);
    expect(estPageCourante('/admin', '/fr/admin/apercu-resultats')).toBe(false);
  });
});

describe('route /api/rapports-menu', () => {
  const appel = (locale: string, jeton?: string) =>
    GET(
      new NextRequest(`https://tenga.test/api/rapports-menu?locale=${locale}`, {
        headers: jeton ? { cookie: `${ACCESS_COOKIE}=${jeton}` } : {}
      })
    );
  const corps = async (r: Response) =>
    (await r.json()) as { sections: MenuRapports };

  beforeEach(() => {
    getUser.mockReset().mockResolvedValue({
      id: VIEWER.id,
      email: VIEWER.email
    });
    select.mockReset();
    isTengaAdmin.mockReset().mockResolvedValue(false);
  });

  it('langue inconnue : 400, liste vide', async () => {
    const r = await appel('xx', 'jeton');
    expect(r.status).toBe(400);
    expect((await corps(r)).sections).toEqual([]);
    expect(getUser).not.toHaveBeenCalled();
  });

  it('visiteur : liste vide, sans appel à GoTrue ni à la base, jamais en cache', async () => {
    const r = await appel('fr');
    expect(r.status).toBe(200);
    expect((await corps(r)).sections).toEqual([]);
    expect(r.headers.get('cache-control')).toContain('no-store');
    expect(getUser).not.toHaveBeenCalled();
    expect(select).not.toHaveBeenCalled();
  });

  it('jeton refusé : liste vide, la base n’est pas lue', async () => {
    getUser.mockResolvedValue(null);
    const r = await appel('fr', 'perime');
    expect((await corps(r)).sections).toEqual([]);
    expect(select).not.toHaveBeenCalled();
  });

  it('consultant : rôle lu en base avec son identité, libellés traduits', async () => {
    select.mockImplementation(async (table: string) => {
      if (table === 'memberships') {
        return [{ organization_id: ORG_A, role: 'consultant' }];
      }
      if (table === 'organizations') {
        return [{ id: ORG_A, nom: 'Acme', slug: 'acme' }];
      }
      return [
        {
          id: CLOSE,
          titre: 'Cohorte close',
          statut: 'close',
          organization_id: ORG_A
        }
      ];
    });
    const r = await appel('fr', VIEWER.accessToken);
    const { sections } = await corps(r);
    expect(sections).toHaveLength(1);
    expect(sections[0]).toMatchObject({
      titre: 'Acme',
      sousTitre: fr.roles.consultant
    });
    expect(sections[0]?.entrees.map((e) => e.detail)).toEqual([
      fr.pilotage.menu.resultats,
      fr.synthese.title
    ]);
    // La liste des campagnes ne demande que celles déjà lancées.
    const requeteCampagnes = select.mock.calls.find(
      ([table]) => table === 'campaigns'
    )?.[1] as string;
    expect(requeteCampagnes).toContain(`organization_id=in.(${ORG_A})`);
    expect(requeteCampagnes).toContain('statut=neq.brouillon');
  });

  it('super administrateur sans appartenance : section d’administration seule', async () => {
    isTengaAdmin.mockResolvedValue(true);
    select.mockResolvedValue([]);
    const { sections } = await corps(await appel('fr', VIEWER.accessToken));
    expect(sections.map((s) => s.titre)).toEqual([fr.account.adminLink]);
    expect(sections[0]?.entrees.map((e) => e.libelle)).toEqual([
      fr.pilotage.menu.organisations,
      fr.apercu.title,
      fr.pilotage.rapportCabinet.titre
    ]);
  });

  it('passerelle indisponible : 503, liste vide', async () => {
    select.mockRejectedValue(new Error('panne'));
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await appel('fr', VIEWER.accessToken);
    expect(r.status).toBe(503);
    expect((await corps(r)).sections).toEqual([]);
    avertir.mockRestore();
  });
});

describe('menu « Rapports » : rendu', () => {
  const sections: MenuRapports = [
    {
      cle: 'org-a',
      titre: 'Acme',
      sousTitre: 'Consultant',
      entrees: [
        {
          href: `/o/acme/campagnes/${CLOSE}/resultats`,
          libelle: 'Cohorte close',
          detail: 'Résultats individuels'
        }
      ]
    }
  ];

  it('sans section, rien n’est rendu (visiteur)', () => {
    expect(
      renderToStaticMarkup(
        createElement(RapportsBarre, {
          sections: [],
          pathname: '/fr',
          libelle: 'Rapports'
        })
      )
    ).toBe('');
    expect(
      renderToStaticMarkup(
        createElement(RapportsMenuMobile, {
          sections: [],
          pathname: '/fr',
          libelle: 'Rapports',
          onChoisir: () => undefined
        })
      )
    ).toBe('');
  });

  it('bouton nommé, panneau nommé, groupe nommé par l’organisation, page courante marquée', () => {
    const html = renderToStaticMarkup(
      createElement(RapportsBarre, {
        sections,
        pathname: `/fr/o/acme/campagnes/${CLOSE}/resultats`,
        libelle: 'Rapports'
      })
    );
    expect(html).toMatch(/<summary[^>]*>Rapports/);
    expect(html).toContain('<nav aria-label="Rapports"');
    expect(html).toMatch(/role="group" aria-labelledby="rapports-org-a"/);
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('Résultats individuels');
  });
});

describe('synthèse de groupe : mention d’anonymat et repère', () => {
  const ligne = (domaine: 'N' | 'E', moyenne: number | null) => ({
    domaine,
    effectif: moyenne === null ? 0 : 8,
    moyenne,
    ecartType: moyenne === null ? null : 6
  });
  const groupe = (
    complement: GroupeSynthese['complement']
  ): GroupeSynthese => ({
    id: '77777777-7777-4777-8777-777777777777',
    nom: 'Équipe A',
    publie: true,
    groupe: [ligne('N', 72), ligne('E', 84)],
    complement
  });
  const t = (cle: string, valeurs?: Record<string, string>): string => {
    const brut = (fr.synthese as Record<string, unknown>)[cle];
    return String(brut).replace(
      /\{(\w+)\}/g,
      (tout, nom: string) => valeurs?.[nom] ?? tout
    );
  };
  const tn = (cle: string): string =>
    String((fr.niveaux as Record<string, unknown>)[cle]);
  const rendre = (g: GroupeSynthese): string =>
    renderToStaticMarkup(
      createElement(GroupSynthesis, {
        groupes: [g],
        locale: 'fr',
        labels: libellesSynthese(t, tn)
      })
    );

  it('la mention d’anonymat et de seuil précède les groupes', () => {
    const html = rendre(groupe([]));
    expect(html).toContain(fr.synthese.anonymat);
    expect(html.indexOf(fr.synthese.anonymat)).toBeLessThan(
      html.indexOf('Équipe A')
    );
  });

  it('complément publié : repère légendé, règles masquées aux lecteurs d’écran', () => {
    const html = rendre(groupe([ligne('N', 96), ligne('E', 60)]));
    expect(html).toContain(fr.synthese.repereComplement);
    const regles = html.match(/<span aria-hidden="true" class="regle-piste/g);
    // Deux domaines dans le groupe, deux dans le complément.
    expect(regles).toHaveLength(4);
  });

  it('complément absent : ni repère ni légende de repère', () => {
    const html = rendre(groupe([]));
    expect(html).not.toContain(fr.synthese.repereComplement);
    expect(html).not.toContain('bg-safran');
  });

  it('intitulés visibles au-dessus de chaque tableau', () => {
    const html = rendre(groupe([ligne('N', 96)]));
    expect(html).toContain(`>${fr.synthese.groupeCaption}</h3>`);
    expect(html).toContain(`>${fr.synthese.complementCaption}</h3>`);
  });
});

describe('administration : organisations', () => {
  beforeEach(() => {
    loadOrganizations.mockReset().mockResolvedValue([
      {
        id: ORG_A,
        nom: 'Acme',
        slug: 'acme',
        statut: 'active',
        creeLe: '2026-10-01T00:00:00Z',
        responsables: 1,
        consultants: 2,
        participants: 12
      }
    ]);
  });
  const rendre = async () =>
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        await AdminPage({ params: Promise.resolve({ locale: 'fr' }) })
      )
    );

  it('chaque organisation mène à sa page, avec un nom de lien qui la cite', async () => {
    const html = await rendre();
    expect(html).toContain(
      `<a href="/o/acme" aria-label="${fr.pilotage.admin.ouvrirAria.replace('{nom}', 'Acme')}"`
    );
  });

  it('les deux aperçus sont nommés par le catalogue, dans la langue de la page', async () => {
    const html = await rendre();
    expect(html).toContain('href="/admin/apercu-resultats"');
    expect(html).toContain('href="/admin/apercu-rapport"');
    expect(html).toContain(fr.apercu.title);
    expect(html).toContain(fr.pilotage.rapportCabinet.titre);
  });

  it('effectifs par rôle écrits en clair', async () => {
    const html = await rendre();
    expect(html).toContain(fr.admin.colParticipants);
    expect(html).toContain('>12</dd>');
  });
});

describe('résultats d’une campagne : fiches', () => {
  beforeEach(() => {
    loadOrgPage.mockReset().mockResolvedValue({
      org: { id: ORG_A, nom: 'Acme', slug: 'acme', statut: 'active' },
      isAdmin: false,
      role: 'consultant'
    });
  });
  const rendre = async () =>
    renderToStaticMarkup(
      createElement(
        'div',
        null,
        await ListeResultatsPage({
          params: Promise.resolve({
            locale: 'fr',
            slug: 'acme',
            campagne: CAMPAGNE
          })
        })
      )
    );
  const binomes = `/o/acme/campagnes/${CAMPAGNE}/binomes`;

  it('deux résultats remis ou plus : lien vers la proposition de binôme', async () => {
    loadResultatsCampagne.mockResolvedValue([
      { participationId: OUVERTE, soumisLe: '2026-10-20T10:00:00Z' },
      { participationId: CLOSE, soumisLe: '2026-10-21T10:00:00Z' }
    ]);
    const html = await rendre();
    expect(html).toContain(`href="${binomes}"`);
    expect(html).toContain(fr.binome.proposition.titre);
  });

  it('un seul résultat : pas de proposition de binôme', async () => {
    loadResultatsCampagne.mockResolvedValue([
      { participationId: OUVERTE, soumisLe: '2026-10-20T10:00:00Z' }
    ]);
    expect(await rendre()).not.toContain(binomes);
  });
});

describe('aperçu du rapport cabinet : textes au catalogue', () => {
  it('aucun texte français écrit en dur dans la page', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'src/app/[locale]/admin/apercu-rapport/page.tsx'),
      'utf8'
    );
    expect(source).not.toContain('Aperçu du rapport cabinet');
    expect(source).not.toContain('Télécharger');
    expect(source).not.toMatch(/>\s*[A-ZÉ][a-zéèà]+ [a-zéèà]+/);
  });
});

describe('catalogue « pilotage »', () => {
  const feuilles = (arbre: Tree, prefixe = ''): [string, string][] =>
    Object.entries(arbre).flatMap(([cle, valeur]) =>
      typeof valeur === 'string'
        ? [[`${prefixe}${cle}`, valeur] as [string, string]]
        : feuilles(valeur, `${prefixe}${cle}.`)
    );
  const catalogues = { fr, en, ar } as Record<'fr' | 'en' | 'ar', Tree>;

  it('mêmes clés et mêmes paramètres dans les trois langues', () => {
    const cles = (l: 'fr' | 'en' | 'ar') =>
      feuilles(catalogues[l].pilotage as Tree).map(([c]) => c);
    expect(cles('en')).toEqual(cles('fr'));
    expect(cles('ar')).toEqual(cles('fr'));
    const parametres = (l: 'fr' | 'en' | 'ar') =>
      feuilles(catalogues[l].pilotage as Tree).map(([c, v]) => [
        c,
        [...v.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()
      ]);
    expect(parametres('en')).toEqual(parametres('fr'));
    expect(parametres('ar')).toEqual(parametres('fr'));
  });

  it('ni chaîne vide, ni tiret cadratin ; espace insécable en français', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      for (const [, texte] of feuilles(catalogues[l].pilotage as Tree)) {
        expect(texte.trim()).not.toBe('');
        expect(texte).not.toContain('—');
      }
    }
    for (const [, texte] of feuilles(fr.pilotage as Tree)) {
      expect(texte).not.toMatch(/[^\s ][?!:;]/);
    }
  });

  it('la mention d’anonymat de la synthèse existe dans les trois langues', () => {
    for (const l of ['fr', 'en', 'ar'] as const) {
      const synthese = catalogues[l].synthese as Tree;
      expect(typeof synthese.anonymat).toBe('string');
      expect(typeof synthese.repereComplement).toBe('string');
    }
  });
});
