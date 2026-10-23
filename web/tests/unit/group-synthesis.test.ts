import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

type Tree = { [key: string]: string | Tree };
vi.mock('next-intl/server', () => {
  const lookup = (namespace: string, key: string): string => {
    let node: string | Tree | undefined = (fr as Tree)[namespace];
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string') {
      throw new Error(`Message absent ${namespace}.${key}`);
    }
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
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  }
}));

vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; 'aria-label'?: string }) =>
    createElement(
      'a',
      { href: props.href, 'aria-label': props['aria-label'] },
      props.children as string
    )
}));

vi.mock('@/lib/session', () => ({
  requireViewer: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'chef@client.test',
    accessToken: 'aaaa.bbbb.cccc'
  })
}));

const loadOrgPage = vi.fn();
const loadCampaigns = vi.fn();
vi.mock('@/lib/campaign-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/campaign-data')>()),
  loadOrgPage: (viewer: unknown, slug: string) => loadOrgPage(viewer, slug),
  loadCampaigns: () => loadCampaigns(),
  loadCampaignStats: async () => null
}));

const loadSynthese = vi.fn();
vi.mock('@/lib/synthese-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/synthese-data')>()),
  loadSynthese: (viewer: unknown, orgId: string, campaignId: string) =>
    loadSynthese(viewer, orgId, campaignId)
}));

vi.mock('@/actions/members', () => ({ inviteMember: vi.fn() }));
vi.mock('@/actions/invitations', () => ({ inviteParticipants: vi.fn() }));
vi.mock('@/actions/campaigns', () => ({
  createCampaign: vi.fn(),
  openCampaign: vi.fn(),
  closeCampaign: vi.fn()
}));

import OrganizationPage from '@/app/[locale]/o/[slug]/page';
import SynthesePage from '@/app/[locale]/o/[slug]/campagnes/[campagne]/synthese/page';
import {
  GroupSynthesis,
  type SyntheseLabels
} from '@/components/synthese/group-synthesis';
import type { GroupeSynthese } from '@/lib/synthese-data';

const ORG = {
  id: '22222222-2222-4222-8222-222222222222',
  nom: 'Acme',
  slug: 'acme',
  statut: 'active'
};
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';
const G1 = '44444444-4444-4444-8444-444444444444';
const G2 = '55555555-5555-4555-8555-555555555555';

const labels: SyntheseLabels = {
  anonymat: 'MENTION-ANONYMAT',
  repereComplement: 'REPERE-COMPLEMENT',
  groupeCaption: 'Le groupe',
  complementCaption: 'Le reste de la campagne',
  colDomaine: 'Domaine',
  colEffectif: 'Effectif',
  colMoyenne: 'Moyenne',
  colEcartType: 'Écart type',
  ecartTypeAbsent: 'écart type non disponible',
  colNiveau: 'Niveau',
  nonPublie: 'NON-PUBLIE',
  complementNonPublie: 'COMPLEMENT-NON-PUBLIE',
  complementVide: 'COMPLEMENT-VIDE',
  sansMoyenne: 'SANS-MOYENNE',
  dispersion: 'DISPERSION-SANS-ETIQUETTE',
  niveauLecture: 'CONVENTION {niveau}',
  niveaux: {
    bas: 'N-bas',
    plutot_bas: 'N-plutot-bas',
    milieu: 'N-milieu',
    plutot_haut: 'N-plutot-haut',
    haut: 'N-haut'
  },
  aucunGroupe: 'AUCUN-GROUPE'
};

const domaines = (moyenne: number, effectif = 6) =>
  (['N', 'E', 'O', 'A', 'C'] as const).map((domaine) => ({
    domaine,
    effectif,
    moyenne,
    ecartType: 7.5
  }));

const publie: GroupeSynthese = {
  id: G1,
  nom: 'Équipe A',
  publie: true,
  groupe: domaines(72),
  complement: []
};
const nonPublie: GroupeSynthese = {
  id: G2,
  nom: 'Petit groupe',
  publie: false,
  groupe: [],
  complement: []
};

const rendre = (groupes: GroupeSynthese[], locale = 'fr'): string =>
  renderToStaticMarkup(
    createElement(GroupSynthesis, { groupes, locale, labels })
  );

