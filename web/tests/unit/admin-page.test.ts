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
  Link: ({ children }: { children: string }) =>
    createElement('a', null, children)
}));
vi.mock('@/lib/session', () => ({
  requireAdmin: async () => ({
    id: '11111111-1111-4111-8111-111111111111',
    email: 'acteur@tenga.test',
    accessToken: 'aaaa.bbbb.cccc'
  })
}));
vi.mock('@/actions/admin', () => ({
  addTengaAdmin: vi.fn(),
  assignRole: vi.fn(),
  createOrganization: vi.fn(),
  removeTengaAdmin: vi.fn()
}));
const grantProps: { labels?: Record<string, unknown> } = {};
vi.mock('@/components/admin-forms', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/components/admin-forms')>()),
  AdminGrantForm: (props: { labels: Record<string, unknown> }) => {
    grantProps.labels = props.labels;
    return null;
  }
}));
const loadTengaAdmins = vi.fn();
vi.mock('@/lib/admin-data', () => ({
  loadOrganizations: async () => [
    {
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'acme',
      nom: 'Acme',
      statut: 'active',
      creeLe: '2026-10-01T08:00:00+00:00',
      responsables: 1,
      consultants: 0,
      participants: 3
    }
  ],
  loadJournal: async () => [],
  loadTengaAdmins: (viewer: unknown) => loadTengaAdmins(viewer)
}));

import AdminPage from '@/app/[locale]/admin/page';

const ME = '11111111-1111-4111-8111-111111111111';
const NEZHA = '33333333-3333-4333-8333-333333333333';
const admins = [
  {
    userId: ME,
    adresse: 'acteur@tenga.test',
    ajouteLe: '2026-10-01T08:00:00+00:00',
    estMoi: true
  },
  {
    userId: NEZHA,
    adresse: 'nezha@tenga.test',
    ajouteLe: '2026-10-21T09:30:00+00:00',
    estMoi: false
  }
];

const render = async (): Promise<string> =>
  renderToStaticMarkup(
    createElement(
      'div',
      null,
      await AdminPage({ params: Promise.resolve({ locale: 'fr' }) })
    )
  );

beforeEach(() => {
  loadTengaAdmins.mockReset();
  loadTengaAdmins.mockResolvedValue(admins);
});

describe('page /admin : ajout d’un super administrateur (T05 I-2)', () => {
  it('passe les cinq textes propres à l’ajout au formulaire', async () => {
    await render();
    expect(grantProps.labels).toMatchObject({
      working: fr.admin.grantWorking,
      requiredLegend: fr.admin.requiredLegend,
      invalidFields: fr.admin.grantInvalid,
      alreadyAdmin: fr.admin.grantExists,
      failed: fr.admin.grantError
    });
  });
});

describe('page /admin : retrait des super administrateurs', () => {
  it('section titrée (titre focalisable après un retrait), introduction, liste lue avec la session', async () => {
    const html = await render();
    expect(html).toContain(fr.admin.removeTitle);
    expect(html).toMatch(/<h2 id="admins-titre"[^>]*tabindex="-1"/i);
    expect(html).toContain(fr.admin.removeIntro);
    expect(loadTengaAdmins).toHaveBeenCalledWith(
      expect.objectContaining({ accessToken: 'aaaa.bbbb.cccc' })
    );
  });

  it('une ligne par administrateur, la mienne sans bouton', async () => {
    const html = await render();
    expect(html).toContain('nezha@tenga.test');
    expect(html).toContain(`(${fr.admin.removeYou})`);
    expect(html).toContain(
      'Je confirme le retrait de l’accès super administrateur de nezha@tenga.test.'
    );
    expect(html).toContain(
      'aria-label="Retirer l’accès super administrateur de nezha@tenga.test"'
    );
    expect(html).not.toContain(`name="userId" value="${ME}"`);
    expect(html).toContain(`name="userId" value="${NEZHA}"`);
  });

  it('date d’ajout mise en forme dans la langue de la page', async () => {
    expect(await render()).toContain('21 octobre 2026');
  });

  it('liste illisible : message clair, aucun formulaire de retrait, le reste de la page fonctionne', async () => {
    loadTengaAdmins.mockResolvedValue(null);
    const html = await render();
    expect(html).toContain(fr.admin.adminsUnavailable);
    expect(html).not.toContain('name="confirmer"');
    expect(html).toContain(fr.admin.createTitle);
  });
});

describe('page /admin : lot invitations seul', () => {
  it('ne montre aucune section de verrous de mot de passe', async () => {
    const html = await render();
    expect(html).not.toContain('verrous-titre');
    expect(html).toContain('journal-titre');
  });
});
