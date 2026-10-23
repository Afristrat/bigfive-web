import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { getItems } from '@bigfive-org/questions';
import { afterEach, describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import fr from '@/messages/fr.js';
import { blocFacette } from '@/lib/bibliotheque';
import { calculerScores, profilDepuisScores } from '@/lib/moteur';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';

// Présentation animée du résultat : une seule implémentation, partagée par
// /result/[id], /mes-resultats/[participation] et l'aperçu administrateur.

type Tree = { [key: string]: string | Tree };
const traducteur =
  (catalogue: Tree, espace: string) =>
  (cle: string, valeurs?: Record<string, string>): string => {
    let noeud: string | Tree | undefined = catalogue[espace];
    for (const part of cle.split('.')) {
      noeud = typeof noeud === 'object' ? noeud[part] : undefined;
    }
    if (typeof noeud !== 'string') throw new Error(`Message absent ${cle}`);
    return noeud.replace(
      /\{(\w+)\}/g,
      (tout, nom: string) => valeurs?.[nom] ?? tout
    );
  };
const libellesDe = (catalogue: Tree) =>
  libellesResultView(
    traducteur(catalogue, 'mesResultats'),
    traducteur(catalogue, 'niveaux'),
    traducteur(catalogue, 'flow')
  );

const items = getItems('en');
const profil = profilDepuisScores(
  calculerScores(Object.fromEntries(items.map((i) => [i.id, 3])), 600)
);

const rendre = (props: Partial<Parameters<typeof ResultView>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(ResultView, {
      profil,
      locale: 'fr',
      audience: 'personne',
      libelles: libellesDe(fr as Tree),
      date: null,
      ...props
    })
  );

const nb = (texte: string, motif: string): number =>
  texte.split(motif).length - 1;

afterEach(() => {
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
});

describe('sommaire collant', () => {
  it('étiqueté, avec une ancre vers chacune des trois parties du résultat', () => {
    const html = rendre();
    expect(html).toContain('aria-label="Sommaire du résultat"');
    for (const [id, libelle] of [
      ['profil', 'Profil'],
      ['scores', 'Scores'],
      ['facettes', 'Facettes']
    ]) {
      expect(html, id).toContain(`href="#${id}"`);
      expect(html, id).toContain(`>${libelle}</a>`);
      expect(html, id).toMatch(new RegExp(`<section[^>]* id="${id}"`));
    }
  });

  it('ajoute les ancres fournies par la page après les trois premières', () => {
    const html = rendre({
      ancres: [{ id: 'identifiant', label: 'Identifiant' }],
      children: createElement('div', { id: 'identifiant' })
    });
    const ordre = ['#profil', '#scores', '#facettes', '#identifiant'].map((a) =>
      html.indexOf(`href="${a}"`)
    );
    expect(ordre.every((i) => i >= 0)).toBe(true);
    expect([...ordre].sort((a, b) => a - b)).toEqual(ordre);
  });

  it('arabe : libellés du catalogue arabe', () => {
    const html = rendre({ locale: 'ar', libelles: libellesDe(ar as Tree) });
    expect(html).toContain(`aria-label="${ar.flow.railLabel}"`);
    expect(html).toContain(`>${ar.flow.railScores}</a>`);
  });
});

describe('compteurs, règles graduées et radar', () => {
  it('chaque score porte sa cible : 5 domaines (deux radars + liste) et 30 facettes', () => {
    const html = rendre();
    // Le radar est rendu en deux variantes (large, resserrée) : 2 x 5, plus la liste.
    expect(nb(html, 'data-compte="72"')).toBe(15);
    expect(nb(html, 'data-compte="12"')).toBe(30);
  });

  it('la valeur écrite dans la page est la valeur finale (sans JavaScript)', () => {
    const html = rendre();
    expect(html).toMatch(/data-compte="72"[^>]*>72</);
    expect(html).toMatch(/data-compte="12"[^>]*>12</);
  });

  it('35 règles tracées (5 domaines, 30 facettes), chacune avec trois graduations', () => {
    const html = rendre();
    expect(nb(html, 'animate-tracer')).toBe(35);
    expect(nb(html, 'start-1/4')).toBe(35);
    expect(nb(html, 'start-1/2')).toBe(35);
    expect(nb(html, 'start-3/4')).toBe(35);
  });

  it('le radar se dessine (classes de mouvement) et garde son tableau textuel', () => {
    const html = rendre();
    expect(html).toContain('role="img"');
    expect(html).toMatch(/class="[^"]*radar-aire/);
    expect(html).toContain('<table class="sr-only">');
  });

  it('les lecteurs d’écran reçoivent une phrase complète pour chaque domaine', () => {
    const html = rendre();
    expect(html).toContain('Score 72 sur 120');
  });

  it('les sommes de domaine sont isolées en LTR (arabe compris)', () => {
    const html = rendre({ locale: 'ar', libelles: libellesDe(ar as Tree) });
    expect(html).toMatch(
      /aria-hidden="true" dir="ltr"[^>]*><span[^>]*data-compte="72"/
    );
  });
});

