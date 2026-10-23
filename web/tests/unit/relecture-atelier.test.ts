import { describe, expect, it } from 'vitest';
import { blocsBibliotheque, empreinteBloc } from '@/lib/bibliotheque';
import {
  assemblerAtelier,
  compterStatuts,
  effectifsParBloc,
  lienAtelier,
  lireFiltresAtelier,
  profilsParBloc,
  selectionner,
  type EvenementRelecture
} from '@/lib/relecture-atelier';
import { profilDepuisScores } from '@/lib/moteur';
import { PROFILS_APERCU, scoresApercu } from '@/lib/apercu-resultats';

const blocs = blocsBibliotheque();
let n = 0;
const evenement = (
  bloc: string,
  verdict: 'relu' | 'a_corriger',
  autres: Partial<EvenementRelecture> = {}
): EvenementRelecture => {
  n += 1;
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`,
    bloc,
    empreinte: empreinteBloc(bloc) ?? '',
    verdict,
    commentaire: verdict === 'a_corriger' ? 'À reprendre' : null,
    relecteurNom: 'Relectrice',
    relecteurAdresse: 'relectrice@tenga.test',
    estMoi: true,
    creeLe: `2026-10-23T10:${String(n).padStart(2, '0')}:00Z`,
    ...autres
  };
};

describe('statut de chaque bloc', () => {
  it('sans verdict : à relire, texte non modifié', () => {
    const atelier = assemblerAtelier(blocs, [], []);
    expect(atelier).toHaveLength(150);
    expect(atelier.every((b) => b.statut === 'a_relire')).toBe(true);
    expect(atelier.every((b) => !b.texteModifie)).toBe(true);
  });

  it('le dernier verdict sur le texte servi fait foi (historique du plus récent au plus ancien)', () => {
    const ancien = evenement('N1/bas', 'a_corriger');
    const recent = evenement('N1/bas', 'relu');
    const atelier = assemblerAtelier(blocs, [recent, ancien], []);
    const n1 = atelier.find((b) => b.bloc.id === 'N1/bas');
    expect(n1?.statut).toBe('relu');
    expect(n1?.dernier?.id).toBe(recent.id);
    expect(n1?.historique.map((e) => e.id)).toEqual([recent.id, ancien.id]);
  });

  it('l’ordre reçu n’importe pas : la date la plus récente l’emporte', () => {
    const ancien = evenement('N1/bas', 'relu');
    const recent = evenement('N1/bas', 'a_corriger');
    const n1 = assemblerAtelier(blocs, [ancien, recent], []).find(
      (b) => b.bloc.id === 'N1/bas'
    );
    expect(n1?.statut).toBe('a_corriger');
    expect(n1?.historique[0]?.id).toBe(recent.id);
  });

  it('un verdict sur un autre texte : à relire, marqué « texte modifié », historique conservé', () => {
    const vieux = evenement('E3/haut', 'relu', { empreinte: 'b'.repeat(64) });
    const e3 = assemblerAtelier(blocs, [vieux], []).find(
      (b) => b.bloc.id === 'E3/haut'
    );
    expect(e3?.statut).toBe('a_relire');
    expect(e3?.texteModifie).toBe(true);
    expect(e3?.dernier).toBeNull();
    expect(e3?.historique).toHaveLength(1);
  });

  it('les verdicts sur un bloc inconnu sont ignorés', () => {
    const atelier = assemblerAtelier(blocs, [evenement('Z9/bas', 'relu')], []);
    expect(atelier.every((b) => b.historique.length === 0)).toBe(true);
  });

  it('compte les statuts', () => {
    const atelier = assemblerAtelier(
      blocs,
      [evenement('N1/bas', 'relu'), evenement('N2/bas', 'a_corriger')],
      []
    );
    expect(compterStatuts(atelier)).toEqual({
      a_relire: 148,
      a_corriger: 1,
      relu: 1
    });
  });
});

describe('fréquence d’affichage', () => {
  it('histogramme vide : fréquence inconnue', () => {
    expect(effectifsParBloc([])).toBeNull();
    expect(
      assemblerAtelier(blocs, [], []).every((b) => b.effectif === null)
    ).toBe(true);
  });

  it('score de facette sur 4 réponses → niveau → bloc, effectifs cumulés', () => {
    const effectifs = effectifsParBloc([
      { facette: 'N1', score: 4, effectif: 2 }, // moyenne 1 : bas
      { facette: 'N1', score: 7, effectif: 1 }, // 1,75 : bas
      { facette: 'N1', score: 8, effectif: 3 }, // 2 : plutôt bas
      { facette: 'N1', score: 13, effectif: 5 }, // 3,25 : milieu
      { facette: 'N1', score: 16, effectif: 4 }, // 4 : haut
      { facette: 'Q9', score: 13, effectif: 9 } // inconnue : ignorée
    ]);
    expect(effectifs?.get('N1/bas')).toBe(3);
    expect(effectifs?.get('N1/plutot_bas')).toBe(3);
    expect(effectifs?.get('N1/milieu')).toBe(5);
    expect(effectifs?.get('N1/plutot_haut')).toBeUndefined();
    expect(effectifs?.get('N1/haut')).toBe(4);
    expect([...(effectifs?.keys() ?? [])].some((k) => k.startsWith('Q9'))).toBe(
      false
    );
  });

  it('avec un histogramme, un bloc jamais atteint a un effectif nul', () => {
    const atelier = assemblerAtelier(
      blocs,
      [],
      [{ facette: 'N1', score: 13, effectif: 5 }]
    );
    expect(atelier.find((b) => b.bloc.id === 'N1/milieu')?.effectif).toBe(5);
    expect(atelier.find((b) => b.bloc.id === 'N1/bas')?.effectif).toBe(0);
  });
});

describe('profils fictifs', () => {
  it('chaque profil fictif apparaît sur exactement trente blocs, ceux de son calcul', () => {
    const parBloc = profilsParBloc();
    for (const code of PROFILS_APERCU) {
      const profil = profilDepuisScores(scoresApercu(code));
      const attendus = Object.values(profil.facettes).map((f) => f.blocId);
      const trouves = [...parBloc.entries()]
        .filter(([, profils]) => profils.includes(code))
        .map(([bloc]) => bloc);
      expect(trouves.sort()).toEqual([...attendus].sort());
    }
  });
});

describe('filtres et tri', () => {
  it('lecture des réglages d’URL, défauts sûrs', () => {
    expect(lireFiltresAtelier({})).toEqual({
      statut: 'a_relire',
      tri: 'frequence'
    });
    expect(lireFiltresAtelier({ statut: 'relu', tri: 'catalogue' })).toEqual({
      statut: 'relu',
      tri: 'catalogue'
    });
    expect(
      lireFiltresAtelier({ statut: ['relu', 'tous'], tri: 'n’importe' })
    ).toEqual({ statut: 'a_relire', tri: 'frequence' });
    expect(lireFiltresAtelier({ statut: 'tous' }).statut).toBe('tous');
  });

  it('liens d’URL', () => {
    expect(lienAtelier({ statut: 'a_relire', tri: 'frequence' })).toBe(
      '/admin/relecture'
    );
    expect(lienAtelier({ statut: 'relu', tri: 'catalogue' })).toBe(
      '/admin/relecture?statut=relu&tri=catalogue'
    );
    expect(lienAtelier({ statut: 'tous', tri: 'frequence' })).toBe(
      '/admin/relecture?statut=tous'
    );
  });

  it('filtre par statut', () => {
    const atelier = assemblerAtelier(
      blocs,
      [evenement('N1/bas', 'relu'), evenement('N2/bas', 'a_corriger')],
      []
    );
    const ids = (statut: 'relu' | 'a_corriger' | 'a_relire' | 'tous') =>
      selectionner(atelier, { statut, tri: 'catalogue' }).map((b) => b.bloc.id);
    expect(ids('relu')).toEqual(['N1/bas']);
    expect(ids('a_corriger')).toEqual(['N2/bas']);
    expect(ids('a_relire')).toHaveLength(148);
    expect(ids('tous')).toHaveLength(150);
  });

  it('tri par fréquence : effectif, puis nombre de profils fictifs, puis ordre de la bibliothèque', () => {
    const atelier = assemblerAtelier(
      blocs,
      [],
      [
        { facette: 'C6', score: 20, effectif: 9 }, // C6/haut : 9
        { facette: 'E3', score: 4, effectif: 2 } // E3/bas : 2
      ]
    );
    const ordre = selectionner(atelier, {
      statut: 'tous',
      tri: 'frequence'
    }).map((b) => b.bloc.id);
    expect(ordre[0]).toBe('C6/haut');
    expect(ordre[1]).toBe('E3/bas');
    // Ensuite, à effectif nul : les blocs portés par le plus de profils fictifs.
    const reste = selectionner(atelier, { statut: 'tous', tri: 'frequence' })
      .slice(2)
      .map((b) => b.profils.length);
    expect(reste).toEqual([...reste].sort((a, b) => b - a));
  });

  it('sans histogramme, le tri par fréquence se rabat sur les profils fictifs', () => {
    const ordre = selectionner(assemblerAtelier(blocs, [], []), {
      statut: 'tous',
      tri: 'frequence'
    });
    expect(ordre[0]?.profils.length).toBeGreaterThan(0);
    const comptes = ordre.map((b) => b.profils.length);
    expect(comptes).toEqual([...comptes].sort((a, b) => b - a));
  });

  it('tri du catalogue : ordre de la bibliothèque', () => {
    const ordre = selectionner(assemblerAtelier(blocs, [], []), {
      statut: 'tous',
      tri: 'catalogue'
    }).map((b) => b.bloc.id);
    expect(ordre).toEqual(blocs.map((b) => b.id));
  });
});
