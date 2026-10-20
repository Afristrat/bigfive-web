// Espaces insécables (U+00A0) avant les signes doubles et dans les guillemets.
const french = {
  language: {
    label: 'Langue'
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
    specimenTag: 'Exemple, valeurs fictives',
    chip: 'Questionnaire de personnalité, cinq grands facteurs',
    title: 'Votre personnalité, lue en cinq dimensions.',
    lead: 'Un questionnaire de 120 affirmations, sans limite de temps. Il n’y a ni bonne ni mauvaise réponse.',
    stats: {
      statements: 'affirmations',
      domains: 'domaines',
      facets: 'facettes',
      languages: 'langues'
    },
    factors: {
      title: 'Les cinq grands facteurs de la personnalité',
      intro:
        'Cinq dimensions, chacune décrite comme une tendance et non comme un jugement.',
      facets: 'Six facettes',
      N: 'Sensibilité aux émotions négatives et au stress ; ce n’est pas un diagnostic.',
      E: 'Goût de la compagnie, énergie dans l’action, expression des émotions positives.',
      O: 'Curiosité, imagination, intérêt pour les idées et les expériences nouvelles.',
      A: 'Coopération, confiance, souci d’autrui dans les relations.',
      C: 'Organisation, sens du devoir, persévérance dans ce que l’on entreprend.'
    },
    languages: {
      title: 'Trois langues',
      text: 'Disponible en français, en arabe et en anglais.'
    },
    reference: {
      title: 'Référence',
      text: 'Le questionnaire reprend l’IPIP-NEO-120 de John A. Johnson (2014), placé dans le domaine public.'
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
        'Tenga Assessments est le service d’évaluation de la personnalité de Tenga Conseil, cabinet de conseil marocain.'
    },
    title: 'À propos',
    p1: 'Tenga Assessments est le service d’évaluation de la personnalité de Tenga Conseil, cabinet de conseil marocain. Il est proposé aux organisations que le cabinet accompagne : directions, équipes de ressources humaines, consultants.',
    p2: 'Le questionnaire décrit la personnalité selon les cinq grands facteurs : ouverture à l’expérience, conscienciosité, extraversion, agréabilité et névrosisme, détaillés en trente facettes. Il reprend l’IPIP-NEO-120 de John A. Johnson (2014), issu de l’International Personality Item Pool et placé dans le domaine public.',
    p3: 'Il est proposé en français, en arabe et en anglais. Quelques formulations ont été adaptées au contexte marocain ; chacune conserve la facette mesurée et le sens de cotation de la question d’origine.',
    p4: 'Les résultats décrivent des tendances habituelles de comportement. Ils ne mesurent pas des compétences et ne constituent pas un diagnostic.',
    contact_faq:
      'Une question ? Consultez d’abord les <link>questions fréquentes</link>.',
    contact_email: 'Si vous n’y trouvez pas la réponse, écrivez-nous à {email}.'
  },
  faq: {
    title: 'Questions fréquentes',
    error: {
      question: 'Une erreur s’est affichée sur le site : que faire ?',
      answer: 'Décrivez-nous ce qui s’est passé par e-mail à {email}.'
    },
    print: {
      question: 'Comment imprimer mes résultats ?',
      answer:
        'Depuis la page de résultats, utilisez la fonction d’impression de votre navigateur, ou enregistrez la page au format PDF.'
    },
    source: {
      question: 'D’où viennent les questions ?',
      answer:
        'Les questions et le calcul des scores proviennent de l’International Personality Item Pool (ipip.ori.org), placé dans le domaine public : il s’agit de l’IPIP-NEO-120 de John A. Johnson (2014). Tenga Conseil a adapté quelques formulations au contexte marocain, sans changer ce que mesure chaque question.'
    },
    answers: {
      question: 'Y a-t-il de bonnes et de mauvaises réponses ?',
      answer:
        'Non. Chaque affirmation décrit une manière d’être. Répondez selon ce qui vous ressemble habituellement, pas selon ce que vous aimeriez être.'
    },
    diagnosis: {
      question: 'Le questionnaire établit-il un diagnostic ?',
      answer:
        'Non. Il décrit des tendances de comportement d’après vos propres réponses. Il ne mesure ni vos compétences, ni votre intelligence, ni votre santé.'
    }
  },
  toolbar: {
    home: 'Accueil',
    home_aria: 'Accueil de Tenga Assessments',
    open_menu: 'Ouvrir le menu',
    close_menu: 'Fermer le menu',
    result: 'Résultat',
    compare: 'Comparer',
    articles: 'Articles',
    privacy: 'Confidentialité',
    about: 'À propos',
    see_results: 'Voir vos résultats',
    compare_with: 'Comparez avec les autres',
    faq: 'Questions fréquentes'
  },
  common: {
    and: 'et',
    save: 'Enregistrer',
    close: 'Fermer'
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
    instructions:
      'Pour chaque affirmation, indiquez dans quelle mesure elle vous décrit tel que vous êtes habituellement, et non tel que vous aimeriez être. Répondez spontanément. Les touches 1 à 5 du clavier permettent de choisir.',
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
  getCompare: {
    title: 'Comparez des personnes ou des équipes',
    description1:
      'Comparez les résultats du test de personnalité bigfive avec plusieurs personnes.',
    description2:
      "Tapez l'ID que vous avez obtenu à partir des résultats du test, c'est-à-dire",
    description3: 'dans le champ de saisie ID',
    needToAddPeople: 'Vous devez ajouter des personnes pour les comparer',
    addAnother: 'Ajouter une autre personne',
    addPerson: 'Ajouter une personne',
    comparePeople: 'comparer les gens',
    nameOfPerson: 'Nom de cette personne',
    urlOrId: 'URL ou ID pour comparaison',
    name: 'Nom',
    invalidId:
      'Saisissez un identifiant valide, qui ne figure pas déjà dans la liste.'
  },
  results: {
    title: 'Votre profil selon les cinq grands facteurs',
    factorsTitle: 'Les cinq grands facteurs',
    radar: {
      title: 'Radar des cinq grands facteurs',
      summary: 'Graphique en radar à cinq axes, de {min} à {max}.',
      domain: 'Domaine',
      score: 'Score'
    },
    scales:
      'Échelle des domaines : {domainMin} à {domainMax}. Échelle des facettes : {facetMin} à {facetMax}.',
    detailTitle: 'Détail par domaine',
    detailHint: 'Choisissez un domaine pour voir ses six facettes.',
    idLabel: 'Identifiant de ce résultat',
    idHint: 'Conservez-le pour retrouver ce résultat plus tard.',
    copied: 'Identifiant copié',
    backHome: 'Retour à l’accueil',
    intro:
      'Ces résultats décrivent vos tendances habituelles, d’après vos propres réponses. Ils ne mesurent ni vos compétences ni votre valeur, et ne constituent pas un diagnostic.',
    outOf: 'sur {max}',
    level: {
      low: 'bas',
      neutral: 'au milieu',
      high: 'élevé'
    },
    facets: 'Facettes',
    learnMore: 'En savoir plus sur cette dimension',
    neuroticismGloss:
      'Sensibilité aux émotions négatives et au stress ; ce n’est pas un diagnostic.',
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
    back: 'Retour aux articles',
    readingTime: '{minutes} min de lecture',
    empty: 'Aucun article n’est encore publié dans cette langue.'
  },
  share: {
    facebook: 'Partager sur Facebook',
    x: 'Partager sur X',
    mail: 'Envoyer le lien par e-mail',
    copy: 'Copier le lien'
  },
  notFound: {
    title: 'Page introuvable',
    text: 'L’adresse demandée n’existe pas ou n’est plus disponible.',
    home: 'Retour à l’accueil'
  },
  error: {
    title: 'Une erreur est survenue',
    text: 'Réessayez dans un instant. Si l’erreur persiste, écrivez-nous.',
    retry: 'Réessayer'
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
  shareLinks: {
    copyLink: 'Copier le lien dans le presse-papiers',
    shareFacebook: 'Partager sur Facebook',
    shareTwitter: 'Partager sur Twitter',
    copiedLink: 'Lien copié',
    shareResults: 'Partagez vos résultats !'
  }
};

export default french;
