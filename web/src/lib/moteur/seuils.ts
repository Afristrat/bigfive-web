import type { Seuils } from './types';

// Conventions de lecture non calibrées, aucune norme de population.
// Valeurs identiques à docs/design/rapport-cabinet/moteur/regles.json (vérifié par test).
export const SEUILS_DEFAUT: Seuils = {
  niveaux: { bas: 2.0, plutot_bas: 2.6, milieu: 3.4, plutot_haut: 4.0 },
  ecarts: { proche: 0.5, notable: 1.0 },
  tension: { ecart_min: 1.5 },
  contribution: { n_max: 5 }
};

export const VERSION_MOTEUR = 'm-1.0' as const;
export const CALCUL_VERSION = 'tenga-somme-1' as const;
