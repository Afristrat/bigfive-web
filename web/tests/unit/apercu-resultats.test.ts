import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  APERCU,
  groupesApercu,
  lienApercu,
  lireReglagesApercu,
  nomProfilApercu,
  PROFILS_APERCU,
  scoresApercu
} from '@/lib/apercu-resultats';
import {
  ResultView,
  libellesResultView
} from '@/components/resultats/result-view';
import { construireRapportIndividuel } from '@/lib/rapports/individuel';
import { DOMAINES, lireScores, profilDepuisScores } from '@/lib/moteur';
import fr from '@/messages/fr.js';

const racine = resolve(__dirname, '../..');
const source = resolve(racine, '../docs/design/profils-fictifs/profils.json');
const copie = resolve(racine, 'src/data/apercu-resultats.json');

const sha256 = (chemin: string): string =>
  createHash('sha256').update(readFileSync(chemin)).digest('hex');

type Profil = {
  code: string;
  nom: string;
  domaine: Record<string, number>;
  facette: Record<string, number>;
};

let avant: string | undefined;
beforeEach(() => {
  avant = process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
});
afterEach(() => {
  if (avant === undefined) delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  else process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = avant;
});

describe('copie des données fictives', () => {
  it('reprend à l’identique les profils de docs/ (absent de l’image)', () => {
    const donnees = JSON.parse(readFileSync(copie, 'utf8')) as {
      profils: Profil[];
    };
    const reference = JSON.parse(readFileSync(source, 'utf8')) as Profil[];
    expect(donnees.profils).toEqual(reference);
  });

  it('expose l’empreinte SHA-256 du fichier copié', () => {
    expect(APERCU.empreinte).toBe(sha256(copie));
  });

  it('contient les quatre profils attendus', () => {
    expect(PROFILS_APERCU).toEqual(['AM', 'KB', 'SR', 'HT']);
  });

  it('ne contient aucune adresse', () => {
    expect(readFileSync(copie, 'utf8')).not.toContain('@');
  });
});

describe('scores fictifs', () => {
  it.each(PROFILS_APERCU)('%s : des scores lisibles par le moteur', (code) => {
    const scores = scoresApercu(code);
    expect(lireScores(scores)).toEqual(scores);
    expect(scores.meta.duree_secondes).toBeNull();
  });

  it('les totaux de domaine et de facette suivent profils.json', () => {
    const reference = JSON.parse(readFileSync(source, 'utf8')) as Profil[];
    expect(reference).toHaveLength(4);
    for (const profil of reference) {
      const scores = scoresApercu(profil.code as 'AM');
      for (const d of DOMAINES) {
        expect(scores[d].score).toBe(profil.domaine[d]);
        expect(scores[d].count).toBe(24);
        let somme = 0;
        for (const f of ['1', '2', '3', '4', '5', '6'] as const) {
          const facette = scores[d].facettes[f];
          const valeur = profil.facette[`${d}${f}`] ?? Number.NaN;
          expect(facette.moyenne).toBe(valeur);
          expect(facette.score).toBe(valeur * 4);
          expect(facette.count).toBe(4);
          somme += facette.score;
        }
        expect(somme).toBe(profil.domaine[d]);
      }
    }
  });

  it('nomme les profils', () => {
    expect(nomProfilApercu('KB')).toBe('Karim B.');
    expect(nomProfilApercu('AM')).toMatch(/estimation/i);
  });
});

