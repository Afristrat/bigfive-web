// Espace « binome » : propositions de binôme, consentement, rapport de binôme.
// Tout le texte est un défaut non validé par Amine. Les espaces insécables avant
// : ; ? ! sont écrits  . Le mot « compatibilité » et tout chiffre en
// pourcentage sont proscrits : le rapport ne note jamais le binôme.
const binomeFr = {
  title: 'Binôme',
  etiquettes: {
    moi: 'Vous',
    autre: 'L’autre personne',
    personne: 'Personne {numero}'
  },
  liste: {
    titre: 'Mes binômes',
    lien: 'Mes binômes',
    intro:
      'Un binôme place vos résultats à côté de ceux d’une autre personne de la même organisation. Il n’existe que si vous l’acceptez tous les deux, et vous pouvez retirer votre accord à tout moment.',
    vide: 'Aucune proposition de binôme ne vous concerne pour le moment.',
    retour: 'Retour à mes résultats',
    organisation: 'Organisation : {nom}',
    avec: 'Avec : {nom}',
    autreInconnu: 'une autre personne de l’organisation',
    propose: 'Proposé le {date}',
    lire: 'Lire le rapport',
    lireAria: 'Lire le rapport du binôme proposé le {date}',
    statut: {
      decision: 'À votre décision',
      attente: 'Votre accord est donné ; en attente de l’autre personne',
      actif: 'Actif : les deux accords sont donnés',
      retire: 'Retiré'
    }
  },
  consent: {
    explication:
      'Si vous acceptez, vous deux pourrez lire un rapport qui place vos résultats côte à côte. Le consultant de l’organisation peut le lire aussi ; le responsable de l’organisation n’y a pas accès. Un refus ou un retrait est définitif pour cette proposition.',
    accepter: 'Accepter',
    refuser: 'Refuser',
    retirer: 'Retirer mon accord',
    working: 'Envoi en cours…',
    enAttente:
      'Votre accord est enregistré. Le rapport sera lisible quand l’autre personne aura accepté aussi.',
    actif: 'Les deux accords sont donnés : le rapport est lisible.',
    retire: 'Proposition retirée. Elle ne peut plus être lue.',
    forbidden: 'Vous ne pouvez pas répondre à cette proposition.',
    closed:
      'Cette proposition est close : un refus ou un retrait est définitif.',
    notfound: 'Proposition introuvable.',
    invalid: 'Réponse refusée.',
    failed: 'La réponse n’a pas pu être enregistrée. Réessayez dans un instant.'
  },
  rapport: {
    titre: 'Rapport de binôme',
    retour: 'Retour à mes binômes',
    retourCompte: 'Retour à mon compte',
    consultant:
      'Lecture du consultant : les deux personnes sont désignées par un numéro.'
  },
  lire: {
    titre: 'Lire ce rapport',
    supportConversation:
      'Ce rapport est un support de conversation entre deux personnes, pas un verdict.',
    aucuneNote:
      'Il n’établit aucun indice global du binôme, ni chiffré ni en mots : aucune étude lue ne permet d’en fonder un.',
    pasDecision:
      'Il ne doit servir ni à recruter, ni à évaluer, ni à constituer ou défaire une équipe, ni à décider à la place des personnes.',
    consentement:
      'Il n’existe que parce que les deux personnes l’ont accepté, et chacune peut retirer son accord à tout moment : le rapport cesse alors d’être lisible.',
    niveaux:
      'Les niveaux sont des lectures de convention des réponses de chacun, non calibrées. Un écart est une différence entre deux réponses, jamais une qualité ni un défaut.',
    destinatairesPersonne:
      'Ce rapport est destiné aux deux personnes. Le consultant de l’organisation peut le lire ; le responsable de l’organisation n’y a pas accès.',
    destinatairesConsultant:
      'Document confidentiel, destiné à préparer une conversation avec les deux personnes, qui l’ont accepté. Chaque lecture est inscrite au journal.'
  },
  ensemble: {
    titre: 'Vue d’ensemble',
    radarTitle: 'Deux profils superposés sur quatre domaines',
    radarSummary:
      'Graphique en radar à quatre axes, de 24 à 120, avec un tracé par personne.',
    columnDomain: 'Domaine',
    domainOutOf: 'sur 120',
    rapprocheTitre: 'Ce qui rapproche',
    rapprocheAucun: 'Aucun domaine n’est proche.',
    distingueTitre: 'Ce qui distingue',
    distingueAucun: 'Aucun domaine ne se distingue.',
    conversationTitre: 'Ce qui mérite une conversation',
    conversationIntro:
      'Les différences notables les plus grandes, à explorer ensemble.',
    conversationAucune: 'Aucune différence notable à explorer.'
  },
  domaines: {
    titre: 'Les quatre domaines',
    intro:
      'Pour chaque domaine : le total de chaque personne (de 24 à 120), son niveau de convention et l’écart entre les deux.',
    ecart: 'Écart : {valeur}'
  },
  ouverture: {
    retiree:
      'Le domaine Ouverture n’est pas présenté ici. L’une de ses facettes porte sur des opinions, donnée sensible : elle n’est jamais montrée à l’autre personne, et le total du domaine, qui permettrait de la retrouver, ne l’est pas non plus. Les cinq autres facettes du domaine figurent dans la carte des écarts.'
  },
  carte: {
    titre: 'Carte des écarts',
    intro:
      'Les vingt-neuf facettes présentées, classées par écart. Trois classes de convention : proche (écart de {proche} ou moins), intermédiaire, notable (écart de {notable} ou plus). Toutes les différences notables figurent ci-dessous.',
    caption: 'Facettes classées par écart, avec le niveau de chaque personne',
    colFacette: 'Facette',
    colEcart: 'Écart',
    colClasse: 'Classe',
    aucune: 'Aucune facette dans cette classe.',
    groupes: {
      notable: 'Différences notables',
      intermediaire: 'Écarts intermédiaires',
      proche: 'Écarts proches'
    }
  },
  classe: {
    proche: 'Proche',
    intermediaire: 'Intermédiaire',
    notable: 'Notable'
  },
  attention: {
    titre: 'Points d’attention documentés',
    intro:
      'Deux points seulement, tirés de la littérature, apparaissent quand vos résultats s’y prêtent. Ce sont des pistes de conversation, jamais des prévisions.',
    aucun: 'Aucun des deux points documentés ne se présente ici.',
    limite:
      'Ces résultats portent sur des équipes, non sur des binômes : ils n’autorisent aucune conclusion sur ces deux personnes.',
    conscienciosite: {
      titre: 'Un écart sur la conscienciosité',
      texte:
        'Les réponses des deux personnes sur le domaine Conscienciosité sont nettement différentes. Dans les équipes étudiées, une dispersion importante de ce trait est associée à une moindre performance collective. À explorer : comment chacun organise son travail, et ce qu’il attend de l’autre.',
      source:
        'Source : Peeters, van Tuijl, Rutte et Reymen (2006), méta-analyse publiée dans European Journal of Personality.'
    },
    agreabilite: {
      titre: 'Un niveau bas d’agréabilité',
      texte:
        'Au moins l’une des deux personnes se situe à un niveau bas ou plutôt bas sur le domaine Agréabilité. Dans les études de terrain, le niveau le plus bas d’agréabilité d’une équipe ressort comme associé à sa performance. À explorer : comment chacun aime donner un avis qui dérange, et le recevoir.',
      source:
        'Source : Bell (2007), méta-analyse publiée dans Journal of Applied Psychology, 92(3), 595-615.'
    }
  },
  fiabilite: {
    titre: 'Fiabilité de cette lecture',
    texte:
      'Chaque profil repose sur 120 réponses complètes. Aucun indice de précision de la mesure n’est validé : aucun écart n’est écarté comme trop petit, et un écart proche se lit simplement comme proche.',
    limite:
      'Le questionnaire reflète ce que chacun déclare à un moment donné. Son comportement auprès de personnes au Maroc n’a pas encore été étudié.'
  },
  proposition: {
    titre: 'Proposer un binôme',
    intro:
      'Choisissez deux résultats de cette campagne. Chaque personne recevra la proposition dans « Mes binômes » et devra l’accepter : tant que les deux n’ont pas accepté, personne ne peut lire le rapport, pas même vous.',
    campagne: 'Campagne : {titre}',
    retour: 'Retour aux résultats',
    choixA: 'Premier résultat',
    choixB: 'Second résultat',
    option: 'Résultat {numero}, remis le {date}',
    choisir: 'Choisir…',
    envoyer: 'Proposer le binôme',
    working: 'Envoi en cours…',
    moinsDeDeux:
      'Il faut au moins deux résultats remis pour proposer un binôme.',
    proposed:
      'Proposition envoyée. Le rapport ne sera lisible qu’après l’accord des deux personnes.',
    lienRapport: 'Ouvrir le rapport (lisible après les deux accords)',
    invalid: 'Choisissez deux résultats différents.',
    forbidden: 'Vous ne pouvez pas proposer ce binôme.',
    already: 'Une proposition est déjà en cours pour ces deux personnes.',
    error: 'La proposition n’a pas pu être envoyée. Réessayez dans un instant.'
  }
};

export default binomeFr;
