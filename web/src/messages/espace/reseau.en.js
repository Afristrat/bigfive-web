// Namespace "reseau": survey of a team's actual working network (framing of
// 23 October, docs/design/cadrage-reseau-reel.md). The person's screen (notice
// to the people named, consent, closed list) and the consultant's page. Outside
// the legal blocks flagged below, every text is a default not yet validated by
// Amine. The "who blocks you" question is withdrawn (framing §2).
const reseauEn = {
  title: 'Team network',
  liste: {
    titre: 'Your team’s network survey',
    intro: 'Your status in your team’s working-relationships survey.',
    ouvrir: 'View my survey',
    ouvrirAria: 'View my survey for the campaign {titre}',
    statut: {
      brouillon: 'Campaign in preparation',
      ouverte: 'Campaign open',
      close: 'Campaign closed'
    }
  },
  page: {
    titre: 'Team network survey',
    retour: 'Back to my results'
  },
  etapes: {
    legende: 'Survey progress',
    information: 'Notice',
    consentement: 'Consent',
    releve: 'Answers',
    position: 'Step {numero} of {total}'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  information: {
    titre: 'You may be named',
    texte:
      'The members of your team will be asked to describe how they work with you and with their other colleagues: advice, information, trust and dependence. You may therefore be named in their answers. These answers are used for a feedback workshop with the team and, only for those who have given their separate consent, for a named report delivered to Tenga Conseil; none of them is shared with management or used for any decision about you. You may object to being named: your links are then removed from the map and you do not answer the survey; there is no other consequence.',
    opposition: 'I object to being named in this survey.',
    oppositionAide:
      'Any answers that name you are then deleted. You can withdraw your objection later.',
    lu: 'I have read this'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  consentement: {
    titre: 'Your consent',
    texte:
      'Tenga Conseil invites you to answer four questions about how you work with the members of your team: advice, information, trust and dependence. Your answers name colleagues. They are used to describe how the team actually works, during a feedback workshop and, if you agree below, in a named report delivered to Tenga Conseil. Only the Tenga Conseil consultants assigned to your organisation and the platform’s administrators can read your answers one by one. They will never be shared with your management and will not be used for any decision about you or your colleagues. Taking part is optional: declining has no consequence, and your employer will not know whether you answered. You can change your answers until the campaign closes, and withdraw them at any time.',
    repondre: 'I agree to answer.',
    carte:
      'I agree that the team map, showing first names or codes, may be shown to the members of the team during the workshop.',
    carteAide:
      'The map is shown only if every member of the team agrees; otherwise the workshop presents indicators without names.',
    rapport:
      'I agree that my answers may appear by name in the report delivered to Tenga Conseil.',
    rapportAide:
      'Without this box, your answers appear in no named report; this choice has no consequence. This box is available only if you agree to answer.',
    refusAide:
      'Without the first box, you do not answer; this choice has no consequence. Unticking the first box deletes any answers already saved.',
    confirmerRefus: 'Confirm: delete my answers',
    enregistrer: 'Save my choice'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  mentions: {
    titre: 'Controller and your rights',
    responsable: 'Data controller: Tenga Conseil.',
    contact:
      'Rights of access, rectification and objection: write to {contact}.',
    contactSansAdresse:
      'Rights of access, rectification and objection: contact Tenga Conseil.',
    conservation:
      'Your answers and your recorded choices (notice, objection, consents) are deleted automatically three years after they were last saved.',
    cndp: 'Declaration to the CNDP: in progress.'
  },
  releve: {
    titre: 'Your answers',
    intro:
      'Four questions for each member of your team. There is no right answer: describe what actually happens.',
    vide: 'No other member of your team has joined the survey yet. Please come back later.',
    repli: 'Team member {numero} (name not provided)',
    questions: {
      conseil:
        'How often do you ask this person for advice to solve a work problem?',
      information:
        'How often do you receive information from this person that is useful for your work?',
      confiance:
        'Could you point out a mistake or a difficulty to this person without fear?',
      dependance:
        'How often do you have to wait for this person’s work before you can move on?'
    },
    frequences: {
      jamais: 'Never',
      rarement: 'Rarely',
      mois: 'Every month',
      semaine: 'Every week',
      jour: 'Every day'
    },
    confiances: {
      oui: 'Yes',
      plutotOui: 'Rather yes',
      plutotNon: 'Rather no',
      non: 'No'
    },
    compteMembre: '{faites} of {total}',
    progression: 'Answers given: {faites} of {total}',
    manque: 'Missing answers: {nombre}. Each member needs all four answers.',
    enregistrer: 'Save my answers',
    lectureSeule: 'Your saved answers',
    sansReponse: 'No answer'
  },
  accords: {
    titre: 'Your consent',
    repondre: 'You have agreed to answer.',
    carteOui: 'You agree that the team map may be shown at the workshop.',
    carteNon:
      'You do not agree that the team map may be shown at the workshop.',
    rapportOui:
      'You agree that your answers may appear by name in the report delivered to Tenga Conseil.',
    rapportNon: 'Your answers appear in no named report.',
    modifier: 'Change my consent',
    annuler: 'Cancel'
  },
  close: {
    titre: 'Campaign closed',
    texte:
      'The survey no longer accepts answers or changes. You can still withdraw your answers and object to being named.'
  },
  ferme: {
    titre: 'Survey closed',
    texte:
      'The survey is closed to answers; you can still withdraw your answers or object to being named.',
    leverPlusTard:
      'You will be able to withdraw your objection when the survey reopens.',
    texteOpposition:
      'The survey is closed to answers; you can still object to being named.',
    texteOppose:
      'Your objection has been recorded. The survey is closed to answers.'
  },
  brouillon: {
    titre: 'Survey not open yet',
    texte: 'The survey is not open to answers yet.'
  },
  oppose: {
    titre: 'Your objection has been recorded',
    texte:
      'Your links are removed from the survey and you do not answer it. You can withdraw your objection at any time.',
    lever: 'Withdraw my objection'
  },
  opposer: {
    bouton: 'I object to being named',
    aide: 'Your links will be removed from the survey, including those your colleagues have already reported, and your own answers will be deleted.',
    confirmer: 'Confirm my objection',
    annuler: 'Cancel'
  },
  retrait: {
    bouton: 'Withdraw my answers',
    aide: 'Your answers and both of your consents will be deleted.',
    aideOuverte:
      'Your answers and both of your consents will be deleted. You can answer again while the campaign is open.',
    confirmer: 'Confirm withdrawal',
    annuler: 'Cancel'
  },
  working: 'Sending…',
  messages: {
    informe: 'Noted. You can now give your consent, or not.',
    informeSansReponse:
      'Noted. The survey is not accepting answers at the moment.',
    oppose:
      'Your objection has been recorded. Your links are removed from the survey.',
    enregistre: 'Your choice has been saved.',
    repondu:
      'Your answers have been saved. You can change them until the campaign closes.',
    retire: 'Your answers and your consents have been deleted.',
    closed: 'Your situation has changed; the page is being updated.',
    forbidden: 'You cannot perform this action.',
    notfound: 'Survey not found.',
    invalid:
      'The team list has changed and has just been updated; check it, then save again.',
    failed: 'Sending failed. Please try again in a moment.',
    reconnexion: 'Your session has expired: sign in again to continue.',
    reconnexionLien: 'Sign in again',
    apercu: 'Preview: nothing is saved.'
  },
  consultant: {
    lien: 'Network survey',
    titre: 'Network survey',
    intro:
      'Counts by group, with no names. Raw answers can only be read in the export, which is reserved for preparing the report; every reading is logged.',
    retour: 'Back to results',
    campagne: 'Campaign: {titre}',
    statut: 'Campaign status',
    statuts: {
      brouillon: 'In preparation',
      ouverte: 'Open',
      close: 'Closed'
    },
    effectif: 'Group size',
    informes: 'Notified, no objection',
    oppositions: 'Objections',
    repondants: 'Respondents',
    accordsCarte: 'Map consents',
    aucunGroupe: 'No group in this campaign.',
    information: {
      bouton: 'Send the information e-mail',
      envoi: 'Sending…',
      aide: 'Sends the information e-mail (art. 5 of law 09-08) to the people in this campaign’s groups who have not yet read the information in the application. Each person receives it only once; the sending is recorded in the log. Possible only while the survey is open.',
      aucun: 'Everyone has already been informed: no e-mail to send.',
      termine: '{n} e-mail(s) sent.',
      echecs: '{n} e-mail(s) not sent: send again, only these people will be picked up.',
      restants: '{n} person(s) still to be informed: send again.',
      nonTraces: '{n} e-mail(s) went out without the sending being recorded in the log: these people may receive it a second time. Tell Tenga.',
      ferme: 'The network survey is closed: no e-mail can be sent.',
      interdit: 'This sending is reserved for the organisation’s consultant and Tenga administrators.',
      plafond: 'Too many sendings in the last hour: try again later.',
      reconnexion: 'Your session has expired: sign in again, then send again.',
      erreur: 'The sending failed: try again; if it keeps happening, tell Tenga.'
    },
    exporter: 'Export the answers (JSON)',
    exportAide:
      'The file contains each person’s answers and the names of the people they cite; for the consultant, people who objected appear only as a count. Do not share it with anyone outside the assignment.'
  }
};

export default reseauEn;