describe('GroupSynthesis', () => {
  it('niveau du groupe : moyenne de domaine divisée par 24, cinq classes du moteur', () => {
    // moyenne par question : 1,5 bas ; 2,5 plutôt bas ; 3 milieu ; 3,5 plutôt haut ; 4,5 haut.
    const cas: [number, string][] = [
      [36, 'N-bas'],
      [60, 'N-plutot-bas'],
      [72, 'N-milieu'],
      [84, 'N-plutot-haut'],
      [108, 'N-haut']
    ];
    for (const [moyenne, attendu] of cas) {
      const html = rendre([{ ...publie, groupe: domaines(moyenne) }]);
      expect(html).toContain(`CONVENTION ${attendu}`);
    }
  });

  it('chaque niveau est précédé de la mention de lecture de convention', () => {
    const html = rendre([publie]);
    expect(html.match(/CONVENTION /g)).toHaveLength(5);
  });

  it('domaines seuls : cinq lignes de domaine, aucune facette', () => {
    const html = rendre([publie]);
    expect(html).toContain('Extraversion');
    expect(html).toContain('Névrosisme');
    expect(
      html.match(/<tbody[^>]*>.*?<\/tbody>/s)?.[0].match(/<tr/g)
    ).toHaveLength(5);
    expect(html).not.toMatch(/facette/i);
  });

  it('écart type en nombre, avec la phrase sans étiquette, et aucune étiquette de dispersion', () => {
    const html = rendre([publie]);
    expect(html).toContain('7,5');
    expect(html).toContain('DISPERSION-SANS-ETIQUETTE');
    expect(html).not.toMatch(
      /homog|hétérog|heterog|dispers[ée]s? (faible|fort)/i
    );
  });

  it('aucune valeur minimale ni maximale rendue', () => {
    const texte = rendre([publie]).replace(/<[^>]*>/g, ' ');
    expect(texte).not.toMatch(/minimum|maximum|\bmin\b|\bmax\b/i);
  });

  it('groupe sans ligne : « non publié », sans effectif ni tableau', () => {
    const html = rendre([nonPublie]);
    expect(html).toContain('NON-PUBLIE');
    expect(html).toContain('Petit groupe');
    expect(html).not.toContain('<table');
    expect(html).not.toContain('Effectif');
  });

  it('ligne complement d’effectif 0 : affichée sans moyenne ni niveau', () => {
    const html = rendre([
      {
        ...publie,
        groupe: domaines(72).slice(0, 1),
        complement: [
          { domaine: 'N', effectif: 0, moyenne: null, ecartType: null }
        ]
      }
    ]);
    expect(html).toContain('COMPLEMENT-VIDE');
    expect(html).toContain('SANS-MOYENNE');
    // Un seul niveau : celui du groupe ; le complément vide n'en porte pas.
    expect(html.match(/CONVENTION /g)).toHaveLength(1);
  });

  it('complément publié : moyenne et niveau affichés', () => {
    const html = rendre([
      {
        ...publie,
        groupe: domaines(72).slice(0, 1),
        complement: domaines(96, 9).slice(0, 1)
      }
    ]);
    expect(html).toContain('Le reste de la campagne');
    expect(html).toContain('CONVENTION N-haut');
  });

  it('groupe publié sans complément : mention neutre, sans raison', () => {
    const html = rendre([publie]);
    expect(html).toContain('COMPLEMENT-NON-PUBLIE');
  });

  it('aucun groupe : message dédié', () => {
    expect(rendre([])).toContain('AUCUN-GROUPE');
  });

  it('un nom de groupe saisi par un tiers est échappé', () => {
    const html = rendre([
      { ...nonPublie, nom: '<img src=x onerror=alert(1)>' }
    ]);
    expect(html).not.toContain('<img');
  });

  it('chaque tableau est nommé par son groupe : légende et région distinctes', () => {
    const html = rendre([
      { ...publie, complement: domaines(96, 9).slice(0, 1) },
      { ...publie, id: G2, nom: 'Équipe B', complement: [] }
    ]);
    const legendes = [
      ...html.matchAll(/<caption[^>]*>([^<]*)<\/caption>/g)
    ].map((m) => m[1]);
    expect(legendes).toHaveLength(3);
    expect(new Set(legendes).size).toBe(3);
    expect(legendes).toContain('Le groupe (Équipe A)');
    expect(legendes).toContain('Le reste de la campagne (Équipe A)');
    expect(legendes).toContain('Le groupe (Équipe B)');
    const regions = [
      ...html.matchAll(/role="region" aria-label="([^"]*)"/g)
    ].map((m) => m[1]);
    expect(regions).toEqual(legendes);
  });

  it('écart type absent : un tiret, avec libellé masqué', () => {
    const html = rendre([
      {
        ...publie,
        groupe: [{ domaine: 'N', effectif: 1, moyenne: 72, ecartType: null }]
      }
    ]);
    expect(html).toMatch(
      /<td class="[^"]*chiffres"><span aria-hidden="true">–<\/span><span class="sr-only">écart type non disponible<\/span><\/td>/
    );
  });

  it('nombres avec chiffres latins en arabe', () => {
    const html = rendre([publie], 'ar');
    expect(html).toContain('72');
    expect(html).not.toMatch(/[٠-٩]/);
  });
});

