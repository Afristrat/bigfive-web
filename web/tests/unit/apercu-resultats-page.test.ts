import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { facetLabel } from '@/lib/domain-labels';
import fr from '@/messages/fr.js';

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
  Link: (props: {
    href: string;
    children?: unknown;
    className?: string;
    'aria-current'?: 'page';
  }) =>
    createElement(
      'a',
      {
        href: props.href,
        className: props.className,
        'aria-current': props['aria-current']
      },
      props.children as never
    )
}));

const requireAdmin = vi.fn();
vi.mock('@/lib/session', () => ({
  requireAdmin: (locale: string, path: string) => requireAdmin(locale, path)
}));

import ApercuResultatsPage from '@/app/[locale]/admin/apercu-resultats/page';

const ADMIN = { id: 'a', email: 'x@tenga.test', accessToken: 't' };
const racine = resolve(__dirname, '../..');

type Recherche = Record<string, string | string[] | undefined>;
const rendre = async (
  recherche: Recherche = {},
  locale = 'fr'
): Promise<string> => {
  const element = (await ApercuResultatsPage({
    params: Promise.resolve({ locale }),
    searchParams: Promise.resolve(recherche)
  })) as ReactElement;
  return renderToStaticMarkup(element);
};

let avant: string | undefined;
beforeEach(() => {
  requireAdmin.mockReset().mockResolvedValue(ADMIN);
  avant = process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
});
afterEach(() => {
  if (avant === undefined) delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  else process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = avant;
});

const nbOccurrences = (texte: string, motif: string): number =>
  texte.split(motif).length - 1;

describe('accès : super administrateurs seulement', () => {
  it('vérifie l’administrateur Tenga sur le chemin de la page', async () => {
    await rendre();
    expect(requireAdmin).toHaveBeenCalledWith('fr', '/admin/apercu-resultats');
  });

  it('un non-administrateur reçoit le 404 uniforme, sans rien rendre', async () => {
    requireAdmin.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(rendre()).rejects.toThrow('NOT_FOUND');
  });

  it('n’autorise rien d’autre que cette vérification (source)', () => {
    const source = readFileSync(
      resolve(racine, 'src/app/[locale]/admin/apercu-resultats/page.tsx'),
      'utf8'
    );
    expect(source).toContain('requireAdmin(');
    expect(source).not.toMatch(
      /requireViewer|userClient|serviceClient|\.rpc\(/
    );
    expect(source).not.toContain('process.env');
    expect(source).not.toMatch(/supabase|mongodb/i);
  });
});

describe('bandeau et navigation', () => {
  it.each(['participant', 'consultant', 'groupe'])(
    '%s : le bandeau « données fictives » est présent',
    async (vue) => {
      const html = await rendre({ vue });
      expect(html).toContain(fr.apercu.bandeau);
      expect(fr.apercu.bandeau).toBe(
        'Données fictives : aucun compte, aucune donnée réelle'
      );
    }
  );

  it('propose les trois audiences et les quatre profils en liens', async () => {
    const html = await rendre({ vue: 'consultant', profil: 'SR' });
    for (const vue of ['participant', 'consultant', 'groupe']) {
      expect(html).toContain(`href="/admin/apercu-resultats?vue=${vue}`);
    }
    for (const p of ['AM', 'KB', 'SR', 'HT']) {
      expect(html).toContain(`profil=${p}`);
    }
  });

  it('marque la vue et le profil courants', async () => {
    const html = await rendre({ vue: 'consultant', profil: 'SR' });
    expect(nbOccurrences(html, 'aria-current="page"')).toBe(2);
  });

  it('réglages invalides : participant, AM', async () => {
    const html = await rendre({ vue: 'x', profil: 'y' });
    expect(html).toContain('data-vue="participant"');
    expect(html).toContain('data-profil="AM"');
  });
});

describe('vue participant (audience personne)', () => {
  it('rend ResultView et le rapport individuel, textes en relecture', async () => {
    const html = await rendre({ vue: 'participant', profil: 'KB' });
    expect(html).toContain('data-domaine="O"');
    expect(html).toContain('data-section="lire"');
    expect(html).toContain(fr.mesResultats.vue.enRelecture);
    expect(html).not.toContain(fr.mesResultats.vue.nonRelu);
    expect(html).toContain(facetLabel('O', 6, 'fr'));
  });

  it('la simulation montre les textes avec la mention « non relu »', async () => {
    const html = await rendre({
      vue: 'participant',
      profil: 'KB',
      simulation: 'afficher'
    });
    expect(html).toContain(fr.mesResultats.vue.nonRelu);
    expect(html).not.toContain(fr.mesResultats.vue.enRelecture);
  });

  it('la simulation ne change aucune variable d’environnement', async () => {
    await rendre({ vue: 'participant', simulation: 'afficher' });
    expect(process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES).toBeUndefined();
  });

  it('propose le réglage de simulation (lien) avec son état', async () => {
    const sans = await rendre({ vue: 'participant' });
    expect(sans).toContain('simulation=afficher');
    const avecSimulation = await rendre({
      vue: 'participant',
      simulation: 'afficher'
    });
    expect(avecSimulation).toContain(fr.apercu.simulationOn);
  });
});

describe('structure', () => {
  it.each(['participant', 'consultant', 'groupe'])(
    '%s : aucun identifiant en double',
    async (vue) => {
      const html = await rendre({ vue });
      const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
      expect(ids.length).toBeGreaterThan(0);
      expect(new Set(ids).size).toBe(ids.length);
    }
  );
});

describe('vue consultant', () => {
  it('montre les blocs non relus avec leur bandeau, sans la facette O6', async () => {
    const html = await rendre({ vue: 'consultant', profil: 'AM' });
    expect(html).toContain(fr.mesResultats.vue.nonRelu);
    expect(html).not.toContain(facetLabel('O', 6, 'fr'));
  });

  it('ne rend que le rapport individuel, comme la vraie page du consultant', async () => {
    const html = await rendre({ vue: 'consultant' });
    expect(html).toContain('data-section="lire"');
    expect(html).not.toContain(fr.apercu.resultatTitre);
  });

  it('ne propose pas le réglage de simulation', async () => {
    const html = await rendre({ vue: 'consultant' });
    expect(html).not.toContain('simulation=afficher');
  });
});

describe('vue groupe', () => {
  it('rend la synthèse : deux groupes publiés, un non publié sans effectif', async () => {
    const html = await rendre({ vue: 'groupe' });
    expect(nbOccurrences(html, fr.synthese.nonPublie)).toBe(1);
    expect(html).toContain('Équipe');
    expect(html).not.toContain('data-domaine=');
    expect(html).not.toContain('data-section="lire"');
  });
});

describe('autres langues', () => {
  it.each(['en', 'ar'])('%s : la page se rend', async (locale) => {
    const html = await rendre({ vue: 'participant' }, locale);
    expect(html.length).toBeGreaterThan(1000);
  });
});
