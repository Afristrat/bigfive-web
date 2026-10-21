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

// Les actions ne sont pas exécutées : seul le rendu du formulaire compte.
vi.mock('@/actions/members', () => ({ inviteMember: vi.fn() }));
vi.mock('@/actions/invitations', () => ({ inviteParticipants: vi.fn() }));
vi.mock('@/actions/campaigns', () => ({
  createCampaign: vi.fn(),
  openCampaign: vi.fn(),
  closeCampaign: vi.fn()
}));

import OrganizationPage from '@/app/[locale]/o/[slug]/page';
import { MemberResult } from '@/components/member-invite-form';

const org = {
  id: '22222222-2222-4222-8222-222222222222',
  nom: 'Acme',
  slug: 'acme',
  statut: 'active'
};

const render = async (): Promise<string> =>
  renderToStaticMarkup(
    createElement(
      'div',
      null,
      await OrganizationPage({
        params: Promise.resolve({ locale: 'fr', slug: 'acme' })
      })
    )
  );

const roleOptions = (html: string): string[] => {
  const select = /<select[^>]*name="role"[^>]*>(.*?)<\/select>/s.exec(html);
  return [...(select?.[1] ?? '').matchAll(/<option value="([^"]+)"/g)].map(
    (match) => match[1] ?? ''
  );
};

beforeEach(() => {
  loadOrgPage.mockReset();
  loadCampaigns.mockReset();
  loadCampaigns.mockResolvedValue([]);
});

describe('page /o/{slug} : formulaire d’accès des membres', () => {
  it('administrateur Tenga : responsable et consultant', async () => {
    loadOrgPage.mockResolvedValue({ org, isAdmin: true, role: null });
    const html = await render();
    expect(html).toContain(fr.members.title);
    expect(roleOptions(html)).toEqual(['responsable', 'consultant']);
  });

  it('responsable de l’organisation : aucun formulaire d’accès des membres (décision I2)', async () => {
    loadOrgPage.mockResolvedValue({ org, isAdmin: false, role: 'responsable' });
    const html = await render();
    expect(html).not.toContain(fr.members.title);
    expect(html).not.toContain('name="emailConfirmation"');
    expect(roleOptions(html)).toEqual([]);
  });

  it('l’aide dit qu’inviter un membre existant change son rôle', async () => {
    loadOrgPage.mockResolvedValue({ org, isAdmin: true, role: null });
    const html = await render();
    expect(html).toContain('son rôle est remplacé');
    expect(html).toMatch(/<select[^>]*aria-describedby="[^"]+-role-aide"/);
    expect(html).toContain('name="emailConfirmation"');
  });

  it('consultant ou participant : 404, aucun formulaire', async () => {
    for (const role of ['consultant', 'participant'] as const) {
      loadOrgPage.mockResolvedValue({ org, isAdmin: false, role });
      await expect(render()).rejects.toThrow('NOT_FOUND');
    }
  });

  it('organisation invisible : 404', async () => {
    loadOrgPage.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('NOT_FOUND');
  });
});

const campaign = (
  id: string,
  titre: string,
  statut: 'brouillon' | 'ouverte' | 'close'
) => ({ id, titre, statut, langue: 'fr', organization_id: org.id });