describe('page de synthèse', () => {
  const params = (over: Partial<{ slug: string; campagne: string }> = {}) => ({
    params: Promise.resolve({
      locale: 'fr',
      slug: 'acme',
      campagne: CAMPAGNE,
      ...over
    })
  });
  const render = async (over?: Parameters<typeof params>[0]): Promise<string> =>
    renderToStaticMarkup(
      createElement('div', null, await SynthesePage(params(over)))
    );

  beforeEach(() => {
    loadOrgPage.mockReset();
    loadSynthese.mockReset();
  });

  it('participant : 404, sans lire la synthèse', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'participant'
    });
    await expect(render()).rejects.toThrow('NOT_FOUND');
    expect(loadSynthese).not.toHaveBeenCalled();
  });

  it('organisation invisible : 404', async () => {
    loadOrgPage.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('NOT_FOUND');
  });

  it('identifiant de campagne hors format : 404 sans rien lire', async () => {
    await expect(render({ campagne: 'abc' })).rejects.toThrow('NOT_FOUND');
    expect(loadOrgPage).not.toHaveBeenCalled();
  });

  it('campagne inconnue de l’organisation : 404', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'responsable'
    });
    loadSynthese.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('NOT_FOUND');
  });

  it.each(['responsable', 'consultant'] as const)(
    '%s : synthèse affichée, version du moteur indiquée',
    async (role) => {
      loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: false, role });
      loadSynthese.mockResolvedValue({
        etat: 'prete',
        campagne: { id: CAMPAGNE, titre: 'Cohorte 1' },
        groupes: [publie, nonPublie]
      });
      const html = await render();
      expect(html).toContain(fr.synthese.title);
      expect(html).toContain('Équipe A');
      expect(html).toContain(fr.synthese.nonPublie);
      expect(html).toContain('m-1.0');
      expect(loadSynthese).toHaveBeenCalledWith(
        expect.anything(),
        ORG.id,
        CAMPAGNE
      );
    }
  );

  it('administrateur Tenga non membre : synthèse affichée', async () => {
    loadOrgPage.mockResolvedValue({ org: ORG, isAdmin: true, role: null });
    loadSynthese.mockResolvedValue({
      etat: 'prete',
      campagne: { id: CAMPAGNE, titre: 'Cohorte 1' },
      groupes: [publie]
    });
    expect(await render()).toContain('Équipe A');
  });

  it('campagne non close : message de disponibilité à la clôture, aucun tableau', async () => {
    loadOrgPage.mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'responsable'
    });
    loadSynthese.mockResolvedValue({
      etat: 'non_close',
      campagne: { id: CAMPAGNE, titre: 'Cohorte 1' }
    });
    const html = await render();
    expect(html).toContain('La synthèse sera disponible à la clôture');
    expect(html).not.toContain('<table');
  });
});

describe('page d’organisation : lien « Synthèse »', () => {
  const campagne = (id: string, statut: string, titre: string) => ({
    id,
    titre,
    langue: 'fr',
    statut,
    cree_le: '2026-10-01T00:00:00Z'
  });
  const OUVERTE = '77777777-7777-4777-8777-777777777777';

  it('un lien par campagne close, aucun pour les autres', async () => {
    loadOrgPage.mockReset().mockResolvedValue({
      org: ORG,
      isAdmin: false,
      role: 'responsable'
    });
    loadCampaigns
      .mockReset()
      .mockResolvedValue([
        campagne(CAMPAGNE, 'close', 'Cohorte 1'),
        campagne(OUVERTE, 'ouverte', 'Cohorte 2'),
        campagne(G1, 'brouillon', 'Cohorte 3')
      ]);
    const html = renderToStaticMarkup(
      createElement(
        'div',
        null,
        await OrganizationPage({
          params: Promise.resolve({ locale: 'fr', slug: 'acme' })
        })
      )
    );
    const liens = [...html.matchAll(/<a href="([^"]*synthese)"/g)].map(
      (m) => m[1]
    );
    expect(liens).toEqual([`/fr/o/acme/campagnes/${CAMPAGNE}/synthese`]);
    expect(html).toContain(fr.synthese.lien);
  });
});
