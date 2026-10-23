import niveauxEn from './espace/niveaux.en.js';
import passationEn from './espace/passation.en.js';
import mesResultatsEn from './espace/mesResultats.en.js';
import rapportEn from './espace/rapport.en.js';
import binomeEn from './espace/binome.en.js';
import syntheseEn from './espace/synthese.en.js';
import apercuEn from './espace/apercu.en.js';
import relectureEn from './espace/relecture.en.js';
import pilotageEn from './espace/pilotage.en.js';
import reseauEn from './espace/reseau.en.js';

const english = {
  language: {
    label: 'Language'
  },
  footer: {
    tagline:
      'The personality questionnaire from Tenga Conseil: 120 statements, five domains, thirty facets, based on the IPIP-NEO-120.'
  },
  a11y: {
    skip: 'Skip to content',
    mainNav: 'Main navigation',
    footerNav: 'Footer links'
  },
  theme: {
    toDark: 'Switch to dark theme',
    toLight: 'Switch to light theme'
  },
  home: {
    eyebrow: 'Personality questionnaire, by Tenga Conseil',
    specimenTag: 'Sample, fictitious values',
    peak: {
      lead: 'As you read on, the profile takes shape, one factor at a time.'
    },
    figures: {
      items: 'statements',
      factors: 'broad factors',
      facets: 'facets',
      languages: 'languages'
    },
    title: 'Precise words for the way you work.',
    lead: '120 statements, no time limit, drawn from a public inventory. You get a profile across five broad factors and thirty facets, with its sources and its limits.',
    stake: {
      title: 'Where it starts',
      problem:
        'You put a team together. You lead a change. You choose a training course. Each time, you need to understand how people work.',
      answer:
        'The questionnaire gives you a shared vocabulary to talk about it: five factors, thirty facets, public definitions. It opens the conversation; it does not replace it.'
    },
    research: {
      title: 'What the research establishes, and how far it goes',
      intro:
        'Three findings, without stretching their reach. The full references are published.',
      structure: {
        title: 'A structure that travels',
        text: 'The five major factors have been found in most of the cultures studied, in dozens of languages.'
      },
      work: {
        title: 'A real link, but a modest one',
        text: 'Of the five factors, conscientiousness is the one whose link with job performance is most consistently observed. The size of that link is modest.'
      },
      groups: {
        title: 'Groups, not individuals',
        text: 'These findings describe group tendencies. They do not predict an individual, and traits are only one element among others: skills, experience and context matter too.'
      },
      link: 'Read the method and references'
    },
    limits: {
      title: 'What the questionnaire will not do',
      intro: 'A method is also judged by what it refuses to promise.',
      diagnosis: {
        title: 'It makes no diagnosis',
        text: 'It describes habitual behavioural tendencies, based on your own answers.'
      },
      exam: {
        title: 'It is not an examination',
        text: 'It is not a test of skills or intelligence, nor a health examination.'
      },
      mirror: {
        title: 'It only says what you say about yourself',
        text: 'Its results rest on your own answers: valuable information, but partial.'
      },
      sorting: {
        title: 'It is not designed to screen candidates',
        text: 'When the stakes are high, in recruitment for instance, answers can be flattered. We do not recommend this questionnaire for selection.'
      }
    },
    how: {
      title: 'Three stages, at your own pace',
      intro:
        'Nothing to prepare, nothing to revise: there are no right or wrong answers.',
      answer: {
        title: 'You answer',
        text: '120 statements, with no time limit. For each one, say how you usually are, not how you would like to be. You can stop and carry on later on this device.'
      },
      read: {
        title: 'You read your profile',
        text: 'Five broad factors and thirty facets, each described as a tendency. Nothing ranks you, nothing is a diagnosis.'
      },
      keep: {
        title: 'You keep it',
        text: 'An identifier lets you find your profile again. The page can be printed, or saved as a PDF, from your browser.'
      }
    },
    method: {
      measured:
        'Five major personality factors: openness to experience, conscientiousness, extraversion, agreeableness, neuroticism. Each breaks down into six facets, making thirty tendencies described separately.'
    },
    factors: {
      title: 'Five factors. Thirty facets. No verdict.',
      facets: 'Six facets',
      N: 'Sensitivity to negative emotions and stress, more or less acute from one person to another. A mood tendency, not a diagnosis.',
      E: 'Energy in conversation and in action. Some recharge with other people; others, in quiet.',
      O: 'Curiosity, imagination, a taste for novelty. Some explore first; others rely on what has proved itself. Both approaches serve.',
      A: 'Cooperation, trust, concern for others. Some put harmony first; others, frankness.',
      C: 'Organisation, sense of duty, perseverance. Some plan everything; others improvise better.'
    },
    sheet: {
      title: 'The instrument at a glance',
      intro:
        'Everything you need to check for yourself, without taking our word for it.',
      inventory: 'Inventory',
      inventoryValue: 'IPIP-NEO-120, by John A. Johnson (2014)',
      origin: 'Source of the statements',
      originValue: 'International Personality Item Pool',
      status: 'Status',
      statusValue: 'Public domain',
      content: 'Content',
      contentValue: '{items} statements, {factors} factors, {facets} facets',
      languages: 'Languages',
      duration: 'Duration',
      durationValue: 'No time limit',
      wording: 'Wording',
      wordingValue:
        'A few statements reworded, without changing the facet measured or the scoring direction.',
      validation: 'Validation of this version',
      validationValue:
        'No validation study to date. We say so rather than let you guess.'
    },
    reference: {
      methodLink: 'Method and references'
    },
    faq: {
      title: 'Three questions before you start',
      all: 'All frequently asked questions'
    },
    trust: {
      title: 'A trusted third party',
      text: 'Tenga Conseil stands between your leadership and your teams. The consultant debriefs, explains and puts things back in perspective. Nothing individual is passed on to the organisation.'
    },
    closing: {
      text: 'For yourself, the questionnaire is open now. For your organisation, request a presentation: Tenga Conseil will reply to arrange a conversation.'
    }
  },
  radar: {
    title: 'Radar chart of the five major factors',
    summary: 'Radar chart with five axes, from {min} to {max}.',
    domain: 'Domain',
    score: 'Score'
  },
  seo: {
    keywords:
      'personality test, personality questionnaire, Big Five, five-factor model, IPIP-NEO-120, personality assessment, Tenga Conseil, Morocco'
  },
  frontpage: {
    seo: {
      title: 'Big Five personality test | Tenga Assessments',
      description:
        'Personality questionnaire of 120 statements, based on the five-factor model (Big Five), offered by Tenga Conseil.',
      image_alt: 'Tenga Assessments, personality questionnaire'
    },
    call_to_action: 'Start the questionnaire',
    description: {
      reference:
        'Questions and scoring: International Personality Item Pool (<ipip>ipip.ori.org</ipip>), IPIP-NEO-120 questionnaire by John A. Johnson (2014), in the public domain.'
    },
    posts: {
      subtitle: 'Insights on personality and teamwork',
      all: 'See all articles'
    }
  },
  about: {
    seo: {
      title: 'About Tenga Assessments',
      description:
        'The personality questionnaire service of Tenga Conseil, a Moroccan consulting firm: a public-domain instrument, sources you can consult, limits stated in writing.'
    },
    title: 'About',
    headline: 'A questionnaire whose every source can be checked.',
    lead: 'Tenga Assessments is the personality questionnaire service of Tenga Conseil, a Moroccan consulting firm. We offer it to the organisations we support: executive teams, human resources teams, consultants.',
    instrument: {
      title: 'The instrument',
      text: 'The questionnaire is the IPIP-NEO-120 by John A. Johnson (2014), drawn from the International Personality Item Pool and placed in the public domain. We chose it because its method is published and every one of its sources can be consulted. A tool that touches the person must be open to scrutiny.'
    },
    model: {
      title: 'What it describes',
      text: 'Five broad factors of personality, detailed in thirty facets: openness to experience, conscientiousness, extraversion, agreeableness and neuroticism.'
    },
    languages: {
      title: 'Three languages',
      text: 'You can answer it in French, Arabic or English. We reworded a few statements; each one keeps the facet measured and the scoring direction of the original question.'
    },
    limits: {
      title: 'What it does not claim',
      text: 'This version has not been the subject of any validation study. The results describe habitual behavioural tendencies, based on your own answers. It is neither a skills test nor a diagnosis.'
    },
    rule: 'Our rule',
    contact: {
      title: 'A question?'
    },
    contact_faq: 'Start with the <link>frequently asked questions</link>.',
    contact_email: 'If the answer is not there, write to us at {email}.'
  },
  faq: {
    title: 'Frequently asked questions',
    lead: 'Before you answer the questionnaire, and after: short answers, straight to the point.',
    error: {
      question: 'The site shows an error. What should I do?',
      answer:
        'Write to us at {email}, saying which page you were on, what you were doing and the message displayed.'
    },
    print: {
      question: 'How do I print my results?',
      answer:
        'Open your results page, then use your browser’s print function or save the page as a PDF.'
    },
    science: {
      question: 'Is it scientific?',
      answer:
        'The five-factor model has been the subject of a great many studies, including a meta-analysis of 410 samples and more than 400,000 people (Judge et al., 2013). The questionnaire uses a published inventory placed in the public domain. It is not meant to assess or rank you. We state its limits plainly: it describes what you say about yourself, and we have found no study that validates it in Moroccan Arabic or in French for Morocco.'
    },
    usefulness: {
      question: 'What is it for?',
      answer:
        'To give you words to describe how you work, and to open a conversation with your colleagues. It is not a promise of results: it is a support for dialogue.'
    },
    source: {
      question: 'Where do the questions come from?',
      answer:
        'From the public domain. The questions and the scoring are those of the IPIP-NEO-120 by John A. Johnson (2014), drawn from the International Personality Item Pool (ipip.ori.org). Tenga Conseil reworded a few statements, without changing what each question measures.'
    },
    answers: {
      question: 'Are there right and wrong answers?',
      answer:
        'No. Each statement describes a way of being, neither a strength nor a flaw. Answer according to how you usually are, not how you would like to be.'
    },
    diagnosis: {
      question: 'Does the questionnaire make a diagnosis?',
      answer:
        'No. It describes behavioural tendencies based on your own answers. It is not a skills test, an intelligence test or a health examination.'
    }
  },
  toolbar: {
    home: 'Home',
    home_aria: 'Tenga Assessments home page',
    open_menu: 'Open menu',
    close_menu: 'Close menu',
    result: 'Find a result',
    articles: 'Articles',
    privacy: 'Privacy',
    about: 'About',
    see_results: 'Find a result',
    faq: 'Frequently asked questions',
    account: 'My account',
    presentation: 'Request a presentation',
    method: 'Method and references'
  },
  // Request for a presentation. The "information" text is legal wording to be
  // validated by the client (use of data and retention period).
  presentation: {
    seo: {
      title: 'Request a presentation',
      description:
        'Request a presentation of Tenga Assessments, the personality questionnaire from Tenga Conseil. A consultant will reply to arrange a conversation.'
    },
    title: 'Request a presentation',
    intro:
      'For a team, a change programme or developing your managers: describe your context in a few lines. A Tenga Conseil consultant replies in writing, in the language you choose, to arrange a conversation.',
    requiredNote: 'All fields are required, except the message.',
    fields: {
      name: 'First and last name',
      organisation: 'Organisation',
      role: 'Job title',
      email: 'Work email address',
      size: 'Organisation size',
      objective: 'Main goal',
      exchangeLocale: 'Preferred language for the conversation',
      message: 'Message (optional)',
      messageHint: 'Context, questions, constraints. {max} characters at most.',
      messageCount: '{count} / {max} characters'
    },
    choose: 'Choose from the list',
    sizes: {
      lt50: 'Fewer than 50 people',
      from50to250: '50 to 250 people',
      from250to1000: '250 to 1,000 people',
      gt1000: 'More than 1,000 people'
    },
    objectives: {
      teamwork: 'Work better as a team',
      change: 'Support a change',
      leaders: 'Develop managers',
      other: 'Other'
    },
    consent:
      'I agree that Tenga Conseil may use the information entered to answer my request, as described below the form.',
    submit: 'Send my request',
    sending: 'Sending…',
    information:
      'The information entered is used only to answer your request for a presentation. It is kept for 12 months, then deleted automatically.',
    summary:
      'The form contains errors. Correct the fields flagged, then send it again.',
    errors: {
      required: 'Fill in this field.',
      tooLong: 'This field is too long.',
      email:
        'Enter a valid email address, for example first.last@organisation.com.',
      choice: 'Choose an option from the list.',
      consent: 'Tick this box to send your request.',
      characters: 'This field contains characters that are not accepted.'
    },
    retry:
      'Your request was sent too quickly to be checked. Read it over, then send it again.',
    failed:
      'Your request could not be saved. Please try again in a few moments.',
    honeypot: 'Do not fill in this field',
    success: {
      title: 'Your request has been received',
      text: 'Thank you. Tenga Conseil has recorded your request for a presentation. An acknowledgement should reach the address you gave; your request is recorded either way. Please check your spam folder.',
      nextTitle: 'What happens next',
      step1: 'A Tenga Conseil consultant reads your request.',
      step2:
        'They write to you at the address you gave, in the language you chose, to arrange a conversation.',
      back: 'Back to the home page'
    },
    stepSend: 'You describe your context and send this form.',
    cta: 'Request a presentation',
    aboutLink:
      'Would you like a presentation of Tenga Assessments for your organisation? <link>Send us a request</link>.'
  },
  login: {
    title: 'Sign in',
    intro:
      'Get a sign-in link by email. It is valid for 15 minutes and works once.',
    stepsLabel: 'Sign-in steps',
    steps: {
      address: 'Enter your email address.',
      open: 'Open the message you receive.',
      confirm:
        'Click the link, or enter the 6-digit code from the message on this page.'
    },
    emailLabel: 'Email address',
    submit: 'Get the link',
    sending: 'Sending…',
    invalid: 'Enter a valid email address.',
    sent: 'If this address can sign in, a message has just been sent to it: a link and a code, valid for 15 minutes.',
    sentHelp:
      'Nothing after a few minutes? Check your spam folder, or request a new link.',
    retry: 'Request a new link',
    codeTitle: 'Opened the message on another device?',
    codeIntro: 'Enter the 6-digit code from the message here.',
    codeLabel: '6-digit code',
    codeSubmit: 'Confirm the code',
    codeChecking: 'Checking…',
    codeInvalid: 'Check the email address and the 6 digits of the code.',
    codeError: 'Wrong or expired code. Request a new link.',
    linkError: 'This sign-in link is no longer valid. Request a new one.',
    password: {
      summary: 'Tenga administrator: sign in with a password',
      intro: 'Your password, then the code from your authenticator app.',
      stepOne: 'Step 1 of 2',
      stepTwo: 'Step 2 of 2',
      emailLabel: 'Email address',
      passwordLabel: 'Password',
      submit: 'Continue',
      checking: 'Checking…',
      failed:
        'Sign-in refused. Check your details, or get a sign-in link by email.',
      invalid: 'Enter your email address and your password.',
      totpTitle: 'Authentication code',
      totpIntro: 'Enter the 6-digit code shown by your authenticator app.',
      totpLabel: '6-digit code',
      totpSubmit: 'Sign in',
      totpFailed:
        'Code refused. Enter the next code, or start again from the password.',
      restart: 'Start again',
      forgot: {
        open: 'Forgot your password?',
        title: 'Forgotten password',
        intro:
          'Get a sign-in link by email. It takes you to My account, where you choose a new password with the code from your authenticator app.',
        lock: 'A password locked after several failures stays locked until another Tenga administrator unlocks it.',
        submit: 'Get the link',
        back: 'Back to the password'
      }
    },
    connect: {
      title: 'Confirm sign-in',
      intro: 'The link works once: it is used when you click the button.',
      button: 'Sign in',
      opening: 'Signing in…',
      error:
        'This link is no longer valid: it has expired or was already used. Request a new one.',
      newLink: 'Request a new link'
    }
  },
  account: {
    title: 'My account',
    intro: 'Your sign-in address, your profile and your roles.',
    profileTitle: 'Profile',
    emailLabel: 'Sign-in address',
    nameLabel: 'Name',
    nameHelp: 'Optional.',
    languageLabel: 'Language',
    languages: {
      fr: 'Français',
      ar: 'العربية',
      en: 'English'
    },
    save: 'Save',
    saving: 'Saving…',
    saved: 'Profile saved.',
    invalid: 'Check the name (120 characters at most) and the language.',
    error: 'The profile was not saved. Try again in a moment.',
    rolesTitle: 'Your roles',
    noRoles: 'No role for now.',
    security: {
      title: 'Sign-in security',
      intro:
        'For Tenga administrators only. Signing in with a password also asks for the code from your authenticator app; the email sign-in link remains available.',
      totpTitle: 'Authenticator app',
      totpActive: 'Enabled. Its code is asked at every password sign-in.',
      totpInactive: 'Not enabled. Enable it before setting a password.',
      totpStart: 'Enable the authenticator app',
      totpStarting: 'Preparing…',
      totpScan:
        'Scan this QR code with your authenticator app, then enter the 6-digit code it shows.',
      totpQrAlt: 'QR code to enable the authenticator app',
      totpSecretLabel: 'Or enter this key in the app:',
      totpCodeLabel: '6-digit code',
      totpConfirm: 'Confirm',
      totpConfirming: 'Checking…',
      totpEnabled: 'Authenticator app enabled.',
      totpFailed: 'Code refused. Check your device clock, then try again.',
      error: 'The operation did not complete. Try again in a moment.',
      passwordTitle: 'Password',
      passwordIntro:
        'Your current password is not asked: the code from your authenticator app is enough. At least 12 characters, no composition rule; a phrase of several words works. Passwords that are too common are refused.',
      newLabel: 'New password',
      confirmLabel: 'Confirm the password',
      codeLabel: 'Authentication code (6 digits)',
      save: 'Save the password',
      saving: 'Saving…',
      saved: 'Password saved.',
      needsTotp: 'Enable the authenticator app first.',
      mismatch: 'The two entries do not match.',
      invalid: 'Check the three fields.',
      codeFailed: 'Authentication code refused.',
      rateLimited: 'Too many attempts. Try again later.',
      weak: {
        too_short: 'At least 12 characters.',
        too_long: '72 bytes at most (about 72 unaccented characters).',
        common:
          'This password is refused: it is too common or identical to the current one.',
        repetitive: 'Avoid a single repeated character.',
        contains_email: 'The password must not contain your email address.'
      }
    },
    adminLink: 'Tenga administration',
    logout: 'Sign out'
  },
  roles: {
    responsable: 'Manager',
    consultant: 'Consultant',
    participant: 'Participant'
  },
  admin: {
    title: 'Administration',
    intro:
      'Reserved for Tenga administrators. Every action is written to the log.',
    organizationsTitle: 'Organisations',
    empty: 'No organisation yet.',
    colName: 'Name',
    colSlug: 'URL identifier',
    colStatus: 'Status',
    colCreated: 'Created on',
    colResponsables: 'Managers',
    colConsultants: 'Consultants',
    colParticipants: 'Participants',
    status: {
      active: 'Active',
      archivee: 'Archived'
    },
    createTitle: 'Create an organisation',
    nameLabel: 'Name',
    slugLabel: 'URL identifier',
    slugHelp: 'Lowercase letters, digits and hyphens; 3 to 40 characters.',
    create: 'Create the organisation',
    created: 'Organisation created.',
    exists: 'This identifier is already in use.',
    invalid: 'Check the fields: they do not match the expected format.',
    error: 'The operation failed. Try again in a moment.',
    assignTitle: 'Assign a role',
    assignIntro:
      'One role per person and per organisation. If the address has no account yet, one is created.',
    emailLabel: 'E-mail address',
    organizationLabel: 'Organisation',
    roleLabel: 'Role',
    languageLabel: 'Language of the person',
    assign: 'Assign the role',
    assigned: 'Role assigned.',
    grantTitle: 'Add a super administrator',
    grantIntro:
      'A super administrator sees every organisation and can assign every role. If the address has no account yet, one is created. The addition is recorded in the log.',
    grant: 'Add as super administrator',
    granted: 'Super administrator added.',
    grantConfirmLabel: 'Confirm the e-mail address',
    grantWorking: 'Adding…',
    requiredLegend: 'Fields marked with an asterisk (*) are required.',
    grantInvalid:
      'Check both addresses: they must be valid and identical. Correct them, then try again.',
    grantExists:
      'This address already belongs to a super administrator: nothing was changed.',
    grantError:
      'The addition failed, or the hourly limit of additions was reached. Try again in a moment.',
    createWorking: 'Creating…',
    assignWorking: 'Assigning…',
    organizationPlaceholder: 'Choose an organisation',
    rolePlaceholder: 'Choose a role',
    removeTitle: 'Remove a super administrator',
    removeIntro:
      'A removed super administrator loses access to every organisation. The removal is recorded in the log and the other super administrators are notified by e-mail. You cannot remove your own access.',
    removeCaption:
      'Super administrators, with the date they were added and the removal action.',
    removeColAddress: 'E-mail address',
    removeColAdded: 'Added on',
    removeColAction: 'Removal',
    removeYou: 'You',
    removeSelfHelp:
      'You cannot remove your own access. Another super administrator can do it.',
    removeConfirm:
      'I confirm the removal of super administrator access for {adresse}.',
    removeButton: 'Remove',
    removeButtonAria: 'Remove super administrator access for {adresse}',
    removeWorking: 'Removing…',
    removed: 'Super administrator access removed.',
    removeInvalid:
      'Tick the confirmation box on the relevant row, then try again.',
    removeSelf:
      'You cannot remove your own access. Ask another super administrator to do it.',
    removeAbsent:
      'This person is no longer a super administrator: nothing was changed.',
    removeForbidden:
      'The removal was refused. Refresh the page to see the up-to-date list.',
    removeError:
      'The removal failed, or the hourly limit of removals was reached. Try again in a moment.',
    adminsUnavailable:
      'The list of super administrators could not be read. Refresh the page in a moment.',
    journalTitle: 'Log',
    journalIntro: 'The last 100 lines. The log contains no e-mail address.',
    journalEmpty: 'The log is empty.',
    colDate: 'Date',
    colAction: 'Action',
    colActor: 'Actor',
    colResource: 'Resource',
    colQuantity: 'Quantity',
    locked: {
      title: 'Locked passwords',
      intro:
        'A password is blocked for 30 minutes after 5 failures within 15 minutes, then locked at the 6th failure within 24 hours. Only another Tenga administrator lifts the lock. The email sign-in link stays usable.',
      empty: 'No blocked or locked account.',
      colAccount: 'Account',
      colState: 'State',
      colUntil: 'Until',
      stateDefinitif: 'Locked',
      stateTemporaire: 'Blocked',
      unlock: 'Unlock',
      unlocked: 'Account unlocked.',
      colAction: 'Action',
      unlockAria: 'Unlock the password of {compte}',
      error: 'Unlocking failed. Try again in a moment.',
      unavailable: 'The list of locked accounts is temporarily unavailable.'
    }
  },
  campaigns: {
    title: 'Campaigns',
    intro:
      'A campaign brings together the people invited to answer the questionnaire. You prepare it as a draft, open it to send invitations, then close it.',
    listTitle: 'Organisation campaigns',
    empty: 'No campaign yet.',
    tableCaption:
      'Organisation campaigns, with their status, their headcounts and the actions available.',
    figureUnknown: 'Not available',
    requiredLegend: 'Fields marked with an asterisk (*) are required.',
    colTitle: 'Campaign',
    colStatus: 'Status',
    colParticipants: 'Participants',
    colInProgress: 'In progress',
    colDone: 'Completed',
    colPending: 'Pending invitations',
    colActions: 'Actions',
    statsHelp: 'These figures are totals: they do not identify anyone.',
    status: {
      brouillon: 'Draft',
      ouverte: 'Open',
      close: 'Closed'
    },
    archived:
      'This organisation is archived: no campaign can be created in it.',
    createTitle: 'Create a campaign',
    createIntro:
      'The campaign is created as a draft. It accepts no invitation until you open it.',
    titleLabel: 'Campaign title',
    titleHelp: 'Up to {max} characters.',
    titleInvalid:
      'Enter a title of {max} characters or fewer, with no link or address, then try again.',
    languageLabel: 'Campaign language',
    create: 'Create the campaign',
    created:
      'Campaign created as a draft. Open it to be able to send invitations.',
    working: 'Working…',
    open: 'Open',
    openAria: 'Open the campaign “{titre}”',
    opened:
      'Campaign “{titre}” opened. You can now invite participants. The invitation form is shown below the list.',
    closeWarning:
      'A closed campaign no longer accepts answers. Invitations left unanswered are deleted, along with the addresses they contain.',
    closeConfirm:
      'I confirm the closure: it cannot be undone and deletes pending invitations.',
    close: 'Close',
    closeAria: 'Close the campaign “{titre}”',
    closed: 'Campaign “{titre}” closed.',
    invalid:
      'The request could not be saved. Check what you entered, then try again.',
    forbidden:
      'Your role does not allow this operation. Ask a manager of the organisation to do it.',
    conflict:
      'This operation is no longer possible in the current state of the campaign or organisation. Refresh the page.',
    error: 'The operation failed. Try again in a moment.'
  },
  invitations: {
    title: 'Invite participants to “{titre}”',
    requiredLegend: 'Fields marked with an asterisk (*) are required.',
    addressesLabel: 'People to invite',
    addressesHelp:
      'One address per line, first name optional after a comma, {max} at most.',
    languageLabel: 'Invitation language',
    messageLabel: 'Personal message (optional)',
    messageHelp:
      'This message is added to the invitation. Links are not accepted.',
    counter: '{count} / {max}',
    counterLow: 'Warning: fewer than {remaining} characters left.',
    counterFull: 'You have reached the character limit.',
    submit: 'Send the invitations',
    sending: 'Sending…',
    summary: 'Invitations sent: {sent} of {total}.',
    doneNone: 'No invitation was sent.',
    summaryFailed: 'Addresses without an invitation: {failed}.',
    summaryUnprocessed:
      'Addresses not processed, kept in the list: {unprocessed}.',
    abortedError:
      'The batch stopped on an error. Send the addresses kept in the list again in a moment.',
    abortedForbidden:
      'The batch stopped: your right to invite was withdrawn while it was being sent. Ask a manager of the organisation to restore it.',
    abortedClosed:
      'The batch stopped: the campaign was closed while it was being sent.',
    failuresTitle:
      'These addresses did not receive an invitation and stay in the list for another try:',
    outcome: {
      mail_failed:
        'The e-mail was not sent. Invite this address again in a minute.',
      skipped_recent:
        'An invitation was just sent to this address. Wait a minute before renewing it.',
      refused: 'This address was refused. Check it, then try again.',
      rate_limited: 'Sending limit reached: try again in an hour.'
    },
    invalid: {
      empty: 'Enter at least one address, one per line.',
      too_many:
        'No more than {max} addresses at a time. Remove the extra lines and send them in a second batch.',
      address:
        'These lines are not valid. Correct or remove them, then send the batch again:',
      message:
        'The message must not contain a link, an address or an invisible character, and must be {max} characters or fewer. Correct it, then send the batch again.'
    },
    forbidden:
      'You cannot invite participants to this campaign. Ask a manager of the organisation.',
    closed:
      'This campaign is not open: no invitation can be sent. Refresh the page.',
    rateLimited: 'Sending limit reached: try again in an hour.',
    error:
      'The operation failed. Some invitations may have been sent: check the number of pending invitations before trying again.'
  },
  invitation: {
    title: 'Your invitation',
    invalid:
      'This invitation is no longer valid. Ask the organisation that sent it for a new one.',
    greeting: 'Hello {prenom},',
    greetingNeutral: 'Hello,',
    intro:
      '{organisation} invites you to answer the Tenga Assessments personality questionnaire, for the campaign “{campagne}”.',
    messageTitle: 'Message attached to the invitation',
    expires: 'Invitation valid until {date}.',
    acceptHelp:
      'By accepting it, you open your personal space on Tenga Assessments.',
    button: 'Accept the invitation',
    accepting: 'Opening…',
    otherSession:
      'Another session is already open on this device. Open this link in a private browsing window, or sign out first.',
    signinRequired:
      'Your invitation is accepted. To open your space, enter the e-mail address that received the invitation on the sign-in page: you will be sent a sign-in link. No password is needed.',
    signinLink: 'Go to sign-in',
    failed: 'The operation did not complete. Try again later.'
  },
  members: {
    title: 'Give access to the organisation',
    intro:
      'A manager or a consultant reaches the organisation with their e-mail address. Access is granted immediately, with no acceptance link, and the person is informed by e-mail.',
    requiredLegend: 'Fields marked with an asterisk (*) are required.',
    emailLabel: 'E-mail address',
    confirmLabel: 'Confirm the address',
    confirmHelp:
      'Enter the address a second time: a typing error would give access to someone else.',
    roleLabel: 'Role',
    rolePlaceholder: 'Choose a role',
    roleHelp:
      'If this address already has access to the organisation, its role is replaced by the one you choose.',
    languageLabel: 'Language of the information e-mail',
    working: 'Working…',
    submit: 'Give access',
    invited: 'Access granted. The person has been informed by e-mail.',
    invitedMailFailed:
      'Access granted, but the information e-mail was not sent. Let the person know yourself.',
    invalid:
      'Check the form: the address must be valid and identical in both fields, and a role must be chosen.',
    forbidden:
      'You cannot give this access. Contact the Tenga team if you think this is a mistake.',
    rateLimited: 'Limit reached: try again in an hour.',
    error: 'The operation failed. Try again later.'
  },
  common: {
    and: 'and',
    save: 'Save',
    close: 'Close',
    signature: 'Understand before you judge.'
  },
  form: {
    information: 'Information',
    informationText: 'We use the information you provide to serve you the',
    mostAccurate: 'most accurate result possible',
    readMoreAbout: 'Read more about',
    privacy: 'privacy',
    nextButton: 'Okey, next question',
    declineButton: 'continue without sharing',
    prefferedLanguage: 'My preferred language is',
    selectLanguage: 'Select a language',
    iama: 'I am a',
    male: 'Male',
    female: 'Female',
    age: 'Age',
    iam: 'I am',
    yearsOld: 'years old',
    ageWarning: 'You must be 16 or older',
    language: 'Language',
    gender: 'Gender',
    confirmInfo: 'Confirm information',
    confirm: 'Confirm',
    toTestButton: 'Alrighty, take me to the test'
  },
  test: {
    heading: 'Personality questionnaire',
    // {total}: number of statements, read from the questionnaire.
    instructions:
      'Thank you for taking this time. Here are {total} statements. For each one, answer as you usually are, not as you would like to be. There are no right or wrong answers: an honest answer is the most useful, for you first. Take as long as you like; you can stop and carry on later on this device. The 1 to 5 keys on your keyboard let you choose.',
    // {half} and {total}: halfway point and total number of statements.
    halfway:
      'You are halfway there: {half} statements out of {total}. You can take a break, your answers are kept on this device.',
    noTimeLimit: 'No time limit',
    progressBar: 'Progress through the questionnaire',
    statement: 'Statement {number}',
    prompt: 'Does this statement usually describe you?',
    progress: 'Question {current} of {total}',
    next: 'Next',
    back: 'Previous',
    seeResults: 'See my results',
    saving: 'Saving…',
    dismiss: 'Dismiss this message',
    restored:
      'We found your answers saved on this device. You can pick up where you left off, or',
    newTest: 'start again from the beginning',
    saveFailedTitle: 'Your answers are not saved yet',
    saveFailedText:
      'Saving failed, most often because the site was updated while you were answering. Your answers are still kept on this device: reload the page, then click “See my results” again.',
    reload: 'Reload the page',
    nextHelp: 'Choose an answer to continue.'
  },
  big_five: {
    title: 'What are the big five?',
    seo: {
      title: 'What are the big five?',
      description: 'Read more about the big five'
    }
  },
  openness_to_experience: {
    title: 'Openness to Experience',
    seo: {
      title: 'Overview of the domain Openness To Experience.',
      description:
        'Read more about the Openness To Experience domain in the b5 model'
    }
  },
  conscientiousness: {
    title: 'Conscientiousness',
    seo: {
      title: 'Overview of the domain Conscientiousness',
      description:
        'Read more about the Conscientiousness domain in the b5 model'
    }
  },
  extraversion: {
    title: 'Extraversion',
    seo: {
      title: 'Overview of the domain Extraversion',
      description: 'Read more about the Extraversion domain in the b5 model'
    }
  },
  agreeableness: {
    title: 'Agreeableness',
    seo: {
      title: 'Overview of the domain Agreeableness',
      description: 'Read more about the agreeableness domain in the b5 model'
    }
  },
  neuroticism: {
    title: 'Neuroticism',
    seo: {
      title: 'Overview of the domain Neuroticism',
      description: 'Read more about the Neuroticism domain in the b5 model'
    }
  },
  results: {
    surtitre: 'Questionnaire result',
    title: 'Your profile across the five major factors',
    idLabel: 'Result ID',
    idHint: 'Keep it to find this result again later.',
    copied: 'ID copied',
    backHome: 'Back to home',
    intro:
      'Here is your profile. Read it first for yourself, with curiosity: it describes tendencies, not qualities or flaws. Nothing here ranks you, nothing is a test of skills, nothing is a diagnosis.',
    interpretationNote:
      'The interpretation texts for each facet are being reviewed: until a text has been reviewed, only the facet’s level is shown.',
    print: 'Print or save as PDF',
    copyId: 'Copy ID',
    loading: 'Loading',
    seo: {
      title: 'My Big Five questionnaire results',
      description:
        'Personality profile according to the five-factor model: openness to experience, conscientiousness, extraversion, agreeableness and neuroticism.'
    }
  },
  articles: {
    back: 'All articles',
    readingTime: '{minutes} min read',
    empty: 'No article has been published in this language yet.',
    lead: 'Reading on personality and psychology.',
    inEnglish: 'These articles are written in English.',
    related: 'Read next',
    tags: 'Topics',
    share: 'Share on {reseau}'
  },
  notFound: {
    title: 'This page does not exist',
    text: 'The address may have been mistyped, or the page has moved. Start again from the home page, or go straight to the questionnaire.',
    home: 'Back to the home page',
    test: 'Start the questionnaire'
  },
  error: {
    title: 'This page could not be displayed',
    text: 'A technical problem interrupted the display. Please try again in a moment.',
    retry: 'Try again',
    contact: 'If the problem persists, write to us at <mail>{email}</mail>.',
    code: 'Incident code, to include in your message:'
  },
  // "Method and references" page. Every figure is the one read in the source
  // (docs/design/dossier-preuves.md, sheet given in src/lib/method-references.ts).
  method: {
    seo: {
      title: 'Method and references',
      description:
        'The instrument, the five domains and thirty facets, and the research references, with their exact figures and their limits.'
    },
    title: 'Method and references',
    lead: 'What the questionnaire rests on, what published research establishes, and what it does not. Every figure points to its source.',
    toc: 'On this page',
    verified:
      'References consulted on 20 October 2026. Quotations are our own translation from the English; each entry says what we read: the full text, the publisher’s abstract or a web page.',
    labels: {
      finding: 'What the source establishes',
      limit: 'Its limits',
      evidence: 'Strength of evidence',
      reading: {
        full: 'Full text read',
        abstract: 'Publisher’s abstract read',
        web: 'Web page read'
      },
      consulted: 'consulted on 20 October 2026'
    },
    instrument: {
      title: 'The instrument',
      intro:
        'The questionnaire uses the IPIP-NEO-120, published by John A. Johnson in 2014 in the Journal of Research in Personality. Its 120 statements cover the five major personality factors and, under each, six facets. The result gives a score for each of the five domains and each of the thirty facets. The statements come from the International Personality Item Pool, whose official website declares them to be in the public domain: every one can be read and examined.',
      notNeo:
        'Its facets are close to those of the NEO PI-R, a separate commercial instrument; it is not the NEO PI-R.'
    },
    domains: {
      title: 'Five domains, thirty facets',
      intro:
        'Each domain describes a tendency, not a quality or a flaw. A score shows where your answers fall between the two poles of that tendency; it does not compare you with anyone. Each domain breaks down into six facets.',
      facets: 'The six facets'
    },
    research: {
      title: 'What the research says',
      intro:
        'The references are grouped by question. For each: authors, year, journal, the figures noted in the source, the strength of evidence and the limits. We keep only work with strong or partial evidence, and we say which.',
      reading: {
        title: 'How to read the figures',
        text: 'A correlation runs from −1 to 1. The further it is from 0, the more two measures vary together; when it is negative, one falls as the other rises. Its square gives the share of shared variance: a correlation of 0.19 corresponds to about 3.6% (a calculation from our evidence file). An average hides differences between studies, and an association is not a cause.'
      },
      groups: {
        instrument: 'The instrument’s sources',
        culture: 'Do the five factors travel from one culture to another?',
        work: 'What link with job performance?',
        teams: 'Leadership and teams',
        selection: 'Flattered answers and selection: an open debate',
        feedback: 'What is feedback worth?',
        morocco: 'And in Morocco?'
      }
    },
    gaps: {
      title: 'What research does not yet establish',
      intro:
        'What our searches did not find. A study we could not find does not prove that none exists; these three gaps remain open.',
      morocco:
        'No study of measurement invariance of the IPIP-NEO-120 between Morocco and another country, or between Moroccan Arabic or French and English.',
      team: 'No study comparing people who receive a personality report with a control group, on leadership criteria.',
      norms:
        'No published population norms for interpreting individual scores: the IPIP website provides neither an interpretation manual nor norms. Our results compare you with no one.'
    },
    refs: {
      johnson2014: {
        strength:
          'Strong evidence for the basic psychometric properties, in English.',
        finding:
          '120 statements, 30 facets. Reliability alphas of the facets range from 0.63 to 0.88 (619,150 people). The four-statement scales correlate at 0.66 with those of the NEO PI-R (0.91 corrected for measurement imprecision).',
        limit:
          'The author judges the facets reliable enough for research, but writes that the tool “probably” should not be used to make important decisions about individuals. Self-selected internet samples, mostly English-speaking. No predictive validity for job performance is established in this article.'
      },
      kajonius2019: {
        strength:
          'Partial to strong evidence, for the structure, in a US population.',
        finding:
          'In 320,128 people, the fit indices of the confirmatory factor analysis are “tolerable”. The authors conclude that the IPIP-NEO-120 is “sufficiently structurally robust”.',
        limit:
          'US sample. One of the authors designed the tool. “Tolerable” means acceptable, not excellent. No test of invariance between countries is mentioned.'
      },
      ipip: {
        strength: 'Strong evidence (official source).',
        finding:
          'The website states: “The items and scales are in the public domain”. Anyone can copy, edit, translate or use them for any purpose, without permission or fee.',
        limit:
          'The website states; it gives no legal opinion. It contains neither a manual nor a guide for interpreting individual scores.'
      },
      mccrae2005: {
        strength:
          'Partial evidence for the generality of the structure; no evidence found for Morocco in particular.',
        finding:
          'Across 50 cultures and 11,985 people rated by others, the American five-factor structure is “clearly replicated in most cultures and recognizable in all”.',
        limit:
          'Ratings of other people by students, with the third-person form of the NEO PI-R: these are not self-report questionnaires at work. The list of cultures, and whether Morocco is among them, was not read.'
      },
      schmitt2007: {
        strength: 'Partial evidence.',
        finding:
          'The Big Five Inventory, translated into 28 languages and completed by 17,837 people from 56 nations, finds a five-dimension structure “robust across major regions of the world”.',
        limit:
          'The make-up of the samples was not read. The presence of Morocco and the quality of the Arabic or French translations were not checked.'
      },
      sackett2022: {
        strength: 'Strong evidence of a positive, modest association.',
        finding:
          'Mean validity of conscientiousness for predicting overall performance: 0.19 with a general measure, 0.25 with a measure contextualised to work. For the four other traits, with a general measure: 0.05 to 0.10. For comparison, the structured interview reaches 0.42. A correlation of 0.19 corresponds to about 3.6% of shared variance (a calculation from our evidence file).',
        limit:
          'Correlations are corrected for imprecision of the criterion measure, not for range restriction. The estimates rest on three meta-analyses pooled by the authors. The size depends on the corrections chosen: the previous synthesis (Schmidt and Hunter, 1998) gave 0.31 for conscientiousness.'
      },
      judge2013: {
        strength: 'Strong evidence (sample size), modest effect.',
        finding:
          '1,176 correlations drawn from 410 independent samples (406,029 people), at the level of the thirty facets. The results support a hierarchical organisation into facets, sub-dimensions and traits for predicting performance.',
        limit:
          'Observed extraversion (0.16) is clearly higher than in the other meta-analyses (0.04 to 0.06), and the cause is not established. The coefficients corrected by the authors are higher than those of Sackett et al., who use other reliabilities.'
      },
      barrick2001: {
        strength:
          'Strong evidence for the direction of the effect, modest effect.',
        finding:
          'Synthesis of meta-analyses: conscientiousness is a valid predictor of performance in all occupations studied, and emotional stability a generalisable predictor of overall performance. Extraversion, openness and agreeableness predict performance only for some occupations or some criteria.',
        limit:
          'Only the abstract was read. It reports 15 meta-analyses; Sackett et al. retain 11, for a reason that was not checked. The authors themselves called for a moratorium on this kind of meta-analysis.'
      },
      judge2002: {
        strength: 'Strong evidence for the association.',
        finding:
          'Across 73 samples and 222 correlations, the five major factors are associated with leadership: extraversion 0.31, conscientiousness 0.28, openness 0.24, agreeableness 0.08, neuroticism −0.24. The multiple correlation reaches 0.48.',
        limit:
          'Association, not cause. The emergence of a leader (being perceived as one) is a different criterion from actual effectiveness. The share of self-rated measures was not read.'
      },
      peeters2006: {
        strength: 'Partial evidence.',
        finding:
          'Across 106 to 527 teams depending on the analysis, a higher mean agreeableness (0.24) and a higher mean conscientiousness (0.20) go with better team performance. A wide spread of these two traits within the team goes with lower performance (−0.12 for agreeableness, −0.24 for conscientiousness).',
        limit:
          'Student teams and professional teams combined, with different effects for emotional stability and openness. Team-level correlations, not individual ones.'
      },
      bell2007: {
        strength:
          'Partial evidence, contradictory between laboratory and field.',
        finding:
          'In the laboratory, the effects of personality on team performance are negligible. In the field, the team’s minimum agreeableness, together with its mean conscientiousness and openness, emerge as “strong predictors”.',
        limit:
          'Only the abstract was read, with no coefficient. “Strong” is the author’s term; the size of the effects was not read. A figure of 0.34 circulates in secondary sources: we do not retain it.'
      },
      birkeland2006: {
        strength:
          'Strong evidence that scores rise in an application setting; partial evidence on the consequence for validity.',
        finding:
          'Across 33 studies, job applicants score higher than non-applicants: a standardised difference of 0.44 in emotional stability, 0.45 in conscientiousness, 0.11 in extraversion, 0.13 in openness.',
        limit:
          'A comparison of groups: it does not measure individual flattering of answers. The effect on validity is not quantified in the abstract.'
      },
      morgeson2007: {
        strength: 'Partial evidence: experts’ argument, not a meta-analysis.',
        finding:
          'Five former editors of major journals judge the validity of self-report personality questionnaires “very low” for high-stakes selection, and recommend reconsidering their use in that setting.',
        limit:
          'Opinion article arising from a debate (SIOP 2004), earlier than the revision by Sackett et al. (2022), which lowered validities.'
      },
      ones2007: {
        strength: 'Partial evidence; the debate remains open.',
        finding:
          'Authors of the meta-analyses reply that hundreds of studies support the use of personality measures in recruitment, and that there is “little evidence” that flattered answers ruin their psychometric properties.',
        limit:
          'Advocacy by authors of the meta-analyses in question, earlier than the 2022 revision, which lowered several validities.'
      },
      kluger1996: {
        strength: 'Strong evidence.',
        finding:
          'Across 607 effect sizes (23,663 observations), feedback improves performance on average (d = 0.41), but over a third of interventions reduced it. Its effectiveness falls when attention moves from the task to the person.',
        limit:
          'An old study, centred on tasks. It does not concern personality questionnaires. Feedback centred on the person is less effective there than feedback centred on the task.'
      },
      chraibi2025: {
        strength:
          'Partial evidence: a Moroccan study, a different questionnaire.',
        finding:
          'Among 1,537 people in Morocco, the Arabic version of the Big Five Inventory (BFI) shows acceptable internal consistency (Cronbach’s alpha of 0.72) and good convergent and discriminant validity.',
        limit:
          'This is the 44-item BFI, not the IPIP-NEO-120. The alpha is given without specification (overall or per scale). A very recent study, not independently assessed here.'
      }
    }
  },
  // NOT USED BY THE INTERFACE. Texts approved by the client but not true today:
  // each can be published only from the lot indicated
  // (docs/plan-implementation-espace-prive.md, § 6). Activation is a simple
  // wiring step: replace the key of the current text with the key from here,
  // then delete the replaced key. A test (messages-vitrine) guarantees that no
  // file under src/ references this namespace until it is activated.
  // Lot 1: access separation and log. Lot 2: campaigns, invitations, server-side
  // resume. Lot 3: data export and deletion. Lot 4: groups and summaries.
  // Lot 6: PDF report.
  upcoming: {
    home: {
      // Lot 1 and lot 4 (anonymised team summary). Replaces home.lead.
      lead: 'A 120-statement personality questionnaire offered by Tenga Conseil to the organisations it advises. It gives leadership a group-level reading of how teams tend to work, without ever exposing an individual’s results.',
      // Lot 4 (group summary) and lot 6 (PDF).
      outcome: {
        title: 'What you get',
        text: 'A group summary: how a team tends to work across the five major factors and thirty facets. A debrief with a Tenga consultant. Ideas for use in training, team composition and change support.'
      },
      // Lot 1 and lot 4.
      hidden: {
        title: 'What your organisation does not see',
        text: 'No individual result. Group summaries are produced only from a minimum number of participants. This principle protects the honesty of answers, and so the quality of the reading.'
      },
      // Step 2 and the resume part of step 3: lot 2. Step 4: lot 4 (group
      // summary) and lot 6 (PDF).
      process: {
        title: 'From data to decision',
        step1:
          'Frame: with your leadership, we define the question to be answered.',
        step2: 'Invite: each person receives a personal invitation.',
        step3:
          'Answer: 120 statements, with no time limit, and the option to resume.',
        step4:
          'Debrief: a Tenga consultant gives each person their profile and presents the group summary to leadership.',
        step5: 'Decide: together, we draw courses of action from the reading.'
      },
      // Lot 2 (invitation, resume) and lot 6 (PDF).
      journey:
        'You receive a personal invitation. You answer at your own pace, with no time limit, and you can resume. A Tenga consultant then goes through your profile with you.'
    },
    test: {
      // Lot 2 (progress saved on the server). Replaces test.instructions.
      instructions:
        'Thank you for taking this time. Here are {total} statements. For each one, answer as you usually are, not as you would like to be. There are no right or wrong answers: an honest answer is the most useful, for you first. Take as long as you like; you can stop and carry on later. The 1 to 5 keys on your keyboard let you choose.',
      // Lot 2. Replaces test.halfway.
      halfway:
        'You are halfway there: {half} statements out of {total}. You can take a break, your answers are kept.'
    },
    results: {
      // Lot 1 (a consultant debriefs). Added to results.intro.
      introRestitution:
        'You will be able to talk it over with the Tenga consultant who goes through the result with you.'
    },
    about: {
      // Lot 1. Added to about.p4.
      restitution:
        'A consultant goes through each profile, and the person remains the first recipient of their own result.'
    },
    faq: {
      employer: {
        question: 'Does my employer see my answers?',
        // Lot 1.
        result: 'Your employer does not see your individual result.',
        // Lot 4; the threshold is read from the settings, never hard-coded.
        groups:
          'It receives group summaries, and only once a minimum number of people have answered, so that no average lets you be recognised.',
        // Lot 1 (log) and lot 4 (consultant’s individual view logged).
        consultant:
          'The Tenga consultant for your organisation, a trusted third party, may consult your profile in order to go through it with you; every consultation is recorded in a log.',
        // Lot 3 (export and deletion).
        data: 'You can download your data at any time or ask for it to be deleted.'
      }
    }
  },
  getResult: {
    surtitre: 'Questionnaire result',
    result: 'Find a result',
    explanation:
      'At the end of the questionnaire you were given a twenty-four character ID. Enter it, or paste the link to the result page, to see your profile again.',
    idInput: 'Result ID or result page link',
    urlOrId: 'For example 58a70606a835c400c8b38e84',
    invalid:
      'This ID is not in the right format: twenty-four characters, digits and the letters a to f.',
    courriel:
      'This field does not accept an email address. If you took the questionnaire with your account, your results are in',
    courrielLien: 'My results',
    getResult: 'Show the result',
    viewPrevious: 'See the last result from this browser'
  },
  niveaux: niveauxEn,
  passation: passationEn,
  mesResultats: mesResultatsEn,
  rapport: rapportEn,
  binome: binomeEn,
  synthese: syntheseEn,
  apercu: apercuEn,
  relecture: relectureEn,
  pilotage: pilotageEn,
  reseau: reseauEn,
  // Mouvement du parcours (questionnaire et résultat).
  flow: {
    railLabel: 'Result contents',
    railProfile: 'Profile',
    railScores: 'Scores',
    railDetail: 'Facets',
    railId: 'ID'
  }
};

export default english;