describe('groupes fictifs', () => {
  const groupes = groupesApercu();

  it('en propose trois, dont exactement un non publié', () => {
    expect(groupes).toHaveLength(3);
    expect(groupes.filter((g) => !g.publie)).toHaveLength(1);
  });

  it('le groupe non publié n’a aucune ligne (donc aucun effectif)', () => {
    const non = groupes.find((g) => !g.publie);
    expect(non?.groupe).toEqual([]);
    expect(non?.complement).toEqual([]);
  });

  it('les groupes publiés ont cinq domaines dans l’ordre du moteur', () => {
    const publies = groupes.filter((g) => g.publie);
    expect(publies).toHaveLength(2);
    for (const g of publies) {
      expect(g.groupe.map((l) => l.domaine)).toEqual([...DOMAINES]);
      for (const l of g.groupe) {
        expect(l.effectif).toBeGreaterThan(0);
        expect(l.moyenne).toBeGreaterThanOrEqual(24);
        expect(l.moyenne).toBeLessThanOrEqual(120);
      }
    }
  });

  it('noms traduits en anglais et en arabe, français par défaut', () => {
    expect(groupesApercu('fr')[0]?.nom).toBe('Équipe Atlas (fictive)');
    expect(groupesApercu('en')[0]?.nom).toBe('Atlas team (fictitious)');
    expect(groupesApercu('ar')[0]?.nom).toBe('فريق أطلس (وهمي)');
    for (const locale of ['en', 'ar']) {
      for (const g of groupesApercu(locale)) {
        expect(g.nom).not.toMatch(/Équipe|fictive/);
      }
    }
  });

  it('les identifiants sont des uuid distincts', () => {
    const ids = groupes.map((g) => g.id);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe('réglages d’URL', () => {
  it('valeurs par défaut : participant, AM avec KB, lu par la personne, sans simulation', () => {
    expect(lireReglagesApercu({})).toEqual({
      vue: 'participant',
      profil: 'AM',
      partenaire: 'KB',
      lecteur: 'personne',
      simulation: false
    });
  });

  it('lit une vue, un profil et la simulation valides', () => {
    expect(
      lireReglagesApercu({
        vue: 'consultant',
        profil: 'HT',
        simulation: 'afficher'
      })
    ).toEqual({
      vue: 'consultant',
      profil: 'HT',
      partenaire: 'KB',
      lecteur: 'personne',
      simulation: true
    });
    expect(lireReglagesApercu({ vue: 'groupe' }).vue).toBe('groupe');
    expect(
      lireReglagesApercu({
        vue: 'binome',
        profil: 'SR',
        partenaire: 'HT',
        lecteur: 'consultant'
      })
    ).toEqual({
      vue: 'binome',
      profil: 'SR',
      partenaire: 'HT',
      lecteur: 'consultant',
      simulation: false
    });
  });

  it('retombe sur les défauts pour toute valeur inconnue ou multiple', () => {
    expect(
      lireReglagesApercu({ vue: 'admin', profil: 'ZZ', simulation: 'oui' })
    ).toEqual({
      vue: 'participant',
      profil: 'AM',
      partenaire: 'KB',
      lecteur: 'personne',
      simulation: false
    });
    expect(lireReglagesApercu({ lecteur: 'responsable' }).lecteur).toBe(
      'personne'
    );
    expect(lireReglagesApercu({ vue: ['groupe', 'consultant'] }).vue).toBe(
      'participant'
    );
    expect(lireReglagesApercu({ profil: 'sr' }).profil).toBe('AM');
  });

  it('le partenaire n’est jamais la première personne', () => {
    expect(lireReglagesApercu({ profil: 'KB' }).partenaire).toBe('AM');
    expect(
      lireReglagesApercu({ profil: 'SR', partenaire: 'SR' }).partenaire
    ).toBe('KB');
    expect(lireReglagesApercu({ partenaire: 'ZZ' }).partenaire).toBe('KB');
  });

  it('construit les liens avec les seuls réglages utiles', () => {
    const defaut = { partenaire: 'HT', lecteur: 'personne' } as const;
    expect(
      lienApercu({
        vue: 'participant',
        profil: 'KB',
        simulation: true,
        ...defaut
      })
    ).toBe(
      '/admin/apercu-resultats?vue=participant&profil=KB&simulation=afficher'
    );
    expect(
      lienApercu({
        vue: 'consultant',
        profil: 'KB',
        simulation: true,
        ...defaut
      })
    ).toBe('/admin/apercu-resultats?vue=consultant&profil=KB');
    expect(
      lienApercu({ vue: 'groupe', profil: 'SR', simulation: false, ...defaut })
    ).toBe('/admin/apercu-resultats?vue=groupe&profil=SR');
    expect(
      lienApercu({
        vue: 'binome',
        profil: 'SR',
        partenaire: 'HT',
        lecteur: 'consultant',
        simulation: true
      })
    ).toBe(
      '/admin/apercu-resultats?vue=binome&profil=SR&partenaire=HT&lecteur=consultant'
    );
  });

  it('binôme : choisir le partenaire comme première personne libère la place', () => {
    expect(
      lienApercu({
        vue: 'binome',
        profil: 'KB',
        partenaire: 'KB',
        lecteur: 'personne',
        simulation: false
      })
    ).toBe(
      '/admin/apercu-resultats?vue=binome&profil=KB&partenaire=AM&lecteur=personne'
    );
  });
});

describe('l’option de simulation traverse les vrais composants', () => {
  const niv = (cle: string): string =>
    (fr.niveaux as Record<string, string>)[cle] ?? cle;
  const mes = (cle: string, valeurs?: Record<string, string>): string => {
    let noeud: unknown = fr.mesResultats;
    for (const part of cle.split('.')) {
      noeud = (noeud as Record<string, unknown>)[part];
    }
    return String(noeud).replace(
      /\{(\w+)\}/g,
      (tout, nom: string) => valeurs?.[nom] ?? tout
    );
  };
  const flow = (cle: string): string =>
    (fr.flow as Record<string, string>)[cle] ?? cle;
  const profil = profilDepuisScores(scoresApercu('AM'));
  const html = (afficherNonRelus?: boolean): string =>
    renderToStaticMarkup(
      createElement(ResultView, {
        profil,
        locale: 'fr',
        audience: 'personne',
        libelles: libellesResultView(mes, niv, flow),
        date: null,
        afficherNonRelus
      })
    );

  it('ResultView : la personne voit les textes quand l’option est vraie', () => {
    expect(html()).toContain(fr.mesResultats.vue.enRelecture);
    expect(html()).not.toContain(fr.mesResultats.vue.nonRelu);
    expect(html(true)).toContain(fr.mesResultats.vue.nonRelu);
    expect(html(true)).not.toContain(fr.mesResultats.vue.enRelecture);
  });

  it('rapport individuel : questions d’entretien et blocs quand l’option est vraie', () => {
    const entree = {
      scores: scoresApercu('AM'),
      locale: 'fr',
      audience: 'personne'
    } as const;
    const sans = construireRapportIndividuel(entree);
    const avec = construireRapportIndividuel({
      ...entree,
      afficherNonRelus: true
    });
    expect(sans.entretien).toEqual([]);
    expect(avec.entretien.length).toBeGreaterThan(0);
    const etats = avec.domaines.flatMap((d) =>
      d.facettes.map((f) => f.etat.etat)
    );
    expect(etats.every((e) => e === 'affiche')).toBe(true);
  });
});