describe('page /o/{slug} : liste des campagnes et formulaires', () => {
  const load = async (): Promise<string> => {
    loadOrgPage.mockResolvedValue({ org, isAdmin: false, role: 'responsable' });
    loadCampaigns.mockResolvedValue([
      campaign('c1', 'Cohorte A', 'brouillon'),
      campaign('c2', 'Cohorte B', 'ouverte'),
      campaign('c3', 'Cohorte C', 'close'),
      campaign('c4', 'Cohorte D', 'ouverte')
    ]);
    return render();
  };

  it('aucune clé de message manquante ni gabarit non résolu', async () => {
    const html = await load();
    expect(html).not.toMatch(
      /\{(max|titre|count|sent|total|remaining|failed|unprocessed)\}/
    );
  });

  it('le h1 nomme l’organisation et la page', async () => {
    const html = await load();
    expect(html).toMatch(/<h1[^>]*>.*Acme.*Campagnes.*<\/h1>/s);
  });

  it('le tableau a une légende pour les lecteurs d’écran', async () => {
    const html = await load();
    expect(html).toMatch(/<caption[^>]*sr-only[^>]*>/);
    expect(html).toContain(fr.campaigns.tableCaption);
  });

  it('effectifs inconnus : texte lu, plus de tiret nu', async () => {
    const html = await load();
    expect(html).toContain(fr.campaigns.figureUnknown);
    expect(html).not.toMatch(/<td[^>]*chiffres[^>]*>-<\/td>/);
  });

  it('chaque ligne a un en-tête focalisable et UN composant d’actions', async () => {
    const html = await load();
    for (const id of ['c1', 'c2', 'c3', 'c4']) {
      expect(html).toMatch(
        new RegExp(
          `<th[^>]*id="campagne-${id}"[^>]*tabindex="-1"|<th[^>]*tabindex="-1"[^>]*id="campagne-${id}"`
        )
      );
    }
    // brouillon : 1 formulaire ; ouvertes : 1 chacune ; clôturée : aucun.
    const table = /<table.*<\/table>/s.exec(html)?.[0] ?? '';
    expect(table.match(/<form/g)).toHaveLength(3);
  });

  it('région d’annonce persistante au niveau de la liste, avant le tableau', async () => {
    const html = await load();
    const region = html.search(/<div role="status"[^>]*sr-only/);
    expect(region).toBeGreaterThan(-1);
    expect(region).toBeLessThan(html.indexOf('<table'));
  });

  it('une case de clôture par campagne ouverte, nommée par le titre de sa ligne', async () => {
    const html = await load();
    expect(html).toMatch(/aria-labelledby="[^"]+ campagne-c2"/);
    expect(html).toMatch(/aria-labelledby="[^"]+ campagne-c4"/);
  });

  it('titres h2 distincts, un par campagne ouverte', async () => {
    const html = await load();
    const titles = [
      ...html.matchAll(/<h2[^>]*id="inviter-[^"]+"[^>]*>(.*?)<\/h2>/gs)
    ].map((match) => match[1]);
    expect(titles).toHaveLength(2);
    expect(new Set(titles).size).toBe(2);
    expect(titles[0]).toContain('Cohorte B');
  });

  it('plafonds résolus depuis les constantes', async () => {
    const html = await load();
    expect(html).toContain('25 au plus');
    expect(html).toContain('160 caractères au plus');
  });
});

describe('messages du formulaire des membres', () => {
  const labels = {
    requiredLegend: '',
    emailLabel: '',
    confirmLabel: '',
    confirmHelp: '',
    roleLabel: '',
    rolePlaceholder: '',
    roleHelp: '',
    roles: { responsable: '', consultant: '' },
    languageLabel: '',
    languages: { fr: '', ar: '', en: '' },
    working: fr.members.working,
    submit: '',
    invited: fr.members.invited,
    invitedMailFailed: fr.members.invitedMailFailed,
    invalid: fr.members.invalid,
    forbidden: fr.members.forbidden,
    rateLimited: fr.members.rateLimited,
    error: fr.members.error
  };
  const show = (
    status: Parameters<typeof MemberResult>[0]['state']['status'],
    pending = false
  ): string =>
    renderToStaticMarkup(
      createElement(MemberResult, {
        state: { status },
        labels,
        id: 'r',
        pending
      })
    );

  it('région vivante persistante : le conteneur existe au repos, vide', () => {
    expect(show('idle')).toBe(
      '<div id="r" role="status" aria-atomic="true" class="max-w-md"></div>'
    );
  });

  it('un texte distinct par statut', () => {
    const texts = (
      [
        'invited',
        'invited_mail_failed',
        'invalid',
        'forbidden',
        'rate_limited',
        'error'
      ] as const
    ).map((status) => show(status));
    expect(new Set(texts).size).toBe(6);
  });

  it('accès accordé sans e-mail : avertissement, pas une erreur', () => {
    const html = show('invited_mail_failed');
    expect(html).toContain('Accès accordé');
    expect(html).toContain('bg-avis-doux');
    expect(show('forbidden')).toContain('bg-erreur-doux');
    expect(show('invited')).toContain('bg-creux');
  });

  it('en cours : le texte « en cours » remplace le résultat précédent', () => {
    const html = show('forbidden', true);
    expect(html).toContain(fr.members.working);
    expect(html).not.toContain(fr.members.forbidden);
  });
});
