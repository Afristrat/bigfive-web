export type {
  ClasseEcart,
  DomainCode,
  EcartsBinome,
  FacetIndex,
  FacetteCode,
  Niveau,
  ProfilCalcule,
  ScoreDomaine,
  ScoreFacette,
  ScoresTenga,
  Seuils,
  Tension
} from './types';
export { DOMAINES, FACETTES, INDEX_FACETTES } from './types';
export { CALCUL_VERSION, SEUILS_DEFAUT, VERSION_MOTEUR } from './seuils';
export { ecart, niveau } from './niveaux';
export {
  calculerScores,
  lireScores,
  scoresDepuisReponsesMongo
} from './scores';
export { profilDepuisScores } from './profil';
export { comparerBinome } from './binome';
