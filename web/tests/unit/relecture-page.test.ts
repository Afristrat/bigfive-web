import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';
import { empreinteBloc } from '@/lib/bibliotheque';
import type { EvenementRelecture } from '@/lib/relecture-atelier';

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

// Les composants clients importent les actions serveur : remplacées ici.
vi.mock('@/actions/relecture', () => ({
  relireBloc: vi.fn(),
  designerRelecteur: vi.fn(),
  retirerRelecteur: vi.fn()
}));

const requireRelecteur = vi.fn();
const loadHistorique = vi.fn();
const loadFrequences = vi.fn();
const loadRelecteurs = vi.fn();
const estAdministrateur = vi.fn();
vi.mock('@/lib/relecture-data', () => ({
  requireRelecteur: (locale: string, path: string) =>
    requireRelecteur(locale, path),
  loadHistorique: (...args: unknown[]) => loadHistorique(...args),
  loadFrequences: (...args: unknown[]) => loadFrequences(...args),
  loadRelecteurs: (...args: unknown[]) => loadRelecteurs(...args),
  estAdministrateur: (...args: unknown[]) => estAdministrateur(...args)
}));

import RelecturePage from '@/app/[locale]/admin/relecture/page';

const RELECTRICE = { id: 'r', email: 'nezha@tenga.test', accessToken: 't' };
const racine = resolve(__dirname, '../..');

type Recherche = Record<string, string | string[] | undefined>;
const rendre = async (recherche: Recherche = {}): Promise<string> => {
  const element = (await RelecturePage({
    params: Promise.resolve({ locale: 'fr' }),
    searchParams: Promise.resolve(recherche)
  })) as ReactElement;
  return renderToStaticMarkup(element);
};

const evenement = (
  bloc: string,
  verdict: 'relu' | 'a_corriger',
  creeLe = '2026-10-23T09:00:00Z'
): EvenementRelecture => ({
  id: `00000000-0000-4000-8000-0000000000${bloc === 'N1/bas' ? '01' : '02'}`,
  bloc,
  empreinte: empreinteBloc(bloc) ?? '',
  verdict,
  commentaire: verdict === 'a_corriger' ? 'Accord à revoir' : null,
  relecteurNom: 'Nezha',
  relecteurAdresse: 'nezha@tenga.test',
  estMoi: true,
  creeLe
});

const nbBlocs = (html: string): number => html.split('data-bloc="').length - 1;

beforeEach(() => {
  requireRelecteur.mockReset().mockResolvedValue(RELECTRICE);
  loadHistorique.mockReset().mockResolvedValue([]);
  loadFrequences.mockReset().mockResolvedValue([]);
  loadRelecteurs.mockReset().mockResolvedValue([]);
  estAdministrateur.mockReset().mockResolvedValue(false);
});

