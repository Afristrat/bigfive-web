const relectureFr = {
  title: 'Atelier de relecture',
  headline: 'Relire chaque bloc avant qu’une personne le lise.',
  intro:
    'Chaque bloc d’interprétation est montré dans son contexte : facette, domaine, niveau et profils fictifs où il s’afficherait. Un bloc non relu reste masqué à la personne ; il lui devient visible dès qu’il est marqué « relu ». Si son texte change, il redevient « à relire ».',
  acces: 'Réservé aux super administrateurs et aux relecteurs désignés.',
  historiqueReserve:
    'L’historique complet des verdicts (auteurs, dates, commentaires) est réservé aux super administrateurs : vous voyez l’état de chaque bloc et vos propres verdicts.',
  conservation:
    'Les verdicts antérieurs et leurs commentaires sont effacés après {jours} jours ; le dernier verdict de chaque texte est conservé, sans son auteur ni son commentaire.',
  avancementTitre: 'Avancement',
  avancement: 'Blocs relus : {relus} sur {total}',
  statuts: {
    a_relire: 'À relire',
    a_corriger: 'À corriger',
    relu: 'Relu'
  },
  filtresTitre: 'Sélection',
  filtreLegende: 'Afficher',
  tous: 'Tous les blocs',
  triLegende: 'Ordre',
  tris: {
    frequence: 'Les plus affichés d’abord',
    catalogue: 'Ordre de la bibliothèque'
  },
  frequenceObservee:
    'Fréquence observée sur les résultats enregistrés, sans aucune donnée individuelle.',
  frequenceIndisponible:
    'Fréquence observée indisponible : résultats encore trop peu nombreux pour respecter le seuil d’anonymat, ou lecture momentanément impossible. Les blocs portés par les profils fictifs passent d’abord.',
  selection: 'Blocs dans cette sélection : {n}',
  vide: 'Aucun bloc dans cette sélection.',
  indisponible:
    'L’état de relecture est momentanément indisponible : aucun verdict ne peut être rendu. Réessayez dans un instant.',
  bloc: {
    niveau: 'Niveau {niveau}',
    effectif: 'Résultats à ce niveau : {n}',
    effectifInconnu: 'Fréquence observée inconnue',
    profils: 'Profils fictifs concernés',
    aucunProfil: 'Aucun profil fictif à ce niveau',
    texteModifie:
      'Texte modifié depuis la dernière relecture : les verdicts précédents ne s’appliquent plus.',
    formesAccordees: 'Formes accordées',
    masculin: 'Accord au masculin',
    feminin: 'Accord au féminin',
    historique: 'Historique des verdicts ({n})',
    historiqueVide: 'Aucun verdict pour l’instant.',
    mesVerdicts: 'Vos verdicts ({n})',
    mesVerdictsVide: 'Vous n’avez rendu aucun verdict sur ce bloc.',
    ancienTexte: 'sur un texte antérieur',
    vous: 'vous',
    auteurEfface: 'auteur non conservé',
    par: 'par {qui}'
  },
  formulaire: {
    groupe: 'Verdict sur le bloc {bloc}',
    commentaire: 'Commentaire',
    commentaireAide:
      'Obligatoire pour demander une correction ; 2 000 caractères au plus.',
    relu: 'Marquer relu',
    aCorriger: 'Demander une correction',
    envoi: 'Enregistrement en cours',
    reluFait: 'Bloc marqué relu.',
    corrigerFait: 'Correction demandée.',
    plafond: 'Trop de verdicts en une heure : réessayez un peu plus tard.',
    perime:
      'Ce texte a changé depuis l’ouverture de la page. Rechargez-la pour relire la nouvelle version.',
    invalide: 'Verdict refusé : la demande n’est pas valide.',
    commentaireRequis:
      'Un commentaire de 2 000 caractères au plus est nécessaire pour demander une correction.',
    interdit: 'Vous n’avez pas, ou plus, accès à la relecture.',
    erreur: 'Le verdict n’a pas pu être enregistré. Réessayez.'
  },
  relecteurs: {
    titre: 'Relecteurs désignés',
    intro:
      'Une personne désignée accède à cet atelier, et à lui seul. Les super administrateurs sont relecteurs de droit.',
    vide: 'Aucun relecteur désigné.',
    indisponible: 'La liste des relecteurs est momentanément indisponible.',
    legende: 'Relecteurs désignés et date de désignation',
    sansAdresse: 'adresse absente',
    colAdresse: 'Adresse',
    colAjout: 'Désignation',
    colAction: 'Action',
    adresse: 'Adresse e-mail',
    designer: 'Désigner',
    designerAide:
      'Le compte est créé s’il n’existe pas encore ; la personne reçoit un e-mail d’avis, puis se connecte avec cette adresse.',
    envoi: 'Enregistrement en cours',
    ajoute: 'Adresse désignée.',
    deja: 'Cette adresse est déjà désignée.',
    inconnu: 'Compte inconnu ou suspendu : désignation refusée.',
    invalide: 'Adresse invalide.',
    erreur: 'La désignation n’a pas pu être enregistrée. Réessayez.',
    plafond: 'Trop de désignations en une heure : réessayez un peu plus tard.',
    retirer: 'Retirer',
    retirerAria: 'Retirer {adresse} des relecteurs',
    confirmer: 'Je confirme le retrait de {adresse}',
    retire: 'Désignation retirée.',
    absent: 'Cette adresse n’était plus désignée.',
    retraitInvalide: 'Cochez la case de confirmation pour retirer.',
    interdit: 'Action réservée aux super administrateurs.',
    retraitErreur: 'Le retrait n’a pas pu être enregistré. Réessayez.'
  }
};

export default relectureFr;
