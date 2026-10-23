// Espaces insécables (U+00A0) avant les signes doubles et dans les guillemets.
import niveauxFr from './espace/niveaux.fr.js';
import passationFr from './espace/passation.fr.js';
import mesResultatsFr from './espace/mesResultats.fr.js';
import rapportFr from './espace/rapport.fr.js';
import binomeFr from './espace/binome.fr.js';
import syntheseFr from './espace/synthese.fr.js';
import apercuFr from './espace/apercu.fr.js';

const french = {
  language: {
    label: 'Langue'
  },
  footer: {
    tagline:
      'Le questionnaire de personnalité de Tenga Conseil : 120 affirmations, cinq domaines, trente facettes, d’après l’IPIP-NEO-120.'
  },
  a11y: {
    skip: 'Aller au contenu',
    mainNav: 'Navigation principale',
    footerNav: 'Liens du pied de page'
  },
  theme: {
    toDark: 'Passer au thème sombre',
    toLight: 'Passer au thème clair'
  },
  home: {
    eyebrow: 'Questionnaire de personnalité, par Tenga Conseil',
    specimenTag: 'Exemple, valeurs fictives',
    peak: {
      lead: 'À mesure que vous lisez, le profil se dessine, un facteur après l’autre.'
    },
    figures: {
      items: 'affirmations',
      factors: 'grands facteurs',
      facets: 'facettes',
      languages: 'langues'
    },
    title: 'Des mots précis sur votre façon de travailler.',
    lead: '120 affirmations, sans limite de temps, tirées d’un inventaire public. Vous obtenez un profil sur cinq grands facteurs et trente facettes, avec ses sources et ses limites.',
    stake: {
      title: 'Le point de départ',
      problem:
        'On compose une équipe. On conduit un changement. On choisit une formation. Chaque fois, il faut comprendre comment les personnes travaillent.',
      answer:
        'Le questionnaire donne un vocabulaire commun pour en parler\u00A0: cinq facteurs, trente facettes, des définitions publiques. Il ouvre la conversation\u00A0; il ne la remplace pas.'
    },
    research: {
      title: 'Ce que la recherche établit, et jusqu’où',
      intro:
        'Trois constats, sans en forcer la portée. Les références complètes sont publiées.',
      structure: {
        title: 'Une structure qui voyage',
        text: 'Les cinq grands facteurs ont été retrouvés dans la plupart des cultures étudiées, dans des dizaines de langues.'
      },
      work: {
        title: 'Un lien réel, mais modeste',
        text: 'Parmi les cinq facteurs, la conscienciosité est celui dont le lien avec la performance professionnelle est le plus régulièrement observé. Son ampleur est modeste.'
      },
      groups: {
        title: 'Des groupes, pas des personnes',
        text: 'Ces résultats décrivent des tendances de groupe. Ils ne prédisent pas une personne, et les traits ne sont qu’un élément parmi d’autres\u00A0: les compétences, l’expérience et le contexte comptent aussi.'
      },
      link: 'Consulter la méthode et les références'
    },
    limits: {
      title: 'Ce que le questionnaire ne fera pas',
      intro: 'Une méthode se juge aussi à ce qu’elle refuse de promettre.',
      diagnosis: {
        title: 'Il ne pose pas de diagnostic',
        text: 'Il décrit des tendances habituelles de comportement, d’après vos propres réponses.'
      },
      exam: {
        title: 'Il n’est pas un examen',
        text: 'Il n’est pas un test de compétences, d’intelligence ni un examen de santé.'
      },
      mirror: {
        title: 'Il ne dit que ce que vous dites de vous',
        text: 'Ses résultats reposent sur vos propres réponses\u00A0: une information précieuse, mais partielle.'
      },
      sorting: {
        title: 'Il n’est pas conçu pour trier des candidats',
        text: 'Quand l’enjeu est élevé, en recrutement par exemple, des réponses peuvent être embellies. Nous ne recommandons pas ce questionnaire pour sélectionner.'
      }
    },
    how: {
      title: 'Trois temps, à votre rythme',
      intro:
        'Rien à préparer, rien à réviser\u00A0: il n’y a ni bonne ni mauvaise réponse.',
      answer: {
        title: 'Vous répondez',
        text: '120 affirmations, sans limite de temps. Pour chacune, dites comment vous êtes d’habitude, pas comment vous aimeriez être. Vous pouvez vous arrêter et reprendre plus tard sur cet appareil.'
      },
      read: {
        title: 'Vous lisez votre profil',
        text: 'Cinq grands facteurs et trente facettes, chacun décrit comme une tendance. Rien ne vous classe, rien n’est un diagnostic.'
      },
      keep: {
        title: 'Vous le conservez',
        text: 'Un identifiant vous permet de retrouver votre profil. La page s’imprime, ou s’enregistre au format PDF, depuis votre navigateur.'
      }
    },
    method: {
      measured:
        'Cinq grands facteurs de la personnalité\u00A0: ouverture à l’expérience, conscienciosité, extraversion, agréabilité, névrosisme. Chacun se décompose en six facettes, soit trente tendances décrites séparément.'
    },
    factors: {
      title: 'Cinq facteurs. Trente facettes. Aucun verdict.',
      facets: 'Six facettes',
      N: 'Sensibilité aux émotions négatives et au stress, plus ou moins vive selon les personnes. C’est une tendance d’humeur, pas un diagnostic.',
      E: 'Énergie dans les échanges et dans l’action. Certains se ressourcent avec les autres\u00A0; d’autres, dans le calme.',
      O: 'Curiosité, imagination, goût de la nouveauté. Certains explorent d’abord\u00A0; d’autres s’appuient sur ce qui a fait ses preuves. Les deux manières servent.',
      A: 'Coopération, confiance, souci d’autrui. Certains privilégient l’harmonie\u00A0; d’autres, la franchise.',
      C: 'Organisation, sens du devoir, persévérance. Certains planifient tout\u00A0; d’autres improvisent mieux.'
    },
    sheet: {
      title: 'Fiche de l’instrument',
      intro: 'De quoi vérifier par vous-même, sans nous croire sur parole.',
      inventory: 'Inventaire',
      inventoryValue: 'IPIP-NEO-120, de John A. Johnson (2014)',
      origin: 'Origine des affirmations',
      originValue: 'International Personality Item Pool',
      status: 'Statut',
      statusValue: 'Domaine public',
      content: 'Contenu',
      contentValue:
        '{items} affirmations, {factors} facteurs, {facets} facettes',
      languages: 'Langues',
      duration: 'Durée',
      durationValue: 'Sans limite de temps',
      wording: 'Formulations',
      wordingValue:
        'Quelques-unes retouchées, sans changer la facette mesurée ni le sens de cotation.',
      validation: 'Validation de cette version',
      validationValue:
        'Aucune étude de validation à ce jour. Nous le disons, plutôt que de le laisser deviner.'
    },
    reference: {
      methodLink: 'Méthode et références'
    },
    faq: {
      title: 'Trois questions avant de commencer',
      all: 'Toutes les questions fréquentes'
    },
    trust: {
      title: 'Un tiers de confiance',
      text: 'Tenga Conseil est le tiers entre votre direction et vos équipes. Le consultant restitue, explique et recadre. Il ne transmet rien d’individuel à l’organisation.'
    },
    closing: {
      text: 'Pour vous-même, le questionnaire est ouvert dès maintenant. Pour votre organisation, demandez une présentation\u00A0: Tenga Conseil vous répond pour convenir d’un échange.'
    }
  },
  radar: {
    title: 'Radar des cinq grands facteurs',
    summary: 'Graphique en radar à cinq axes, de {min} à {max}.',
    domain: 'Domaine',
    score: 'Score'
  },
  seo: {
    keywords:
      'test de personnalité, questionnaire de personnalité, Big Five, cinq grands facteurs, IPIP-NEO-120, évaluation de la personnalité, Tenga Conseil, Maroc'
  },
  frontpage: {
    seo: {
      title: 'Test de personnalité Big Five | Tenga Assessments',
      description:
        'Questionnaire de personnalité de 120 affirmations, fondé sur le modèle des cinq grands facteurs (Big Five), proposé par Tenga Conseil.',
      image_alt: 'Tenga Assessments, questionnaire de personnalité'
    },
    call_to_action: 'Commencer le questionnaire',
    description: {
      reference:
        'Questions et calcul des scores : International Personality Item Pool (<ipip>ipip.ori.org</ipip>), questionnaire IPIP-NEO-120 de John A. Johnson (2014), placé dans le domaine public.'
    },
    posts: {
      subtitle: 'Repères sur la personnalité et le travail en équipe',
      all: 'Voir tous les articles'
    }
  },
  about: {
    seo: {
      title: 'À propos de Tenga Assessments',
      description:
        'Le service de questionnaires de personnalité de Tenga Conseil, cabinet de conseil marocain : un instrument du domaine public, des sources consultables, des limites écrites noir sur blanc.'
    },
    title: 'À propos',
    headline: 'Un questionnaire dont chaque source se vérifie.',
    lead: 'Tenga Assessments est le service de questionnaires de personnalité de Tenga Conseil, cabinet de conseil marocain. Nous le proposons aux organisations que nous accompagnons : directions, équipes de ressources humaines, consultants.',
    instrument: {
      title: 'L’instrument',
      text: 'Le questionnaire est l’IPIP-NEO-120 de John A. Johnson (2014), tiré de l’International Personality Item Pool et placé dans le domaine public. Nous l’avons choisi parce que sa méthode est publiée et que chacune de ses sources peut être consultée. Un outil qui touche à la personne doit pouvoir être contrôlé.'
    },
    model: {
      title: 'Ce qu’il décrit',
      text: 'Cinq grands facteurs de la personnalité, détaillés en trente facettes : l’ouverture à l’expérience, la conscienciosité, l’extraversion, l’agréabilité et le névrosisme.'
    },
    languages: {
      title: 'Trois langues',
      text: 'Vous pouvez y répondre en français, en arabe ou en anglais. Nous avons retouché quelques formulations ; chacune garde la facette mesurée et le sens de cotation de la question d’origine.'
    },
    limits: {
      title: 'Ce qu’il ne prétend pas',
      text: 'Cette version n’a fait l’objet d’aucune étude de validation. Les résultats décrivent des tendances habituelles de comportement, d’après vos propres réponses. Ce n’est ni un test de compétences ni un diagnostic.'
    },
    rule: 'Notre règle',
    contact: {
      title: 'Une question ?'
    },
    contact_faq: 'Commencez par les <link>questions fréquentes</link>.',
    contact_email: 'Si la réponse n’y est pas, écrivez-nous à {email}.'
  },
  faq: {
    title: 'Questions fréquentes',
    lead: 'Avant de répondre au questionnaire, et après : des réponses courtes, sans détour.',
    error: {
      question: 'Le site affiche une erreur. Que faire ?',
      answer:
        'Écrivez-nous à {email} en précisant la page concernée, ce que vous étiez en train de faire et le message affiché.'
    },
    print: {
      question: 'Comment imprimer mes résultats ?',
      answer:
        'Ouvrez la page de vos résultats, puis lancez l’impression de votre navigateur ou enregistrez la page au format PDF.'
    },
    science: {
      question: 'Est-ce scientifique ?',
      answer:
        'Le modèle des cinq grands facteurs a fait l’objet de très nombreuses études, dont une méta-analyse de 410 échantillons et de plus de 400 000 personnes (Judge et coll., 2013). Le questionnaire reprend un inventaire publié et placé dans le domaine public. Il n’a pas pour but de vous évaluer ni de vous classer. Ses limites, nous les disons : il décrit ce que vous dites de vous-même, et nous n’avons trouvé aucune étude qui le valide en arabe marocain ni en français pour le Maroc.'
    },
    usefulness: {
      question: 'À quoi ça sert ?',
      answer:
        'À vous donner des mots pour décrire votre façon de travailler, et à ouvrir une conversation avec vos collègues. Ce n’est pas une promesse de résultat : c’est un support de dialogue.'
    },
    source: {
      question: 'D’où viennent les questions ?',
      answer:
        'Du domaine public. Les questions et le calcul des scores sont ceux de l’IPIP-NEO-120 de John A. Johnson (2014), issu de l’International Personality Item Pool (ipip.ori.org). Tenga Conseil a retouché quelques formulations, sans changer ce que mesure chaque question.'
    },
    answers: {
      question: 'Y a-t-il de bonnes et de mauvaises réponses ?',
      answer:
        'Non. Chaque affirmation décrit une manière d’être, ni qualité ni défaut. Répondez selon ce qui vous ressemble d’habitude, pas selon ce que vous aimeriez être.'
    },
    diagnosis: {
      question: 'Le questionnaire pose-t-il un diagnostic ?',
      answer:
        'Non. Il décrit des tendances de comportement d’après vos propres réponses. Ce n’est ni un test de compétences, ni un test d’intelligence, ni un examen de santé.'
    }
  },
  toolbar: {
    home: 'Accueil',
    home_aria: 'Accueil de Tenga Assessments',
    open_menu: 'Ouvrir le menu',
    close_menu: 'Fermer le menu',
    result: 'Retrouver un résultat',
    articles: 'Articles',
    privacy: 'Confidentialité',
    about: 'À propos',
    see_results: 'Retrouver un résultat',
    faq: 'Questions fréquentes',
    account: 'Mon compte',
    presentation: 'Demander une présentation',
    method: 'Méthode et références'
  },
  // Demande de présentation. Le texte « information » est un texte juridique à
  // valider par le client (usage des données et durée de conservation).
  presentation: {
    seo: {
      title: 'Demander une présentation',
      description:
        'Demandez une présentation de Tenga Assessments, le questionnaire de personnalité de Tenga Conseil. Un consultant vous répond pour convenir d’un échange.'
    },
    title: 'Demander une présentation',
    intro:
      'Pour une équipe, un accompagnement du changement ou le développement de vos cadres : décrivez votre contexte en quelques lignes. Un consultant de Tenga Conseil vous répond par écrit, dans la langue de votre choix, pour convenir d’un échange.',
    requiredNote: 'Tous les champs sont obligatoires, sauf le message.',
    fields: {
      name: 'Prénom et nom',
      organisation: 'Organisation',
      role: 'Fonction',
      email: 'Adresse e-mail professionnelle',
      size: 'Taille de l’organisation',
      objective: 'Objectif principal',
      exchangeLocale: 'Langue souhaitée pour l’échange',
      message: 'Message (facultatif)',
      messageHint:
        'Contexte, questions, contraintes. {max} caractères au plus.',
      messageCount: '{count} / {max} caractères'
    },
    choose: 'Choisir dans la liste',
    sizes: {
      lt50: 'Moins de 50 personnes',
      from50to250: 'De 50 à 250 personnes',
      from250to1000: 'De 250 à 1000 personnes',
      gt1000: 'Plus de 1000 personnes'
    },
    objectives: {
      teamwork: 'Mieux travailler en équipe',
      change: 'Accompagner un changement',
      leaders: 'Développer des cadres',
      other: 'Autre'
    },
    consent:
      'J’accepte que Tenga Conseil utilise les informations saisies pour répondre à ma demande, comme indiqué sous le formulaire.',
    submit: 'Envoyer ma demande',
    sending: 'Envoi en cours…',
    information:
      'Les informations saisies servent uniquement à répondre à votre demande de présentation. Elles sont conservées 12 mois, puis supprimées automatiquement.',
    summary:
      'Le formulaire contient des erreurs. Corrigez les champs signalés, puis envoyez de nouveau.',
    errors: {
      required: 'Renseignez ce champ.',
      tooLong: 'Ce champ est trop long.',
      email:
        'Saisissez une adresse e-mail valide, par exemple prenom.nom@organisation.com.',
      choice: 'Choisissez une option dans la liste.',
      consent: 'Cochez cette case pour envoyer votre demande.',
      characters: 'Ce champ contient des caractères non acceptés.'
    },
    retry:
      'Votre demande est partie trop vite pour être vérifiée. Relisez-la, puis envoyez-la de nouveau.',
    failed:
      'Votre demande n’a pas pu être enregistrée. Réessayez dans quelques instants.',
    honeypot: 'Ne remplissez pas ce champ',
    success: {
      title: 'Votre demande est bien reçue',
      text: 'Merci. Tenga Conseil a enregistré votre demande de présentation. Un accusé de réception devrait arriver à l’adresse indiquée ; votre demande est de toute façon enregistrée. Pensez à vérifier vos courriers indésirables.',
      nextTitle: 'La suite',
      step1: 'Un consultant de Tenga Conseil lit votre demande.',
      step2:
        'Il vous écrit à l’adresse indiquée, dans la langue choisie, pour convenir d’un échange.',
      back: 'Retour à l’accueil'
    },
    stepSend: 'Vous décrivez votre contexte et envoyez ce formulaire.',
    cta: 'Demander une présentation',
    aboutLink:
      'Vous souhaitez une présentation de Tenga Assessments pour votre organisation\u00A0? <link>Faites-en la demande</link>.'
  },
  login: {
    title: 'Connexion',
    intro:
      'Recevez par e-mail un lien de connexion. Il est valable 15 minutes et ne sert qu’une fois.',
    stepsLabel: 'Étapes de la connexion',
    steps: {
      address: 'Saisissez votre adresse e-mail.',
      open: 'Ouvrez le message reçu.',
      confirm:
        'Cliquez sur le lien, ou saisissez sur cette page le code à 6 chiffres du message.'
    },
    emailLabel: 'Adresse e-mail',
    submit: 'Recevoir le lien',
    sending: 'Envoi…',
    invalid: 'Saisissez une adresse e-mail valide.',
    sent: 'Si cette adresse peut se connecter, un message vient d’y être envoyé : un lien et un code, valables 15 minutes.',
    sentHelp:
      'Rien reçu après quelques minutes ? Regardez dans les courriers indésirables, ou demandez un nouveau lien.',
    retry: 'Demander un nouveau lien',
    codeTitle: 'Message ouvert sur un autre appareil ?',
    codeIntro: 'Saisissez ici le code à 6 chiffres du message.',
    codeLabel: 'Code à 6 chiffres',
    codeSubmit: 'Valider le code',
    codeChecking: 'Vérification…',
    codeInvalid: 'Vérifiez l’adresse e-mail et les 6 chiffres du code.',
    codeError: 'Code incorrect ou expiré. Demandez un nouveau lien.',
    linkError:
      'Ce lien de connexion n’est plus valable. Demandez-en un nouveau.',
    password: {
      summary: 'Administrateur Tenga : connexion par mot de passe',
      intro:
        'Votre mot de passe, puis le code de votre application d’authentification.',
      stepOne: 'Étape 1 sur 2',
      stepTwo: 'Étape 2 sur 2',
      emailLabel: 'Adresse e-mail',
      passwordLabel: 'Mot de passe',
      submit: 'Continuer',
      checking: 'Vérification…',
      failed:
        'Connexion refusée. Vérifiez vos identifiants, ou recevez un lien de connexion par e-mail.',
      invalid: 'Saisissez votre adresse e-mail et votre mot de passe.',
      totpTitle: 'Code d’authentification',
      totpIntro:
        'Saisissez le code à 6 chiffres affiché par votre application d’authentification.',
      totpLabel: 'Code à 6 chiffres',
      totpSubmit: 'Me connecter',
      totpFailed:
        'Code refusé. Saisissez le code suivant, ou recommencez depuis le mot de passe.',
      restart: 'Recommencer',
      forgot: {
        open: 'Mot de passe oublié ?',
        title: 'Mot de passe oublié',
        intro:
          'Recevez un lien de connexion par e-mail. Il vous mène à Mon compte, où vous choisirez un nouveau mot de passe avec le code de votre application d’authentification.',
        lock: 'Un mot de passe verrouillé après plusieurs échecs le reste jusqu’à son déverrouillage par un autre administrateur Tenga.',
        submit: 'Recevoir le lien',
        back: 'Retour au mot de passe'
      }
    },
    connect: {
      title: 'Ouvrir votre session',
      intro:
        'Le lien ne sert qu’une fois : il est utilisé au moment où vous cliquez sur le bouton.',
      button: 'Me connecter',
      opening: 'Connexion…',
      error:
        'Ce lien n’est plus valable : il a expiré ou a déjà servi. Demandez-en un nouveau.',
      newLink: 'Demander un nouveau lien'
    }
  },
  account: {
    title: 'Mon compte',
    intro: 'Votre adresse de connexion, votre profil et vos rôles.',
    profileTitle: 'Profil',
    emailLabel: 'Adresse de connexion',
    nameLabel: 'Nom',
    nameHelp: 'Facultatif.',
    languageLabel: 'Langue',
    languages: {
      fr: 'Français',
      ar: 'العربية',
      en: 'English'
    },
    save: 'Enregistrer',
    saving: 'Enregistrement…',
    saved: 'Profil enregistré.',
    invalid: 'Vérifiez le nom (120 caractères au plus) et la langue.',
    error: 'Le profil n’a pas été enregistré. Réessayez dans un instant.',
    rolesTitle: 'Vos rôles',
    noRoles: 'Aucun rôle pour l’instant.',
    security: {
      title: 'Sécurité de la connexion',
      intro:
        'Réservé aux administrateurs Tenga. La connexion par mot de passe demande aussi le code de votre application d’authentification ; le lien de connexion par e-mail reste possible.',
      totpTitle: 'Application d’authentification',
      totpActive:
        'Activée. Son code est demandé à chaque connexion par mot de passe.',
      totpInactive: 'Non activée. Activez-la avant de définir un mot de passe.',
      totpStart: 'Activer l’application d’authentification',
      totpStarting: 'Préparation…',
      totpScan:
        'Scannez ce code QR avec votre application d’authentification, puis saisissez le code à 6 chiffres qu’elle affiche.',
      totpQrAlt: 'Code QR d’activation de l’application d’authentification',
      totpSecretLabel: 'Ou saisissez cette clé dans l’application :',
      totpCodeLabel: 'Code à 6 chiffres',
      totpConfirm: 'Confirmer',
      totpConfirming: 'Vérification…',
      totpEnabled: 'Application d’authentification activée.',
      totpFailed:
        'Code refusé. Vérifiez l’heure de votre appareil, puis réessayez.',
      error: 'L’opération n’a pas abouti. Réessayez dans un instant.',
      passwordTitle: 'Mot de passe',
      passwordIntro:
        'L’ancien mot de passe n’est pas demandé : le code de votre application d’authentification suffit. 12 caractères au moins, sans règle de composition ; une phrase de plusieurs mots convient. Les mots de passe trop courants sont refusés.',
      newLabel: 'Nouveau mot de passe',
      confirmLabel: 'Confirmez le mot de passe',
      codeLabel: 'Code d’authentification (6 chiffres)',
      save: 'Enregistrer le mot de passe',
      saving: 'Enregistrement…',
      saved: 'Mot de passe enregistré.',
      needsTotp: 'Activez d’abord l’application d’authentification.',
      mismatch: 'Les deux saisies ne correspondent pas.',
      invalid: 'Vérifiez les trois champs.',
      codeFailed: 'Code d’authentification refusé.',
      rateLimited: 'Trop de tentatives. Réessayez plus tard.',
      weak: {
        too_short: '12 caractères au moins.',
        too_long: '72 octets au plus (environ 72 caractères non accentués).',
        common:
          'Ce mot de passe est refusé : il est trop courant ou identique à l’actuel.',
        repetitive: 'Évitez un seul caractère répété.',
        contains_email:
          'Le mot de passe ne doit pas contenir votre adresse e-mail.'
      }
    },
    adminLink: 'Administration Tenga',
    logout: 'Se déconnecter'
  },
  roles: {
    responsable: 'Responsable',
    consultant: 'Consultant',
    participant: 'Participant'
  },
  admin: {
    title: 'Administration',
    intro:
      'Réservé aux administrateurs de Tenga. Chaque action est inscrite au journal.',
    organizationsTitle: 'Organisations',
    empty: 'Aucune organisation pour le moment.',
    colName: 'Nom',
    colSlug: 'Identifiant d’URL',
    colStatus: 'Statut',
    colCreated: 'Créée le',
    colResponsables: 'Responsables',
    colConsultants: 'Consultants',
    colParticipants: 'Participants',
    status: {
      active: 'Active',
      archivee: 'Archivée'
    },
    createTitle: 'Créer une organisation',
    nameLabel: 'Nom',
    slugLabel: 'Identifiant d’URL',
    slugHelp: 'Minuscules, chiffres et tirets\u00a0; 3 à 40 caractères.',
    create: 'Créer l’organisation',
    created: 'Organisation créée.',
    exists: 'Cet identifiant est déjà utilisé.',
    invalid:
      'Vérifiez les champs\u00a0: ils ne respectent pas le format attendu.',
    error: 'L’opération a échoué. Réessayez dans un instant.',
    assignTitle: 'Attribuer un rôle',
    assignIntro:
      'Un seul rôle par personne et par organisation. Si l’adresse n’a pas encore de compte, il est créé.',
    emailLabel: 'Adresse e-mail',
    organizationLabel: 'Organisation',
    roleLabel: 'Rôle',
    languageLabel: 'Langue de la personne',
    assign: 'Attribuer le rôle',
    assigned: 'Rôle attribué.',
    grantTitle: 'Ajouter un super administrateur',
    grantIntro:
      'Un super administrateur voit toutes les organisations et attribue tous les rôles. Si l’adresse n’a pas encore de compte, il est créé. L’ajout est inscrit au journal.',
    grant: 'Ajouter comme super administrateur',
    granted: 'Super administrateur ajouté.',
    grantConfirmLabel: 'Confirmer l’adresse e-mail',
    grantWorking: 'Ajout en cours…',
    requiredLegend: 'Les champs marqués d’un astérisque (*) sont obligatoires.',
    grantInvalid:
      'Vérifiez les deux adresses\u00a0: elles doivent être valides et identiques. Corrigez-les, puis réessayez.',
    grantExists:
      'Cette adresse est déjà celle d’un super administrateur\u00a0: rien n’a été modifié.',
    grantError:
      'L’ajout a échoué, ou la limite horaire d’ajouts est atteinte. Réessayez dans un instant.',
    createWorking: 'Création en cours…',
    assignWorking: 'Attribution en cours…',
    organizationPlaceholder: 'Choisissez une organisation',
    rolePlaceholder: 'Choisissez un rôle',
    removeTitle: 'Retirer un super administrateur',
    removeIntro:
      'Un super administrateur retiré perd l’accès à toutes les organisations. Le retrait est inscrit au journal et les autres super administrateurs en sont avertis par e-mail. Vous ne pouvez pas retirer votre propre accès.',
    removeCaption:
      'Super administrateurs, avec la date de leur ajout et l’action de retrait.',
    removeColAddress: 'Adresse e-mail',
    removeColAdded: 'Ajouté le',
    removeColAction: 'Retrait',
    removeYou: 'Vous',
    removeSelfHelp:
      'Vous ne pouvez pas retirer votre propre accès. Un autre super administrateur peut le faire.',
    removeConfirm:
      'Je confirme le retrait de l’accès super administrateur de {adresse}.',
    removeButton: 'Retirer',
    removeButtonAria: 'Retirer l’accès super administrateur de {adresse}',
    removeWorking: 'Retrait en cours…',
    removed: 'Accès super administrateur retiré.',
    removeInvalid:
      'Cochez la case de confirmation de la ligne concernée, puis réessayez.',
    removeSelf:
      'Vous ne pouvez pas retirer votre propre accès. Demandez à un autre super administrateur de le faire.',
    removeAbsent:
      'Cette personne n’est déjà plus super administrateur : rien n’a été modifié.',
    removeForbidden:
      'Le retrait a été refusé. Actualisez la page pour voir la liste à jour.',
    removeError:
      'Le retrait a échoué, ou la limite horaire de retraits est atteinte. Réessayez dans un instant.',
    adminsUnavailable:
      'La liste des super administrateurs n’a pas pu être lue. Actualisez la page dans un instant.',
    journalTitle: 'Journal',
    journalIntro:
      'Les 100 dernières lignes. Le journal ne contient aucune adresse e-mail.',
    journalEmpty: 'Le journal est vide.',
    colDate: 'Date',
    colAction: 'Action',
    colActor: 'Acteur',
    colResource: 'Ressource',
    colQuantity: 'Quantité',
    locked: {
      title: 'Mots de passe verrouillés',
      intro:
        'Un mot de passe est bloqué 30 minutes après 5 échecs en moins de 15 minutes, puis verrouillé au 6e échec en 24 heures. Seul un autre administrateur Tenga lève le verrouillage. Le lien de connexion par e-mail reste utilisable.',
      empty: 'Aucun compte bloqué ou verrouillé.',
      colAccount: 'Compte',
      colState: 'État',
      colUntil: 'Jusqu’à',
      stateDefinitif: 'Verrouillé',
      stateTemporaire: 'Bloqué',
      unlock: 'Déverrouiller',
      unlocked: 'Compte déverrouillé.',
      colAction: 'Action',
      unlockAria: 'Déverrouiller le mot de passe de {compte}',
      error: 'Le déverrouillage a échoué. Réessayez dans un instant.',
      unavailable:
        'La liste des comptes verrouillés est momentanément indisponible.'
    }
  },
  campaigns: {
    title: 'Campagnes',
    intro:
      'Une campagne réunit les personnes invitées à répondre au questionnaire. Vous la préparez en brouillon, vous l’ouvrez pour envoyer les invitations, puis vous la clôturez.',
    listTitle: 'Campagnes de l’organisation',
    empty: 'Aucune campagne pour le moment.',
    tableCaption:
      'Campagnes de l’organisation, avec leur statut, leurs effectifs et les actions possibles.',
    figureUnknown: 'Non disponible',
    requiredLegend: 'Les champs marqués d’un astérisque (*) sont obligatoires.',
    colTitle: 'Campagne',
    colStatus: 'Statut',
    colParticipants: 'Participants',
    colInProgress: 'En cours',
    colDone: 'Terminés',
    colPending: 'Invitations en attente',
    colActions: 'Actions',
    statsHelp:
      'Ces effectifs sont des totaux\u00a0: ils n’identifient personne.',
    status: {
      brouillon: 'Brouillon',
      ouverte: 'Ouverte',
      close: 'Clôturée'
    },
    archived:
      'Cette organisation est archivée\u00a0: aucune campagne ne peut y être créée.',
    createTitle: 'Créer une campagne',
    createIntro:
      'La campagne est créée en brouillon. Elle n’accepte aucune invitation tant que vous ne l’avez pas ouverte.',
    titleLabel: 'Titre de la campagne',
    titleHelp: '{max} caractères au plus.',
    titleInvalid:
      'Saisissez un titre de {max} caractères au plus, sans lien ni adresse, puis réessayez.',
    languageLabel: 'Langue de la campagne',
    create: 'Créer la campagne',
    created:
      'Campagne créée en brouillon. Ouvrez-la pour pouvoir envoyer les invitations.',
    working: 'Opération en cours…',
    open: 'Ouvrir',
    openAria: 'Ouvrir la campagne «\u00a0{titre}\u00a0»',
    opened:
      'Campagne «\u00a0{titre}\u00a0» ouverte. Vous pouvez maintenant inviter des participants. Le formulaire d’invitation s’affiche sous la liste.',
    closeWarning:
      'Une campagne clôturée n’accepte plus de réponses. Les invitations restées sans réponse sont supprimées, avec les adresses qu’elles contiennent.',
    closeConfirm:
      'Je confirme la clôture\u00a0: elle est irréversible et supprime les invitations en attente.',
    close: 'Clôturer',
    closeAria: 'Clôturer la campagne «\u00a0{titre}\u00a0»',
    closed: 'Campagne «\u00a0{titre}\u00a0» clôturée.',
    invalid:
      'La demande n’a pas pu être enregistrée. Vérifiez la saisie, puis réessayez.',
    forbidden:
      'Votre rôle ne permet pas cette opération. Demandez à un responsable de l’organisation de l’effectuer.',
    conflict:
      'Cette opération n’est plus possible dans l’état actuel de la campagne ou de l’organisation. Actualisez la page.',
    error: 'L’opération a échoué. Réessayez dans un instant.'
  },
  invitations: {
    title: 'Inviter des participants à «\u00a0{titre}\u00a0»',
    requiredLegend: 'Les champs marqués d’un astérisque (*) sont obligatoires.',
    addressesLabel: 'Personnes à inviter',
    addressesHelp:
      'Une adresse par ligne, prénom facultatif après une virgule, {max} au plus.',
    languageLabel: 'Langue de l’invitation',
    messageLabel: 'Message personnel (facultatif)',
    messageHelp:
      'Ce message est ajouté à l’invitation. Les liens ne sont pas acceptés.',
    counter: '{count}\u00a0/\u00a0{max}',
    counterLow: 'Attention\u00a0: moins de {remaining} caractères restants.',
    counterFull: 'Vous avez atteint la limite de caractères.',
    submit: 'Envoyer les invitations',
    sending: 'Envoi en cours…',
    summary: 'Invitations envoyées\u00a0: {sent} sur {total}.',
    doneNone: 'Aucune invitation n’est partie.',
    summaryFailed: 'Adresses sans invitation\u00a0: {failed}.',
    summaryUnprocessed:
      'Adresses non traitées, conservées dans la liste\u00a0: {unprocessed}.',
    abortedError:
      'Le lot s’est interrompu sur une erreur. Dans un instant, renvoyez les adresses conservées dans la liste.',
    abortedForbidden:
      'Le lot s’est interrompu\u00a0: votre droit d’inviter a été retiré pendant l’envoi. Demandez à un responsable de l’organisation de vous rendre ce droit.',
    abortedClosed:
      'Le lot s’est interrompu\u00a0: la campagne a été clôturée pendant l’envoi.',
    failuresTitle:
      'Ces adresses n’ont pas reçu d’invitation et restent dans la liste pour un nouvel essai\u00a0:',
    outcome: {
      mail_failed:
        'L’e-mail n’est pas parti. Invitez de nouveau cette adresse dans une minute.',
      skipped_recent:
        'Une invitation vient d’être envoyée à cette adresse. Attendez une minute avant de la renouveler.',
      refused: 'Cette adresse a été refusée. Vérifiez-la, puis réessayez.',
      rate_limited: 'Limite d’envois atteinte\u00a0: réessayez dans une heure.'
    },
    invalid: {
      empty: 'Saisissez au moins une adresse, une par ligne.',
      too_many:
        'Pas plus de {max} adresses à la fois. Retirez les lignes en trop et envoyez-les dans un second lot.',
      address:
        'Ces lignes ne sont pas valides. Corrigez-les ou retirez-les, puis renvoyez le lot\u00a0:',
      message:
        'Le message ne doit contenir ni lien, ni adresse, ni caractère invisible, et pas plus de {max} caractères. Corrigez-le, puis renvoyez le lot.'
    },
    forbidden:
      'Vous ne pouvez pas inviter de participants à cette campagne. Demandez à un responsable de l’organisation.',
    closed:
      'Cette campagne n’est pas ouverte\u00a0: aucune invitation ne peut partir. Actualisez la page.',
    rateLimited: 'Limite d’envois atteinte\u00a0: réessayez dans une heure.',
    error:
      'L’opération a échoué. Certaines invitations sont peut-être parties\u00a0: vérifiez le nombre d’invitations en attente avant de réessayer.'
  },
  invitation: {
    title: 'Votre invitation',
    invalid:
      'Cette invitation n’est plus valable. Demandez-en une nouvelle à l’organisation qui vous l’a envoyée.',
    greeting: 'Bonjour {prenom},',
    greetingNeutral: 'Bonjour,',
    intro:
      '{organisation} vous invite à répondre au questionnaire de personnalité de Tenga Assessments, pour la campagne «\u00a0{campagne}\u00a0».',
    messageTitle: 'Message joint à l’invitation',
    expires: 'Invitation valable jusqu’au {date}.',
    acceptHelp:
      'En l’acceptant, vous ouvrez votre espace personnel sur Tenga Assessments.',
    button: 'Accepter l’invitation',
    accepting: 'Ouverture…',
    otherSession:
      'Une autre session est déjà ouverte sur cet appareil. Ouvrez ce lien dans une fenêtre de navigation privée, ou déconnectez-vous d’abord.',
    // Texte à valider par Amine (T13b).
    signinRequired:
      'Votre invitation est acceptée. Pour ouvrir votre espace, saisissez sur la page de connexion l’adresse e-mail qui a reçu l’invitation\u00a0: vous y recevrez un lien de connexion. Aucun mot de passe n’est nécessaire.',
    signinLink: 'Aller à la connexion',
    failed: 'L’opération n’a pas abouti. Réessayez plus tard.'
  },
  members: {
    title: 'Donner un accès à l’organisation',
    intro:
      'Un responsable ou un consultant accède à l’organisation avec son adresse e-mail. L’accès est accordé immédiatement, sans lien d’acceptation, et la personne en est informée par e-mail.',
    requiredLegend: 'Les champs marqués d’un astérisque (*) sont obligatoires.',
    emailLabel: 'Adresse e-mail',
    confirmLabel: 'Confirmation de l’adresse',
    confirmHelp:
      'Saisissez l’adresse une seconde fois\u00a0: une faute de frappe donnerait l’accès à une autre personne.',
    roleLabel: 'Rôle',
    rolePlaceholder: 'Choisissez un rôle',
    roleHelp:
      'Si cette adresse a déjà un accès à l’organisation, son rôle est remplacé par celui que vous choisissez.',
    languageLabel: 'Langue de l’e-mail d’information',
    working: 'Opération en cours…',
    submit: 'Donner l’accès',
    invited: 'Accès accordé. La personne a été informée par e-mail.',
    invitedMailFailed:
      'Accès accordé, mais l’e-mail d’information n’est pas parti. Prévenez la personne vous-même.',
    invalid:
      'Vérifiez le formulaire\u00a0: l’adresse doit être valide et identique dans les deux champs, et un rôle doit être choisi.',
    forbidden:
      'Vous ne pouvez pas donner cet accès. Contactez l’équipe Tenga si vous pensez que c’est une erreur.',
    rateLimited: 'Limite atteinte\u00a0: réessayez dans une heure.',
    error: 'L’opération a échoué. Réessayez plus tard.'
  },
  common: {
    and: 'et',
    save: 'Enregistrer',
    close: 'Fermer',
    signature: 'Comprendre avant de juger.'
  },
  form: {
    information: 'Information',
    informationText: 'We use the information you provide to serve you the',
    mostAccurate: 'most accurate result possible',
    readMoreAbout: 'Read more about',
    privacy: 'privacy',
    nextButton: 'Okey, next question',
    declineButton: 'continue without sharing',
    prefferedLanguage: 'Ma langue préférée est',
    selectLanguage: 'Sélectionnez une langue',
    iama: 'I am a',
    male: 'Male',
    female: 'Female',
    age: 'Age',
    iam: 'I am',
    yearsOld: 'years old',
    ageWarning: 'You must be 16 or older',
    language: 'Langue',
    gender: 'Gender',
    confirmInfo: 'Confirm information',
    confirm: 'Confirm',
    toTestButton: 'Alrighty, take me to the test'
  },
  test: {
    heading: 'Questionnaire de personnalité',
    // {total} : nombre d'affirmations, lu depuis le questionnaire.
    instructions:
      'Merci de prendre ce temps. Voici {total} affirmations. Pour chacune, répondez comme vous êtes habituellement, pas comme vous aimeriez être. Il n’y a ni bonne ni mauvaise réponse : une réponse honnête est la plus utile, pour vous d’abord. Prenez le temps que vous voulez ; vous pouvez vous arrêter et reprendre plus tard sur cet appareil. Les touches 1 à 5 du clavier permettent de choisir.',
    // {half} et {total} : moitié et total des affirmations. Affiché à mi-parcours.
    halfway:
      'La moitié est faite : {half} affirmations sur {total}. Vous pouvez faire une pause, vos réponses sont conservées sur cet appareil.',
    noTimeLimit: 'Aucune limite de temps',
    progressBar: 'Progression dans le questionnaire',
    statement: 'Affirmation {number}',
    prompt: 'Cette affirmation vous décrit-elle habituellement ?',
    progress: 'Question {current} sur {total}',
    next: 'Suivant',
    back: 'Précédent',
    seeResults: 'Voir mes résultats',
    saving: 'Enregistrement…',
    dismiss: 'Masquer ce message',
    restored:
      'Nous avons retrouvé vos réponses enregistrées sur cet appareil. Vous pouvez reprendre là où vous en étiez, ou',
    newTest: 'recommencer depuis le début',
    saveFailedTitle: 'Vos réponses ne sont pas encore enregistrées',
    saveFailedText:
      'L’enregistrement a échoué, le plus souvent parce que le site a été mis à jour pendant que vous répondiez. Vos réponses restent conservées sur cet appareil : rechargez la page, puis cliquez de nouveau sur « Voir mes résultats ».',
    reload: 'Recharger la page',
    nextHelp: 'Choisissez une réponse pour passer à la suite.'
  },
  big_five: {
    title: 'What are the big five?',
    seo: {
      title: 'What are the big five?',
      description: 'Read more about the big five'
    }
  },
  openness_to_experience: {
    title: 'Ouverture à l’expérience',
    seo: {
      title: 'Overview of the domain Openness To Experience.',
      description:
        'Read more about the Openness To Experience domain in the b5 model'
    }
  },
  conscientiousness: {
    title: 'Conscienciosité',
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
    title: 'Agréabilité',
    seo: {
      title: 'Overview of the domain Agreeableness',
      description: 'Read more about the agreeableness domain in the b5 model'
    }
  },
  neuroticism: {
    title: 'Névrosisme',
    seo: {
      title: 'Overview of the domain Neuroticism',
      description: 'Read more about the Neuroticism domain in the b5 model'
    }
  },
  results: {
    title: 'Votre profil selon les cinq grands facteurs',
    idLabel: 'Identifiant de ce résultat',
    idHint: 'Conservez-le pour retrouver ce résultat plus tard.',
    copied: 'Identifiant copié',
    backHome: 'Retour à l’accueil',
    intro:
      'Voici votre profil. Lisez-le d’abord pour vous, avec curiosité : il décrit des tendances, pas des qualités ni des défauts. Rien ici ne vous classe, rien ne constitue un test de compétences, rien n’est un diagnostic.',
    interpretationNote:
      'Les textes d’interprétation de chaque facette sont en cours de relecture : tant qu’un texte n’a pas été relu, seul le niveau de la facette est affiché.',
    print: 'Imprimer ou enregistrer en PDF',
    copyId: 'Copier l’identifiant',
    loading: 'Chargement',
    seo: {
      title: 'Mes résultats au questionnaire Big Five',
      description:
        'Profil de personnalité selon les cinq grands facteurs : ouverture à l’expérience, conscienciosité, extraversion, agréabilité et névrosisme.'
    }
  },
  articles: {
    back: 'Tous les articles',
    readingTime: '{minutes} min de lecture',
    empty: 'Aucun article n’est encore publié dans cette langue.',
    lead: 'Lectures sur la personnalité et la psychologie.',
    inEnglish: 'Ces articles sont rédigés en anglais.',
    related: 'À lire ensuite',
    tags: 'Thèmes',
    share: 'Partager sur {reseau}'
  },
  notFound: {
    title: 'Cette page n’existe pas',
    text: 'L’adresse a peut-être été mal saisie, ou la page a été déplacée. Repartez de l’accueil, ou commencez directement le questionnaire.',
    home: 'Retour à l’accueil',
    test: 'Commencer le questionnaire'
  },
  error: {
    title: 'Cette page n’a pas pu s’afficher',
    text: 'Un problème technique a interrompu l’affichage. Réessayez dans un instant.',
    retry: 'Réessayer',
    contact: 'Si le problème persiste, écrivez-nous à <mail>{email}</mail>.',
    code: 'Code de l’incident, à nous indiquer :'
  },
  // Page « Méthode et références ». Chaque chiffre est celui lu dans la source
  // (docs/design/dossier-preuves.md, fiche indiquée dans src/lib/method-references.ts).
  method: {
    seo: {
      title: 'Méthode et références',
      description:
        'L’instrument, les cinq domaines et les trente facettes, et les références de la recherche, avec leurs chiffres exacts et leurs limites.'
    },
    title: 'Méthode et références',
    lead: 'Sur quoi repose le questionnaire, ce que la recherche publiée établit, et ce qu’elle n’établit pas. Chaque chiffre renvoie à sa source.',
    toc: 'Sur cette page',
    verified:
      'Références consultées le 20 octobre 2026. Les citations sont traduites de l’anglais par nos soins ; chaque fiche dit ce que nous avons lu : le texte intégral, le résumé de l’éditeur ou une page web.',
    labels: {
      finding: 'Ce que la source établit',
      limit: 'Ses limites',
      evidence: 'Niveau de preuve',
      reading: {
        full: 'Texte intégral lu',
        abstract: 'Résumé de l’éditeur lu',
        web: 'Page web lue'
      },
      consulted: 'consulté le 20 octobre 2026'
    },
    instrument: {
      title: 'L’instrument',
      intro:
        'Le questionnaire reprend l’IPIP-NEO-120, publié par John A. Johnson en 2014 dans le Journal of Research in Personality. Ses 120 affirmations couvrent les cinq grands facteurs de la personnalité et, sous chacun, six facettes. Le résultat donne un score pour chacun des cinq domaines et pour chacune des trente facettes. Les affirmations viennent de l’International Personality Item Pool, dont le site officiel les déclare dans le domaine public : chacune peut être lue et examinée.',
      notNeo:
        'Ses facettes sont proches de celles du NEO PI-R, un instrument commercial distinct ; ce n’est pas le NEO PI-R.'
    },
    domains: {
      title: 'Cinq domaines, trente facettes',
      intro:
        'Chaque domaine décrit une tendance, pas une qualité ni un défaut. Un score indique où se placent vos réponses entre les deux pôles de cette tendance ; il ne vous compare à personne. Chaque domaine se décline en six facettes.',
      facets: 'Les six facettes'
    },
    research: {
      title: 'Ce que dit la recherche',
      intro:
        'Les références sont classées par question. Pour chacune : auteurs, année, revue, chiffres relevés dans la source, niveau de preuve et limites. Nous ne retenons que des travaux à preuve forte ou partielle, et nous indiquons lequel.',
      reading: {
        title: 'Comment lire les chiffres',
        text: 'Une corrélation va de −1 à 1. Plus elle s’éloigne de 0, plus deux mesures varient ensemble ; négative, l’une baisse quand l’autre monte. Son carré donne la part de variance partagée : une corrélation de 0,19 correspond à environ 3,6 % (calcul de notre dossier de preuves). Une moyenne masque les écarts entre études, et une association n’est pas une cause.'
      },
      groups: {
        instrument: 'Les sources de l’instrument',
        culture: 'Les cinq facteurs voyagent-ils d’une culture à l’autre ?',
        work: 'Quel lien avec la performance au travail ?',
        teams: 'Leadership et équipes',
        selection: 'Réponses embellies et sélection : un débat ouvert',
        feedback: 'Que vaut un retour d’information ?',
        morocco: 'Et au Maroc ?'
      }
    },
    gaps: {
      title: 'Ce que la recherche n’établit pas encore',
      intro:
        'Ce que nos recherches n’ont pas trouvé. Une étude introuvable ne prouve pas qu’elle n’existe pas ; ces trois manques restent ouverts.',
      morocco:
        'Aucune étude d’invariance de mesure de l’IPIP-NEO-120 entre le Maroc et un autre pays, ni entre l’arabe ou le français marocains et l’anglais.',
      team: 'Aucune étude qui compare des personnes recevant un rapport de personnalité à un groupe témoin, sur des critères de leadership.',
      norms:
        'Aucune norme de population publiée pour interpréter des scores individuels : le site de l’IPIP ne fournit ni manuel d’interprétation ni norme. Nos résultats ne vous comparent à personne.'
    },
    refs: {
      johnson2014: {
        strength:
          'Preuve forte pour les propriétés psychométriques de base, en anglais.',
        finding:
          '120 affirmations, 30 facettes. Les alphas de fiabilité des facettes vont de 0,63 à 0,88 (619 150 personnes). Les échelles de quatre affirmations corrèlent à 0,66 avec celles du NEO PI-R (0,91 après correction de l’imprécision de la mesure).',
        limit:
          'L’auteur juge les facettes assez fiables pour la recherche, mais écrit que l’outil ne devrait « probablement » pas servir à prendre des décisions importantes sur des individus. Échantillons d’internautes auto-sélectionnés, surtout anglophones. Aucune validité prédictive de la performance professionnelle n’est établie dans cet article.'
      },
      kajonius2019: {
        strength:
          'Preuve partielle à forte, pour la structure, en population américaine.',
        finding:
          'Sur 320 128 personnes, les indices d’ajustement de l’analyse factorielle confirmatoire sont « tolérables ». Les auteurs concluent que l’IPIP-NEO-120 est « suffisamment robuste » dans sa structure.',
        limit:
          'Échantillon américain. L’un des auteurs est le concepteur de l’outil. « Tolérable » signifie acceptable, non excellent. Aucun test d’invariance entre pays n’est mentionné.'
      },
      ipip: {
        strength: 'Preuve forte (source officielle).',
        finding:
          'Le site déclare : « The items and scales are in the public domain ». Chacun peut les copier, les modifier, les traduire ou les utiliser à toute fin, sans autorisation ni redevance.',
        limit:
          'Le site déclare ; il ne fournit pas d’avis juridique. Il ne contient ni manuel ni guide pour interpréter des scores individuels.'
      },
      mccrae2005: {
        strength:
          'Preuve partielle pour la généralité de la structure ; aucune preuve trouvée pour le Maroc en particulier.',
        finding:
          'Sur 50 cultures et 11 985 personnes évaluées par des tiers, la structure américaine en cinq facteurs est « clairement répliquée dans la plupart des cultures et reconnaissable dans toutes ».',
        limit:
          'Évaluations de tiers par des étudiants, avec la version à la troisième personne du NEO PI-R : ce ne sont pas des auto-questionnaires en entreprise. La liste des cultures, et la présence ou non du Maroc, n’ont pas été lues.'
      },
      schmitt2007: {
        strength: 'Preuve partielle.',
        finding:
          'Le Big Five Inventory, traduit en 28 langues et passé par 17 837 personnes de 56 nations, retrouve une structure à cinq dimensions « robuste dans les grandes régions du monde ».',
        limit:
          'La composition des échantillons n’a pas été lue. La présence du Maroc et la qualité des traductions arabe ou française n’ont pas été vérifiées.'
      },
      sackett2022: {
        strength: 'Preuve forte d’une association positive et modeste.',
        finding:
          'Validité moyenne de la conscienciosité pour prédire la performance globale : 0,19 en mesure générale, 0,25 en mesure contextualisée au travail. Pour les quatre autres traits, en mesure générale : de 0,05 à 0,10. À titre de comparaison, l’entretien structuré atteint 0,42. Une corrélation de 0,19 correspond à environ 3,6 % de variance partagée (calcul de notre dossier de preuves).',
        limit:
          'Les corrélations sont corrigées de l’imprécision de la mesure du critère, non de la restriction d’étendue. Les estimations reposent sur trois méta-analyses agrégées par les auteurs. La grandeur dépend des corrections retenues : la synthèse précédente (Schmidt et Hunter, 1998) donnait 0,31 pour la conscienciosité.'
      },
      judge2013: {
        strength: 'Preuve forte (taille d’échantillon), effet modeste.',
        finding:
          '1 176 corrélations tirées de 410 échantillons indépendants (406 029 personnes), au niveau des trente facettes. Les résultats soutiennent une organisation hiérarchique en facettes, sous-dimensions et traits pour prédire la performance.',
        limit:
          'L’extraversion observée (0,16) est nettement plus élevée que dans les autres méta-analyses (0,04 à 0,06), sans que la cause soit établie. Les coefficients corrigés par les auteurs sont plus élevés que ceux de Sackett et coll., qui retiennent d’autres fiabilités.'
      },
      barrick2001: {
        strength: 'Preuve forte pour la direction de l’effet, effet modeste.',
        finding:
          'Synthèse de méta-analyses : la conscienciosité est un prédicteur valide de la performance dans toutes les professions étudiées, et la stabilité émotionnelle un prédicteur généralisable de la performance globale. L’extraversion, l’ouverture et l’agréabilité ne prédisent la performance que pour certaines professions ou certains critères.',
        limit:
          'Seul le résumé a été lu. Il annonce 15 méta-analyses ; Sackett et coll. en retiennent 11, pour une raison non vérifiée. Les auteurs appelaient eux-mêmes à un moratoire sur ce type de méta-analyse.'
      },
      judge2002: {
        strength: 'Preuve forte pour l’association.',
        finding:
          'Sur 73 échantillons et 222 corrélations, les cinq grands facteurs sont associés au leadership : extraversion 0,31, conscienciosité 0,28, ouverture 0,24, agréabilité 0,08, névrosisme −0,24. La corrélation multiple atteint 0,48.',
        limit:
          'Association, non cause. L’émergence d’un leader (être perçu comme tel) est un critère différent de son efficacité réelle. La part des mesures d’auto-évaluation n’a pas été lue.'
      },
      peeters2006: {
        strength: 'Preuve partielle.',
        finding:
          'Sur 106 à 527 équipes selon les analyses, une agréabilité moyenne plus élevée (0,24) et une conscienciosité moyenne plus élevée (0,20) vont avec une meilleure performance d’équipe. Une forte dispersion de ces deux traits au sein de l’équipe va avec une moindre performance (−0,12 pour l’agréabilité, −0,24 pour la conscienciosité).',
        limit:
          'Équipes d’étudiants et équipes professionnelles mêlées, avec des effets différents pour la stabilité émotionnelle et l’ouverture. Corrélations au niveau de l’équipe, non individuelles.'
      },
      bell2007: {
        strength:
          'Preuve partielle, contradictoire entre laboratoire et terrain.',
        finding:
          'En laboratoire, les effets de la personnalité sur la performance d’équipe sont négligeables. Sur le terrain, l’agréabilité minimale de l’équipe, ainsi que sa conscienciosité et son ouverture moyennes, ressortent comme de « forts prédicteurs ».',
        limit:
          'Seul le résumé a été lu, sans coefficient. « Fort » est le terme de l’auteur ; la taille des effets n’a pas été lue. Un chiffre de 0,34 circule dans des sources secondaires : nous ne le retenons pas.'
      },
      birkeland2006: {
        strength:
          'Preuve forte que les scores montent en contexte de candidature ; preuve partielle sur la conséquence pour la validité.',
        finding:
          'Sur 33 études, les candidats à un emploi obtiennent des scores plus élevés que les non-candidats : écart standardisé de 0,44 en stabilité émotionnelle, 0,45 en conscienciosité, 0,11 en extraversion, 0,13 en ouverture.',
        limit:
          'Comparaison de groupes : elle ne mesure pas l’embellissement individuel. L’effet sur la validité n’est pas chiffré dans le résumé.'
      },
      morgeson2007: {
        strength:
          'Preuve partielle : argumentaire d’experts, non méta-analyse.',
        finding:
          'Cinq anciens rédacteurs en chef de revues majeures jugent « très faible » la validité des questionnaires de personnalité auto-déclarés pour la sélection à enjeu élevé, et recommandent de reconsidérer leur usage dans ce contexte.',
        limit:
          'Article d’opinion issu d’un débat (SIOP 2004), antérieur à la révision de Sackett et coll. (2022), qui a abaissé les validités.'
      },
      ones2007: {
        strength: 'Preuve partielle ; le débat reste ouvert.',
        finding:
          'Des auteurs des méta-analyses répondent que des centaines d’études soutiennent l’usage de mesures de personnalité en recrutement, et qu’il y a « peu de preuves » que l’embellissement des réponses ruine leurs propriétés psychométriques.',
        limit:
          'Plaidoyer d’auteurs des méta-analyses en cause, antérieur à la révision de 2022, qui a abaissé plusieurs validités.'
      },
      kluger1996: {
        strength: 'Preuve forte.',
        finding:
          'Sur 607 tailles d’effet (23 663 observations), le retour d’information améliore en moyenne la performance (d = 0,41), mais plus d’un tiers des interventions l’ont réduite. Son efficacité diminue quand l’attention passe de la tâche à la personne.',
        limit:
          'Étude ancienne, centrée sur des tâches. Elle ne porte pas sur les questionnaires de personnalité. Le retour centré sur la personne y est moins efficace que le retour centré sur la tâche.'
      },
      chraibi2025: {
        strength: 'Preuve partielle : étude marocaine, autre questionnaire.',
        finding:
          'Auprès de 1 537 personnes au Maroc, la version arabe du Big Five Inventory (BFI) présente une cohérence interne acceptable (alpha de Cronbach de 0,72) et de bonnes validités convergente et discriminante.',
        limit:
          'C’est le BFI, à 44 items, non l’IPIP-NEO-120. L’alpha est donné sans précision (global ou par échelle). Étude très récente, non évaluée de façon indépendante ici.'
      }
    }
  },
  // NON UTILISÉ PAR L'INTERFACE. Textes validés par le client mais qui ne sont
  // pas vrais aujourd'hui : chacun n'est publiable qu'à partir du lot indiqué
  // (docs/plan-implementation-espace-prive.md, § 6). L'activation est un simple
  // câblage : remplacer la clé du texte en vigueur par la clé d'ici, puis
  // supprimer la clé remplacée. Un test (messages-vitrine) garantit qu'aucun
  // fichier de src/ ne référence cet espace tant qu'il n'est pas activé.
  // Lot 1 : cloisonnement et journal. Lot 2 : campagnes, invitations, reprise
  // sur serveur. Lot 3 : export et suppression des données. Lot 4 : groupes et
  // synthèses. Lot 6 : restitution PDF.
  upcoming: {
    home: {
      // Lot 1 et lot 4 (synthèse d'équipe anonymisée). Remplace home.lead.
      lead: 'Un questionnaire de 120 affirmations, une synthèse d’équipe anonymisée, un consultant pour en tirer des décisions.',
      // Lot 4 (synthèse de groupe) et lot 6 (PDF).
      outcome: {
        title: 'Ce que vous obtenez',
        text: 'Une synthèse de groupe : la façon dont une équipe a tendance à fonctionner sur les cinq grands facteurs et trente facettes. Un entretien de restitution avec un consultant Tenga. Des pistes d’usage pour la formation, la composition d’équipe et l’accompagnement du changement.'
      },
      // Lot 1 et lot 4.
      hidden: {
        title: 'Ce que votre organisation ne voit pas',
        text: 'Aucun résultat individuel. Les synthèses de groupe ne sont produites qu’à partir d’un nombre minimal de participants. Ce principe protège la sincérité des réponses, donc la qualité de la lecture.'
      },
      // Étape 2 et reprise de l'étape 3 : lot 2. Étape 4 : lot 4 (synthèse de
      // groupe) et lot 6 (PDF).
      process: {
        title: 'De la donnée à la décision',
        step1:
          'Cadrer : nous définissons avec votre direction la question à éclairer.',
        step2: 'Inviter : chaque personne reçoit une invitation personnelle.',
        step3:
          'Répondre : 120 affirmations, sans limite de temps, avec reprise possible.',
        step4:
          'Restituer : un consultant Tenga remet son profil à chaque personne et présente la synthèse de groupe à la direction.',
        step5:
          'Décider : ensemble, nous tirons de la lecture des pistes d’action.'
      },
      // Lot 2 (invitation, reprise) et lot 6 (PDF).
      journey:
        'Vous recevez une invitation personnelle. Vous répondez à votre rythme, sans limite de temps, avec reprise possible. Un consultant Tenga vous restitue ensuite votre profil.'
    },
    test: {
      // Lot 2 (progression enregistrée sur le serveur). Remplace test.instructions.
      instructions:
        'Merci de prendre ce temps. Voici {total} affirmations. Pour chacune, répondez comme vous êtes habituellement, pas comme vous aimeriez être. Il n’y a ni bonne ni mauvaise réponse : une réponse honnête est la plus utile, pour vous d’abord. Prenez le temps que vous voulez ; vous pouvez vous arrêter et reprendre plus tard. Les touches 1 à 5 du clavier permettent de choisir.',
      // Lot 2. Remplace test.halfway.
      halfway:
        'La moitié est faite : {half} affirmations sur {total}. Vous pouvez faire une pause, vos réponses sont conservées.'
    },
    results: {
      // Lot 1 (consultant qui restitue). S'ajoute à results.intro.
      introRestitution:
        'Vous pourrez en parler avec le consultant Tenga qui vous restitue le résultat.'
    },
    about: {
      // Lot 1. S'ajoute à about.p4.
      restitution:
        'Un consultant restitue chaque profil, et la personne reste la première destinataire de son résultat.'
    },
    faq: {
      employer: {
        question: 'Est-ce que mon employeur voit mes réponses ?',
        // Lot 1.
        result: 'Votre employeur ne voit pas votre résultat individuel.',
        // Lot 4 ; le seuil se lit dans les réglages, jamais en dur.
        groups:
          'Il reçoit des synthèses de groupe, et seulement lorsqu’un nombre minimal de personnes ont répondu, pour qu’aucune moyenne ne permette de vous reconnaître.',
        // Lot 1 (journal) et lot 4 (vue individuelle du consultant journalisée).
        consultant:
          'Le consultant Tenga de votre organisation, tiers de confiance, peut consulter votre profil pour vous le restituer ; chaque consultation est consignée dans un journal.',
        // Lot 3 (export et suppression).
        data: 'Vous pouvez à tout moment télécharger vos données ou demander leur suppression.'
      }
    }
  },
  getResult: {
    result: 'Résultat',
    explanation:
      "Si vous avez passé le test et enregistré votre identifiant, vous pouvez voir les résultats ici en tapant l'identifiant que vous avez obtenu, c'est-à-dire",
    idInput: 'dans le champ de saisie ID',
    urlOrId: 'URL ou ID de votre résultat',
    getResult: 'Obtenez le résultat',
    viewPrevious: 'Afficher le résultat précédent'
  },
  niveaux: niveauxFr,
  passation: passationFr,
  mesResultats: mesResultatsFr,
  rapport: rapportFr,
  binome: binomeFr,
  synthese: syntheseFr,
  apercu: apercuFr,
  // Mouvement du parcours (questionnaire et résultat).
  flow: {
    railLabel: 'Sommaire du résultat',
    railProfile: 'Profil',
    railScores: 'Scores',
    railDetail: 'Facettes',
    railId: 'Identifiant'
  }
};

export default french;
