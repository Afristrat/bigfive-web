import { arrondir4, arrondir6, ecart } from './niveaux';
import { SEUILS_DEFAUT } from './seuils';
import { DOMAINES, FACETTES } from './types';
import type { EcartsBinome, ProfilCalcule, Seuils } from './types';

// Écarts entre deux profils déjà consentis par les deux personnes (le consentement se vérifie en amont).
export function comparerBinome(
  a: ProfilCalcule,
  b: ProfilCalcule,
  s: Seuils = SEUILS_DEFAUT
): EcartsBinome {
  const domaines = DOMAINES.map((d) => {
    const delta = a.domaines[d].moyenne - b.domaines[d].moyenne;
    return {
      d,
      ecart: arrondir4(Math.abs(delta)),
      classe: ecart(delta, s.ecarts)
    };
  });

  // Tri sur l'écart arrondi : à égalité, l'ordre des facettes (N1 à C6) décide, sans bruit de flottant.
  const facettesNotables = FACETTES.map((k) => ({
    k,
    delta: arrondir6(Math.abs(a.facettes[k].moyenne - b.facettes[k].moyenne))
  }))
    .filter((x) => ecart(x.delta, s.ecarts) === 'notable')
    .sort((x, y) => y.delta - x.delta)
    .map((x) => ({
      k: x.k,
      ecart: arrondir4(x.delta),
      niveauA: a.facettes[x.k].niveau,
      niveauB: b.facettes[x.k].niveau
    }));

  return { domaines, facettesNotables };
}