describe('accès', () => {
  it('vérifie le relecteur sur le chemin de la page', async () => {
    await rendre();
    expect(requireRelecteur).toHaveBeenCalledWith('fr', '/admin/relecture');
  });

  it('une personne qui n’est pas relectrice reçoit le 404 uniforme, sans rien rendre', async () => {
    requireRelecteur.mockRejectedValue(new Error('NOT_FOUND'));
    await expect(rendre()).rejects.toThrow('NOT_FOUND');
    expect(loadHistorique).not.toHaveBeenCalled();
  });

  it('la page ne lit la base que par les chargeurs dédiés (source)', () => {
    const source = readFileSync(
      resolve(racine, 'src/app/[locale]/admin/relecture/page.tsx'),
      'utf8'
    );
    expect(source).toContain('requireRelecteur(');
    expect(source).not.toMatch(/userClient|serviceClient|\.rpc\(/);
    expect(source).not.toContain('process.env');
  });
});

// Chaque rendu compte 150 blocs et leurs formulaires : délai élargi.
describe('blocs et filtres', { timeout: 30_000 }, () => {
  it('par défaut : les 150 blocs à relire, chacun dans son contexte', async () => {
    const html = await rendre();
    expect(nbBlocs(html)).toBe(150);
    expect(html).toContain(fr.relecture.title);
    expect(html).toContain('Inquiétude et appréhension');
    expect(html).toContain('Névrosisme');
    expect(html).toContain('Niveau plutôt bas');
    // Le texte est en français, isolé comme tel (page en arabe comprise).
    expect(html).toContain('lang="fr"');
    expect(html).toContain(
      'Vos réponses indiquent que vous vous inquiétez rarement'
    );
    expect(html).toContain(fr.mesResultats.vue.question);
  });

  it('filtre « relu » : seuls les blocs relus sur leur texte actuel', async () => {
    loadHistorique.mockResolvedValue([
      evenement('N1/bas', 'relu'),
      evenement('E3/haut', 'a_corriger')
    ]);
    const relus = await rendre({ statut: 'relu' });
    expect(nbBlocs(relus)).toBe(1);
    expect(relus).toContain('data-bloc="N1/bas"');
    const aCorriger = await rendre({ statut: 'a_corriger' });
    expect(nbBlocs(aCorriger)).toBe(1);
    expect(aCorriger).toContain('Accord à revoir');
    expect(nbBlocs(await rendre())).toBe(148);
    expect(nbBlocs(await rendre({ statut: 'tous' }))).toBe(150);
  });

  it('avancement : relus sur 150, liens de filtre et d’ordre, sélection courante marquée', async () => {
    loadHistorique.mockResolvedValue([evenement('N1/bas', 'relu')]);
    const html = await rendre({ statut: 'tous', tri: 'catalogue' });
    expect(html).toContain('Blocs relus : 1 sur 150');
    expect(html).toContain(
      'href="/admin/relecture?statut=relu&amp;tri=catalogue"'
    );
    expect(html).toContain('href="/admin/relecture?statut=tous"');
    expect(html).toMatch(/aria-current="page"[^>]*>[^<]*Tous les blocs/);
  });

  it('fréquence : message selon la disponibilité de l’histogramme', async () => {
    expect(await rendre()).toContain('Fréquence observée indisponible');
    loadFrequences.mockResolvedValue([
      { facette: 'N1', score: 13, effectif: 7 }
    ]);
    const html = await rendre({ statut: 'tous' });
    expect(html).toContain('Fréquence observée sur les résultats');
    expect(html).toContain('Résultats à ce niveau');
    // Le bloc le plus affiché passe en tête.
    expect(html.indexOf('data-bloc="N1/milieu"')).toBeLessThan(
      html.indexOf('data-bloc="N1/bas"')
    );
  });

  it('profils fictifs : codes affichés avec le nom fictif accessible', async () => {
    const html = await rendre({ statut: 'tous' });
    expect(html).toMatch(/<abbr[^>]*title="[^"]+"[^>]*>AM<\/abbr>/);
  });

  it('historique indisponible : message, aucun formulaire de verdict', async () => {
    loadHistorique.mockResolvedValue(null);
    const html = await rendre();
    expect(html).toContain(fr.relecture.indisponible);
    expect(nbBlocs(html)).toBe(0);
    expect(html).not.toContain('name="verdict"');
  });

  it('un formulaire de verdict par bloc, avec l’empreinte du texte affiché', async () => {
    const html = await rendre({ statut: 'tous', tri: 'catalogue' });
    expect(html.split('name="verdict"').length - 1).toBe(300);
    expect(html).toContain(`value="${empreinteBloc('N1/bas')}"`);
  });
});

describe('relecteurs désignés', () => {
  it('absents pour une relectrice désignée', async () => {
    const html = await rendre();
    expect(html).not.toContain(fr.relecture.relecteurs.titre);
    expect(loadRelecteurs).not.toHaveBeenCalled();
  });

  it('présents pour un super administrateur, avec la liste', async () => {
    estAdministrateur.mockResolvedValue(true);
    loadRelecteurs.mockResolvedValue([
      {
        userId: '22222222-2222-4222-8222-222222222222',
        adresse: 'nezha@tenga.test',
        ajouteLe: '2026-10-23T09:00:00Z'
      }
    ]);
    const html = await rendre();
    expect(html).toContain(fr.relecture.relecteurs.titre);
    expect(html).toContain('nezha@tenga.test');
    expect(html).toContain('name="email"');
  });

  it('liste indisponible : message, formulaire de désignation conservé', async () => {
    estAdministrateur.mockResolvedValue(true);
    loadRelecteurs.mockResolvedValue(null);
    const html = await rendre();
    expect(html).toContain(fr.relecture.relecteurs.indisponible);
    expect(html).toContain('name="email"');
  });
});
