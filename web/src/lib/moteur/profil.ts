import { arrondir4, arrondir6, niveau } from './niveaux';
import { SEUILS_DEFAUT, VERSION_MOTEUR } from './seuils';
import { DOMAINES, FACETTES, INDEX_FACETTES } from './types';
import type {
  DomainCode,
  FacetteCode,
  ProfilCalcule,
  ScoresTenga,
  Seuils,
  Tension
} from './types';

// Position sur l'échelle de 1 à 5, de 0 à 100. Jamais affichée comme un pourcentage.
const position = (moyenne: number): number =>
  arrondir6(((moyenne - 1) / 4) * 100);

const moyenneDe = (s: ScoresTenga, k: FacetteCode): number => {
  const domaine = s[k[0] as DomainCode];
  return domaine.facettes[`${Number(k[1])}` as '1'].moyenne;
};

// Deux facettes d'un même domaine dont l'écart absolu atteint le seuil.
function tensions(s: ScoresTenga, seuil: number): Tension[] {
  const sortie: Tension[] = [];
  for (const d of DOMAINES) {
    const ks = INDEX_FACETTES.map((f): FacetteCode => `${d}${f}`);
    for (let i = 0; i < ks.length; i++) {
      for (let j = i + 1; j < ks.length; j++) {
        const ecartAbs = arrondir6(
          Math.abs(moyenneDe(s, ks[i]) - moyenneDe(s, ks[j]))
        );
        if (ecartAbs >= seuil) {
          sortie.push({
            id: `${ks[i]}-${ks[j]}`,
            domaine: d,
            facettes: [ks[i], ks[j]],
            ecart: arrondir4(ecartAbs)
          });
        }
      }
    }
  }
  return sortie;
}

export function profilDepuisScores(
  s: ScoresTenga,
  seuils: Seuils = SEUILS_DEFAUT
): ProfilCalcule {
  const domaines = Object.fromEntries(
    DOMAINES.map((d) => [
      d,
      {
        score: s[d].score,
        moyenne: s[d].moyenne,
        position: position(s[d].moyenne),
        niveau: niveau(s[d].moyenne, seuils.niveaux)
      }
    ])
  ) as ProfilCalcule['domaines'];

  const facettes = Object.fromEntries(
    FACETTES.map((k) => {
      const f = s[k[0] as DomainCode].facettes[`${Number(k[1])}` as '1'];
      const n = niveau(f.moyenne, seuils.niveaux);
      return [
        k,
        {
          score: f.score,
          moyenne: f.moyenne,
          position: position(f.moyenne),
          niveau: n,
          blocId: `${k}/${n}`
        }
      ];
    })
  ) as ProfilCalcule['facettes'];

  return {
    versionMoteur: VERSION_MOTEUR,
    domaines,
    facettes,
    tensions: tensions(s, seuils.tension.ecart_min)
  };
}