describe('visible sans JavaScript et sous mouvement réduit', () => {
  it('le HTML servi ne masque rien : ni classe d’attente, ni opacité, ni masque en ligne', () => {
    const html = rendre();
    expect(html).not.toMatch(
      /attente|opacity\s*:\s*0|clip-path|(?<![-\w])hidden=/
    );
    expect(html).toContain('data-revele');
  });

  const dossier = join(process.cwd(), 'src', 'components', 'resultats');
  const css = readFileSync(join(dossier, 'result-motion.module.css'), 'utf8');

  it('toute classe animée est neutralisée sous prefers-reduced-motion', () => {
    const bloc = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';
    const reduit = bloc.split('@media print')[0] ?? '';
    const hors = css.split('@media')[0] ?? '';
    const animees = [...hors.matchAll(/\.([a-z-]+)\s*\{[^}]*animation:/g)].map(
      (m) => m[1]
    );
    expect(animees.length).toBeGreaterThanOrEqual(6);
    for (const nom of animees) {
      expect(reduit, nom).toContain(`.${nom}`);
    }
    expect(reduit).toContain('animation: none');
    expect(reduit).toContain('transition: none');
  });

  it('la masque d’attente n’est jamais posé par le CSS seul et s’annule à l’impression', () => {
    const impression = css.split('@media print')[1] ?? '';
    expect(impression).toContain('.attente');
    expect(impression).toContain('opacity: 1');
  });

  it('la courbe est celle des jetons, sans courbe locale', () => {
    expect(css).toContain('var(--courbe)');
    expect(css).not.toMatch(/cubic-bezier|ease-in-out|linear\(/);
  });

  it('le soulignement du sommaire part du bord de début en arabe', () => {
    expect(css).toMatch(/\[dir='rtl'\]\)\s*\.rail-lien::after/);
    expect(css).toContain('transform-origin: right center');
  });

  it('le chef d’orchestre ne fait rien sous mouvement réduit ni sans observateur', () => {
    const source = readFileSync(join(dossier, 'result-motion.tsx'), 'utf8');
    expect(source).toContain('(prefers-reduced-motion: reduce)');
    expect(source).toContain("typeof IntersectionObserver === 'undefined'");
  });
});

describe('une seule implémentation', () => {
  const racine = process.cwd();
  const dossier = join(racine, 'src', 'components', 'resultats');
  const route = join(racine, 'src', 'app', '[locale]', 'result', '[id]');

  it('les composants animés vivent dans components/resultats', () => {
    const fichiers = readdirSync(dossier).sort();
    for (const f of [
      'result-motion.tsx',
      'result-rail.tsx',
      'result-motion.module.css',
      'score-value.tsx',
      'result-header.tsx'
    ]) {
      expect(fichiers, f).toContain(f);
    }
  });

  it('la route /result/[id] n’a plus de copie : ni vue, ni mouvement, ni code du paquet', () => {
    for (const f of [
      'results-view.tsx',
      'result-motion.tsx',
      'result-rail.tsx',
      'result.module.css',
      'domain.tsx',
      'result-body.tsx',
      'domain-tabs.tsx'
    ]) {
      expect(existsSync(join(route, f)), f).toBe(false);
    }
  });

  it('seuls le chef d’orchestre et le sommaire sont des composants client', () => {
    const clients = readdirSync(dossier)
      .filter((f) => f.endsWith('.tsx'))
      .filter((f) =>
        readFileSync(join(dossier, f), 'utf8').startsWith("'use client'")
      )
      .sort();
    expect(clients).toEqual(['result-motion.tsx', 'result-rail.tsx']);
    for (const f of clients) {
      const source = readFileSync(join(dossier, f), 'utf8');
      expect(source, f).not.toMatch(/bibliotheque|server-only|@\/lib\/moteur/);
    }
  });
});

describe('garde de relecture dans la présentation animée', () => {
  const idsBlocs = Object.values(profil.facettes).map((f) => f.blocId);
  const premier = idsBlocs[0];
  if (!premier) throw new Error('profil sans facette');
  const description = (id: (typeof idsBlocs)[number]): string => {
    const etat = blocFacette(id, 'fr', 'consultant');
    if (etat.etat !== 'affiche') throw new Error('bloc attendu');
    return etat.bloc.description[0] ?? '';
  };
  const esc = (t: string): string =>
    t.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');

  it('personne : aucun bloc non relu dans le HTML animé', () => {
    const html = rendre({ audience: 'personne' });
    for (const id of idsBlocs) {
      expect(html, id).not.toContain(esc(description(id)));
    }
  });

  it('personne avec afficherNonRelus : blocs montrés, bandeau conservé', () => {
    const html = rendre({ audience: 'personne', afficherNonRelus: true });
    expect(html).toContain(esc(description(premier)));
    expect(nb(html, 'Texte non relu')).toBe(30);
  });

  it('personne avec afficherNonRelus à faux : blocs masqués même si l’exploitation dit « afficher »', () => {
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = 'afficher';
    const html = rendre({ audience: 'personne', afficherNonRelus: false });
    expect(html).not.toContain(esc(description(premier)));
  });
});
