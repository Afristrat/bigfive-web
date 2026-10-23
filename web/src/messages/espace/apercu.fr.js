const apercuFr = {
  title: 'Aperçu des résultats',
  intro:
    'Le vrai rendu de la plateforme (vue des résultats, rapport individuel, synthèse par groupe) sur des profils et des groupes fictifs, pour le valider sans compte ni donnée réelle. Réservé aux super administrateurs.',
  lien: 'Aperçu des résultats (rendu réel, données fictives)',
  bandeau: 'Données fictives : aucun compte, aucune donnée réelle',
  vueLegende: 'Audience',
  vues: {
    participant: 'Participant',
    consultant: 'Consultant',
    groupe: 'Groupe'
  },
  profilLegende: 'Profil fictif',
  simulationTitre: 'Simuler l’affichage des textes non relus',
  simulationAide:
    'Sans ce réglage, le participant voit « texte en relecture » pour chaque bloc non relu, comme aujourd’hui en production. Avec lui, l’équipe voit le rendu final avec les textes. Aucune variable d’environnement n’est modifiée.',
  simulationOff: 'Réglage désactivé : rendu tel qu’il est réellement servi.',
  simulationOn:
    'Réglage activé : rendu final, textes non relus affichés avec leur mention.',
  simulationActiver: 'Activer la simulation',
  simulationDesactiver: 'Désactiver la simulation',
  resultatTitre: 'Vue des résultats',
  rapportTitre: 'Rapport individuel',
  syntheseTitre: 'Synthèse par groupe',
  syntheseAide:
    'Trois groupes fictifs : deux publiés et un dont l’effectif est inférieur au seuil d’anonymat.',
  consultantAide:
    'Audience consultant : les blocs non relus sont montrés avec leur bandeau et la facette O6 est retirée.',
  participantAide:
    'Audience participant : ce que la personne voit réellement sur son propre résultat.'
};

export default apercuFr;
