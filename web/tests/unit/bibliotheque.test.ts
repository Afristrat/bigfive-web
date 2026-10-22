import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  accorder,
  avertissementFacette,
  BIBLIOTHEQUE,
  blocFacette,
  definitionFacette
} from '@/lib/bibliotheque';

const root = resolve(__dirname, '../..');
const source = resolve(
  root,
  '../docs/design/bibliotheque-textes/facettes.json'
);
const copie = resolve(root, 'src/data/bibliotheque-facettes.json');

const sha256 = (path: string): string =>
  createHash('sha256').update(readFileSync(path)).digest('hex');

const DOMAINES = ['N', 'E', 'O', 'A', 'C'] as const;
const CODES = DOMAINES.flatMap((d) =>
  [1, 2, 3, 4, 5, 6].map((i) => `${d}${i}`)
);
const NIVEAUX = ['bas', 'plutot_bas', 'milieu', 'plutot_haut', 'haut'] as const;
const MARQUE = /\{[^{}]*\|[^{}]*\}/;

let avant: string | undefined;
beforeEach(() => {
  avant = process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
});
afterEach(() => {
  if (avant === undefined) delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  else process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = avant;
});

type BrutBloc = {
  description: string[];
  apport: string[];
  cout: string[];
  question: string;
};
type Brut = {
  version: string;
  facettes: { code: string; niveaux: Record<string, { fr: BrutBloc }> }[];
};

describe('copie de la bibliothèque', () => {
  it('a la même empreinte SHA-256 que la source de docs/', () => {
    expect(sha256(copie)).toBe(sha256(source));
  });

  it('expose l’empreinte et la version de la copie', () => {
    expect(BIBLIOTHEQUE.empreinte).toBe(sha256(copie));
    expect(BIBLIOTHEQUE.version).toBe(
      (JSON.parse(readFileSync(copie, 'utf8')) as Brut).version
    );
  });

  it('contient 30 facettes, 5 niveaux chacune, structure 2/2/2/1', () => {
    const brut = JSON.parse(readFileSync(copie, 'utf8')) as Brut;
    expect(brut.facettes.map((f) => f.code)).toEqual(CODES);
    for (const f of brut.facettes) {
      expect(Object.keys(f.niveaux)).toEqual([...NIVEAUX]);
      for (const n of NIVEAUX) {
        const b = f.niveaux[n]?.fr;
        expect(b?.description).toHaveLength(2);
        expect(b?.apport).toHaveLength(2);
        expect(b?.cout).toHaveLength(2);
        expect(typeof b?.question).toBe('string');
      }
    }
  });

  it('se résout pour les 150 identifiants en français', () => {
    for (const c of CODES) {
      for (const n of NIVEAUX) {
        const r = blocFacette(`${c}/${n}` as 'N1/bas', 'fr', 'consultant');
        expect(r.etat, `${c}/${n}`).toBe('affiche');
      }
    }
  });
});

describe('garde de relecture', () => {
  it('masque un bloc non relu à une personne', () => {
    expect(blocFacette('N1/bas', 'fr', 'personne')).toEqual({
      etat: 'en_relecture'
    });
  });

  it('le masque aussi pour toute valeur autre que « afficher »', () => {
    for (const v of ['', 'oui', 'AFFICHER', 'true']) {
      process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = v;
      expect(blocFacette('N1/bas', 'fr', 'personne')).toEqual({
        etat: 'en_relecture'
      });
    }
  });

  it('l’affiche à une personne avec la variable à « afficher », marqué non relu', () => {
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = 'afficher';
    const r = blocFacette('N1/bas', 'fr', 'personne');
    expect(r.etat).toBe('affiche');
    if (r.etat === 'affiche') {
      expect(r.nonRelu).toBe(true);
      expect(r.bloc.description).toHaveLength(2);
      expect(r.bloc.question.length).toBeGreaterThan(0);
    }
  });

  it('l’affiche au consultant et à l’administrateur, marqué non relu', () => {
    for (const a of ['consultant', 'administrateur'] as const) {
      const r = blocFacette('E3/haut', 'fr', a);
      expect(r.etat).toBe('affiche');
      if (r.etat === 'affiche') expect(r.nonRelu).toBe(true);
    }
  });

  it('lit la variable à chaque appel', () => {
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('en_relecture');
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = 'afficher';
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('affiche');
  });
});

