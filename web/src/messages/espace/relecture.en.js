const relectureEn = {
  title: 'Review workshop',
  headline: 'Review every block before anyone reads it.',
  intro:
    'Each interpretation block is shown in context: facet, domain, level and the fictitious profiles in which it would appear. An unreviewed block stays hidden from the person; it becomes visible as soon as it is marked “reviewed”. If its text changes, it goes back to “to review”.',
  acces: 'Restricted to super administrators and designated reviewers.',
  avancementTitre: 'Progress',
  avancement: 'Blocks reviewed: {relus} of {total}',
  statuts: {
    a_relire: 'To review',
    a_corriger: 'To correct',
    relu: 'Reviewed'
  },
  filtresTitre: 'Selection',
  filtreLegende: 'Show',
  tous: 'All blocks',
  triLegende: 'Order',
  tris: {
    frequence: 'Most displayed first',
    catalogue: 'Library order'
  },
  frequenceObservee:
    'Frequency observed across stored results, without any individual data.',
  frequenceIndisponible:
    'Observed frequency unavailable: there are still too few results to respect the anonymity threshold. Blocks carried by the fictitious profiles come first.',
  selection: 'Blocks in this selection: {n}',
  vide: 'No block in this selection.',
  indisponible:
    'The review status is temporarily unavailable: no verdict can be given. Please try again in a moment.',
  bloc: {
    niveau: 'Level {niveau}',
    effectif: 'Results at this level: {n}',
    effectifInconnu: 'Observed frequency unknown',
    profils: 'Fictitious profiles concerned',
    aucunProfil: 'No fictitious profile at this level',
    texteModifie:
      'Text changed since the last review: previous verdicts no longer apply.',
    formesAccordees: 'Gendered forms',
    masculin: 'Masculine agreement',
    feminin: 'Feminine agreement',
    historique: 'Verdict history ({n})',
    historiqueVide: 'No verdict yet.',
    ancienTexte: 'on an earlier text',
    vous: 'you',
    compteEfface: 'deleted account',
    par: 'by {qui}'
  },
  formulaire: {
    groupe: 'Verdict on block {bloc}',
    commentaire: 'Comment',
    commentaireAide:
      'Required to request a correction; 2,000 characters at most.',
    relu: 'Mark as reviewed',
    aCorriger: 'Request a correction',
    envoi: 'Saving',
    reluFait: 'Block marked as reviewed.',
    corrigerFait: 'Correction requested.',
    perime:
      'This text has changed since the page was opened. Reload it to review the new version.',
    invalide: 'Verdict refused: the request is not valid.',
    commentaireRequis:
      'A comment of 2,000 characters at most is needed to request a correction.',
    interdit: 'You do not, or no longer, have access to the review.',
    erreur: 'The verdict could not be saved. Please try again.'
  },
  relecteurs: {
    titre: 'Designated reviewers',
    intro:
      'A designated person has access to this workshop, and to it alone. Super administrators are reviewers by right.',
    vide: 'No designated reviewer.',
    indisponible: 'The list of reviewers is temporarily unavailable.',
    legende: 'Designated reviewers and designation date',
    colAdresse: 'Address',
    colAjout: 'Designation',
    colAction: 'Action',
    adresse: 'Email address',
    designer: 'Designate',
    designerAide:
      'The account is created if it does not exist yet; the person then signs in with this address.',
    envoi: 'Saving',
    ajoute: 'Address designated.',
    deja: 'This address is already designated.',
    inconnu: 'Suspended account: designation refused.',
    invalide: 'Invalid address.',
    erreur: 'The designation could not be saved. Please try again.',
    retirer: 'Remove',
    retirerAria: 'Remove {adresse} from the reviewers',
    confirmer: 'I confirm the removal of {adresse}',
    retire: 'Designation removed.',
    absent: 'This address was no longer designated.',
    retraitInvalide: 'Tick the confirmation box to remove.',
    interdit: 'Action restricted to super administrators.',
    retraitErreur: 'The removal could not be saved. Please try again.'
  }
};

export default relectureEn;
