const rapportEn = {
  title: 'Report',
  rempliLe: 'Completed on {date}',
  personne: {
    titre: 'Your individual report',
    retour: 'Back to my result'
  },
  consultant: {
    titre: 'Individual report',
    retour: 'Back to the list of results',
    facetteRetiree:
      'One facet of the Openness domain is not shown in this view: it concerns opinions, which are sensitive information and must not be passed on to a third party.'
  },
  liste: {
    titre: 'Campaign results',
    intro:
      'Each line is a submitted result, with no name or address. Every consultation is recorded in the log.',
    campagne: 'Campaign: {titre}',
    retour: 'Back to campaigns',
    aucun: 'No result has been submitted for this campaign yet.',
    colResultat: 'Result',
    colDate: 'Submitted on',
    resultat: 'Result {numero}',
    lire: 'Read',
    lireAria: 'Read result {numero} of the campaign “{titre}”',
    lien: 'Results',
    lienAria: 'Results of the campaign “{titre}”'
  },
  lire: {
    titre: 'Reading this report',
    ce: 'This report describes how you answered a personality questionnaire of 120 statements, according to five broad domains and thirty facets.',
    neDitPas:
      'It says nothing about what you can do, about your professional worth or about your future. It is not a diagnosis, and it must not be used to recruit, to assess or to decide in your place.',
    niveaux:
      'The levels (low, rather low, middle of the scale, rather high, high) are readings by convention of your own answers. They do not place you against any group and are not calibrated.',
    hypotheses:
      'The interpretation texts are leads to confirm together during the interview, never findings.',
    limites:
      'The questionnaire reflects what you state at a given moment. How it behaves among people in Morocco has not yet been studied.',
    destinatairesPersonne:
      'This report is meant for you. The consultant who supports you in the organisation may read it; the head of the organisation has no access to it.',
    destinatairesConsultant:
      'Confidential document, meant to prepare the feedback interview with the person. Every reading is recorded in the log.'
  },
  ensemble: {
    titre: 'Overview',
    radarTitle: 'Profile across five domains',
    radarSummary: 'Radar chart with five axes, from 24 to 120.',
    columnDomain: 'Domain',
    columnTotal: 'Total',
    domainOutOf: 'out of 120',
    ressortTitre: 'What stands out',
    ressortIntro:
      'The facets whose answers are furthest from the middle of the scale.',
    ressortAucun: 'All facets sit in the middle of the scale.',
    entretienTitre: 'Questions for the interview',
    entretienIntro:
      'Three open questions drawn from the library texts, to explore together.',
    entretienAucune:
      'The questions will be available once the texts are reviewed.'
  },
  domaines: {
    facettes: 'Facets'
  },
  carte: {
    titre: 'Facet map',
    intro: 'Reading level of each facet, domain by domain.',
    caption: 'Reading level and total of each facet',
    colFacette: 'Facet',
    colNiveau: 'Level',
    colTotal: 'Total (out of 20)'
  },
  tensions: {
    titre: 'Internal tensions',
    intro:
      'Facets of the same domain whose levels are clearly apart. They are points to explore, not contradictions.',
    ligne: 'Between {a} and {b}: gap of {ecart}',
    aucune: 'No marked tension between facets of the same domain.'
  },
  fiabilite: {
    titre: 'Reliability of this reading',
    reponses: 'All answers are present: {n} out of {n}.',
    duree: 'Time taken to answer: {duree}.',
    limite:
      'No reliability indicator has been validated to date. The duration is given for information, with no threshold, and says nothing about the quality of the answers.'
  }
};

export default rapportEn;