describe('langues', () => {
  it('renvoie langue_absente hors du français, avant la garde', () => {
    for (const l of ['ar', 'en', 'es', '']) {
      expect(blocFacette('N1/bas', l, 'consultant')).toEqual({
        etat: 'langue_absente'
      });
      expect(blocFacette('N1/bas', l, 'personne')).toEqual({
        etat: 'langue_absente'
      });
    }
    expect(definitionFacette('N1', 'ar')).toBeNull();
    expect(avertissementFacette('N1', 'en')).toBeNull();
  });

  it('accepte une étiquette régionale fr-MA', () => {
    expect(blocFacette('N1/bas', 'fr-MA', 'consultant').etat).toBe('affiche');
  });
});

describe('définition et avertissement', () => {
  it('renvoient les textes français', () => {
    expect(definitionFacette('N1', 'fr')).toContain('s’inquiéter');
    expect(avertissementFacette('N1', 'fr')).toContain('pas un diagnostic');
  });
});

describe('accord', () => {
  const t = 'Vous êtes {sûr|sûre|sûr(e)} de vous.';

  it('résout m, f, n', () => {
    expect(accorder(t, 'm')).toBe('Vous êtes sûr de vous.');
    expect(accorder(t, 'f')).toBe('Vous êtes sûre de vous.');
    expect(accorder(t, 'n')).toBe('Vous êtes sûr(e) de vous.');
  });

  it('retombe sur la forme sans accord pour une valeur inconnue', () => {
    expect(accorder(t, 'x' as 'm')).toBe('Vous êtes sûr(e) de vous.');
  });

  it('laisse intact un texte sans marquage', () => {
    expect(accorder('Rien à accorder.', 'f')).toBe('Rien à accorder.');
  });

  it('accorde les blocs résolus et ne laisse aucun marquage', () => {
    const f = blocFacette('C5/bas', 'fr', 'consultant', 'f');
    const m = blocFacette('C5/bas', 'fr', 'consultant', 'm');
    const n = blocFacette('C5/bas', 'fr', 'consultant');
    if (f.etat !== 'affiche' || m.etat !== 'affiche' || n.etat !== 'affiche') {
      throw new Error('bloc attendu');
    }
    expect(f.bloc.apport.join(' ')).toContain('ouverte');
    expect(m.bloc.apport.join(' ')).toContain('ouvert ');
    expect(n.bloc.apport.join(' ')).toContain('disponible');
    for (const r of [f, m, n])
      expect(JSON.stringify(r.bloc)).not.toMatch(MARQUE);
  });
});

describe('frontière client', () => {
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((nom) => {
      const p = join(dir, nom);
      if (statSync(p).isDirectory()) return walk(p);
      return /\.(ts|tsx)$/.test(nom) ? [p] : [];
    });
  const IMPORT =
    /from\s*['"](@\/lib\/bibliotheque|(\.{1,2}\/)+(lib\/)?bibliotheque)['"]/;
  const CLIENT = /^(['"])use client\1/;

  it('aucun importeur du module n’est un composant client', () => {
    const importeurs = walk(join(root, 'src')).filter(
      (p) =>
        !p.endsWith('bibliotheque.ts') && IMPORT.test(readFileSync(p, 'utf8'))
    );
    for (const p of importeurs) {
      expect(readFileSync(p, 'utf8').trimStart(), p).not.toMatch(CLIENT);
    }
  });

  it('le module lui-même n’est pas un composant client', () => {
    const src = readFileSync(join(root, 'src/lib/bibliotheque.ts'), 'utf8');
    expect(src.trimStart()).not.toMatch(CLIENT);
  });
});
