// Namespace "binome": pair proposals, consent, pair report. Every text is a
// default not yet validated by Amine. The report never rates the pair.
const binomeEn = {
  title: 'Pair',
  etiquettes: {
    moi: 'You',
    autre: 'The other person',
    personne: 'Person {numero}'
  },
  liste: {
    titre: 'My pairs',
    lien: 'My pairs',
    intro:
      'A pair places your results next to those of another person in the same organisation. It exists only if you both accept it, and you can withdraw your agreement at any time.',
    vide: 'No pair proposal concerns you at the moment.',
    retour: 'Back to my results',
    organisation: 'Organisation: {nom}',
    avec: 'With: {nom}',
    autreInconnu: 'another person in the organisation',
    propose: 'Proposed on {date}',
    lire: 'Read the report',
    lireAria: 'Read the report of the pair proposed on {date}',
    statut: {
      decision: 'Awaiting your decision',
      attente: 'Your agreement is given; waiting for the other person',
      actif: 'Active: both agreements are given',
      retire: 'Withdrawn'
    }
  },
  confirmation: {
    retrait:
      'Your consent has been withdrawn. The report for this pair can no longer be read, and the withdrawal is final for this proposal.',
    refus:
      'You have declined this proposal. The report for this pair will not be readable, and the refusal is final.'
  },
  consent: {
    explication:
      'If you accept, the two of you will be able to read a report that places your results side by side. The organisation’s consultant can read it too; the organisation’s manager has no access to it. A refusal or a withdrawal is final for this proposal.',
    accepter: 'Accept',
    refuser: 'Decline',
    retirer: 'Withdraw my agreement',
    working: 'Sending…',
    enAttente:
      'Your agreement is recorded. The report will be readable once the other person has accepted too.',
    actif: 'Both agreements are given: the report is readable.',
    retire: 'Proposal withdrawn. It can no longer be read.',
    forbidden: 'You cannot answer this proposal.',
    closed: 'This proposal is closed: a refusal or a withdrawal is final.',
    notfound: 'Proposal not found.',
    invalid: 'Answer refused.',
    failed: 'Your answer could not be recorded. Please try again shortly.'
  },
  rapport: {
    titre: 'Pair report',
    retour: 'Back to my pairs',
    retourCompte: 'Back to my account',
    consultant: 'Consultant reading: the two people are identified by a number.'
  },
  lire: {
    titre: 'Reading this report',
    supportConversation:
      'This report is a support for a conversation between two people, not a verdict.',
    aucuneNote:
      'It sets no overall index for the pair, neither as a number nor in words: no study we have read allows one to be grounded.',
    pasDecision:
      'It must not be used to hire, to appraise, to form or break up a team, or to decide in place of the people concerned.',
    consentement:
      'It exists only because both people accepted it, and each can withdraw their agreement at any time: the report then stops being readable.',
    niveaux:
      'The levels are conventional readings of each person’s answers, not calibrated. A gap is a difference between two answers, never a quality or a flaw.',
    destinatairesPersonne:
      'This report is meant for the two people. The organisation’s consultant can read it; the organisation’s manager has no access to it.',
    destinatairesConsultant:
      'Confidential document, meant to prepare a conversation with the two people, who accepted it. Every reading is entered in the log.'
  },
  ensemble: {
    titre: 'Overview',
    radarTitle: 'Two profiles overlaid on four domains',
    radarSummary:
      'Radar chart with four axes, from 24 to 120, with one outline per person.',
    columnDomain: 'Domain',
    domainOutOf: 'out of 120',
    rapprocheTitre: 'What brings you close',
    rapprocheAucun: 'No domain is close.',
    distingueTitre: 'What sets you apart',
    distingueAucun: 'No domain sets you apart.',
    conversationTitre: 'What deserves a conversation',
    conversationIntro: 'The largest notable differences, to explore together.',
    conversationAucune: 'No notable difference to explore.'
  },
  domaines: {
    titre: 'The four domains',
    intro:
      'For each domain: each person’s total (from 24 to 120), its conventional level and the gap between the two.',
    ecart: 'Gap: {valeur} out of 120'
  },
  ouverture: {
    retiree:
      'The Openness domain is not shown here. One of its facets concerns opinions, which is sensitive data: it is never shown to the other person, and neither is the domain total, which would make it possible to recover it. The domain’s other five facets appear in the gap map.'
  },
  carte: {
    titre: 'Gap map',
    intro:
      'The twenty-nine facets shown, ranked by gap. Three conventional classes: close (gap of {proche} or less), intermediate, notable (gap of {notable} or more). Every notable difference is listed below.',
    caption: 'Facets ranked by gap, with each person’s level',
    colFacette: 'Facet',
    colEcart: 'Gap',
    colClasse: 'Class',
    aucune: 'No facet in this class.',
    groupes: {
      notable: 'Notable differences',
      intermediaire: 'Intermediate gaps',
      proche: 'Close gaps'
    }
  },
  classe: {
    proche: 'Close',
    intermediaire: 'Intermediate',
    notable: 'Notable'
  },
  attention: {
    titre: 'Documented points of attention',
    intro:
      'Only two points, taken from the literature, appear when the two people’s results fit them. They are conversation leads, never forecasts.',
    aucun: 'Neither of the two documented points applies here.',
    limite:
      'These findings concern teams, not pairs: they allow no conclusion about these two people.',
    conscienciosite: {
      titre: 'A gap in conscientiousness',
      texte:
        'The two people’s answers on the Conscientiousness domain are clearly different. In the teams studied, a wide spread of this trait is associated with lower collective performance. To explore: how each person organises their work, and what they expect from the other.',
      source:
        'Source: Peeters, van Tuijl, Rutte and Reymen (2006), meta-analysis published in European Journal of Personality.'
    },
    agreabilite: {
      titre: 'A low level of agreeableness',
      texte:
        'At least one of the two people is at a low or rather low level on the Agreeableness domain. In field studies, the lowest level of agreeableness in a team stands out as associated with its performance. To explore: how each person likes to give an opinion that disturbs, and to receive one.',
      source:
        'Source: Bell (2007), meta-analysis published in Journal of Applied Psychology, 92(3), 595-615.'
    }
  },
  fiabilite: {
    titre: 'Reliability of this reading',
    texte:
      'Each profile rests on 120 complete answers. No index of measurement precision is validated: no gap is dismissed as too small, and a close gap is simply read as close.',
    limite:
      'The questionnaire reflects what each person declares at a given moment. Its behaviour among people in Morocco has not yet been studied.'
  },
  proposition: {
    titre: 'Propose a pair',
    intro:
      'Choose two results from this campaign. Each person will receive the proposal in "My pairs" and must accept it: until both have accepted, nobody can read the report, not even you.',
    campagne: 'Campaign: {titre}',
    retour: 'Back to the results',
    choixA: 'First result',
    choixB: 'Second result',
    option: 'Result {numero}, delivered on {date}',
    choisir: 'Choose…',
    envoyer: 'Propose the pair',
    working: 'Sending…',
    moinsDeDeux: 'At least two delivered results are needed to propose a pair.',
    proposed:
      'Proposal sent. The report will only be readable once both people have agreed.',
    lienRapport: 'Open the report (readable after both agreements)',
    invalid: 'Choose two different results.',
    forbidden: 'You cannot propose this pair.',
    already: 'A proposal is already in progress for these two people.',
    error: 'The proposal could not be sent. Please try again shortly.'
  }
};

export default binomeEn;
