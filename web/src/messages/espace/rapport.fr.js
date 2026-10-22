const rapportFr = {
  title: 'Rapport',
  rempliLe: 'Rempli le {date}',
  personne: {
    titre: 'Votre rapport individuel',
    retour: 'Retour à mon résultat'
  },
  consultant: {
    titre: 'Rapport individuel',
    retour: 'Retour à la liste des résultats',
    facetteRetiree:
      'Une facette du domaine Ouverture n’est pas montrée dans cette vue : elle porte sur des opinions, donnée sensible qui ne doit pas être restituée à un tiers.'
  },
  liste: {
    titre: 'Résultats de la campagne',
    intro:
      'Chaque ligne est un résultat remis, sans nom ni adresse. Chaque consultation est inscrite au journal.',
    campagne: 'Campagne : {titre}',
    retour: 'Retour aux campagnes',
    aucun: 'Aucun résultat n’a encore été remis pour cette campagne.',
    colResultat: 'Résultat',
    colDate: 'Remis le',
    resultat: 'Résultat {numero}',
    lire: 'Lire',
    lireAria: 'Lire le résultat {numero} de la campagne « {titre} »',
    lien: 'Résultats',
    lienAria: 'Résultats de la campagne « {titre} »'
  },
  lire: {
    titre: 'Lire ce rapport',
    ce: 'Ce rapport décrit la façon dont vous avez répondu à un questionnaire de personnalité de 120 affirmations, selon cinq grands domaines et trente facettes.',
    neDitPas:
      'Il ne dit rien de ce que vous savez faire, de votre valeur professionnelle ni de votre avenir. Ce n’est pas un diagnostic, et il ne doit servir ni à recruter, ni à évaluer, ni à décider à votre place.',
    niveaux:
      'Les niveaux (bas, plutôt bas, milieu de l’échelle, plutôt haut, haut) sont des lectures de convention de vos propres réponses. Ils ne vous situent par rapport à aucun groupe et ne sont pas calibrés.',
    hypotheses:
      'Les textes d’interprétation sont des pistes de lecture à confirmer ensemble lors de l’entretien, jamais des constats.',
    limites:
      'Le questionnaire reflète ce que vous déclarez à un moment donné. Son comportement auprès de personnes au Maroc n’a pas encore été étudié.',
    destinatairesPersonne:
      'Ce rapport vous est destiné. Le consultant qui vous accompagne dans l’organisation peut le lire ; le responsable de l’organisation n’y a pas accès.',
    destinatairesConsultant:
      'Document confidentiel, destiné à préparer l’entretien de restitution avec la personne. Chaque lecture est inscrite au journal.'
  },
  ensemble: {
    titre: 'Vue d’ensemble',
    radarTitle: 'Profil en cinq domaines',
    radarSummary: 'Graphique en radar à cinq axes, de 24 à 120.',
    columnDomain: 'Domaine',
    columnTotal: 'Total',
    domainOutOf: 'sur 120',
    ressortTitre: 'Ce qui ressort',
    ressortIntro:
      'Les facettes dont les réponses s’éloignent le plus du milieu de l’échelle.',
    ressortAucun: 'Toutes les facettes se situent au milieu de l’échelle.',
    entretienTitre: 'Questions pour l’entretien',
    entretienIntro:
      'Trois questions ouvertes tirées des textes de la bibliothèque, à explorer ensemble.',
    entretienAucune:
      'Les questions seront disponibles une fois les textes relus.'
  },
  domaines: {
    facettes: 'Facettes'
  },
  carte: {
    titre: 'Carte des facettes',
    intro: 'Niveau de lecture de chaque facette, domaine par domaine.',
    caption: 'Niveau de lecture et total de chaque facette',
    colFacette: 'Facette',
    colNiveau: 'Niveau',
    colTotal: 'Total (sur 20)'
  },
  tensions: {
    titre: 'Tensions internes',
    intro:
      'Facettes d’un même domaine dont les niveaux s’écartent nettement. Ce sont des points à explorer, pas des contradictions.',
    ligne: 'Entre {a} et {b} : écart de {ecart}',
    aucune: 'Aucune tension marquée entre les facettes d’un même domaine.'
  },
  fiabilite: {
    titre: 'Fiabilité de cette lecture',
    reponses: 'Toutes les réponses sont présentes : {n} sur {n}.',
    duree: 'Durée de réponse : {duree}.',
    limite:
      'Aucun indicateur de fiabilité n’est validé à ce jour. La durée est donnée à titre d’information, sans seuil, et ne dit rien de la qualité des réponses.'
  }
};

export default rapportFr;
