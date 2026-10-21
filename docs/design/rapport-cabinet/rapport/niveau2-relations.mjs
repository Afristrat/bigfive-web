// Niveau 2 du rapport « cabinet » : analyse de relation (binôme). Fonctions pures, aucun aléa, aucun modèle.
// construire(ctx) -> { niveau: { id: 'n2-relations', titre, sections }, recommandations }
// ctx = { cas, faits, profils, bib, regles, refs } (objets déjà chargés).
// Un chapitre par relation de faits.relations, seulement si les deux personnes ont consenti au binôme.
// Chaque chapitre : cadre (rubrique 0) puis les cinq rubriques de l'annexe A du mandat :
// 1 synergies, 2 frictions, 3 règles de fonctionnement, 4 scénarios et pré-mortem, 5 recommandations.
import { DOMAINES, NIVEAU_FR, liste, bloc, paragraphe, recommandation, section, personne } from './outils.mjs';

// ---------------------------------------------------------------- formats
/** Nombre repris de faits tel quel : virgule décimale, sans arrondi au-delà de quatre décimales (l'audit compare aux faits). */
const exact = (x) => {
  if (!Number.isFinite(x)) throw new Error(`exact : nombre attendu, reçu ${x}`);
  return String(Number(x.toFixed(4))).replace('.', ',');
};
const remplir = (t, vars) => t.replace(/\{(\w+)\}/g, (_, k) => {
  if (!(k in vars)) throw new Error(`gabarit : variable ${k} manquante dans « ${t.slice(0, 50)} »`);
  return vars[k];
});

const NATURE_FR = {
  ligne: 'ligne hiérarchique directe',
  fonctionnel: 'lien fonctionnel',
  pairs: 'pairs',
  'client-fournisseur': 'client-fournisseur interne',
  mentorat: 'mentorat',
  'co-direction': 'co-direction'
};
const INT_FR = { sequentielle: 'séquentielle', reciproque: 'réciproque', 'mise-en-commun': 'mise en commun' };
const CLASSE_FR = { proche: 'proche', intermediaire: 'intermédiaire', notable: 'notable' };
const SYMETRIQUES = new Set(['pairs', 'co-direction']);

const DOM_COURT = { N: 'sensibilité à la tension', E: 'énergie relationnelle', O: 'ouverture aux idées nouvelles', A: 'façon de coopérer et de traiter un désaccord', C: 'organisation et suivi des engagements' };

// ---------------------------------------------------------------- gabarits rédigés (jamais improvisés)
// Les lectures commencent par « Il se peut » : ce sont des hypothèses. {X} est la personne la plus haute sur l'axe, {Y} l'autre.
const FRICTION = {
  N: {
    ligne: 'Il se peut que {X} signale plus tôt ses inquiétudes sur le calendrier ou sur les décisions du siège, et que {Y} les entende comme une demande de réassurance plutôt que comme un risque à traiter.',
    fonctionnel: 'Il se peut que les relances de {X} sur les risques soient reçues par {Y} comme de la pression, alors qu’aucune des deux personnes n’a l’autorité directe de trancher à la place de l’autre.',
    mentorat: 'Il se peut que les doutes de {X} soient dits tard ou pas du tout dans l’échange, et que {Y} n’ait alors pas l’occasion d’y répondre.',
    'client-fournisseur': 'Il se peut que {X} réagisse plus vivement à un retard ou à une demande qui change, et que {Y} y voie une exigence de plus plutôt qu’un signal d’alerte sur le livrable.',
    pairs: 'Il se peut que {X} veuille lever une incertitude tout de suite quand {Y} juge pouvoir attendre, et que, sans arbitre entre elles, ce désaccord sur le bon moment de décider reste sans issue.',
    'co-direction': 'Il se peut que {X} veuille sécuriser un point avant de s’engager devant le siège ou l’équipe quand {Y} préfère avancer ; sans règle de décision à deux, cet écart peut ralentir ou crisper les arbitrages.'
  },
  E: {
    ligne: 'Il se peut que {X} occupe davantage l’espace des échanges quotidiens et que {Y} réponde avec moins de mots ; l’un risque alors de lire un accord là où l’autre n’a simplement pas pris la parole.',
    fonctionnel: 'Il se peut que {X} relance plus souvent et par plus de canaux que {Y} ne le souhaite, et que {Y} paraisse peu disponible alors que son rythme de réponse est simplement plus espacé.',
    mentorat: 'Il se peut que le temps de parole soit très inégal et que l’échange de mentorat prenne la forme d’un monologue de {X} plutôt que d’un dialogue où {Y} s’exprime.',
    'client-fournisseur': 'Il se peut que {X} formule ses demandes de vive voix et dans l’instant quand {Y} préfère les recevoir par écrit pour les planifier ; des demandes non tracées peuvent alors se perdre.',
    pairs: 'Il se peut que la parole se partage de façon inégale en réunion, {X} prenant plus de place que {Y}, et que la position de {Y} soit peu entendue dans les décisions communes.',
    'co-direction': 'Il se peut que, devant l’équipe ou le siège, la voix de {X} domine et donne l’impression d’une position unique, alors que {Y} partage la responsabilité du résultat.'
  },
  O: {
    ligne: 'Il se peut que {X} propose des façons de faire nouvelles que {Y} lit comme une remise en cause des méthodes en place, et que {Y} attende un cadre précis avant d’explorer.',
    fonctionnel: 'Il se peut que {X} change plus volontiers d’approche en cours de route et que {Y} ait besoin de stabiliser les méthodes avant de s’aligner, d’où des allers-retours entre les deux fonctions.',
    mentorat: 'Il se peut que les pistes de {X} paraissent trop éloignées de l’expérience de {Y}, ou que les repères éprouvés de {Y} paraissent trop étroits à {X} : le mentorat risque alors de se réduire à des conseils peu utilisables.',
    'client-fournisseur': 'Il se peut que {X} attende que le livrable intègre des idées nouvelles quand {Y} s’en tient à la spécification reçue, ce qui crée des reprises tardives.',
    pairs: 'Il se peut que {X} et {Y} ne partagent pas la même appétence pour l’essai de solutions nouvelles et que, sans arbitre, le choix de la méthode se règle par l’usure plutôt que par un critère convenu.',
    'co-direction': 'Il se peut que {X} pousse vers des orientations nouvelles et {Y} vers l’éprouvé, et que le siège et l’équipe reçoivent des signaux différents sur le cap du lancement.'
  },
  A: {
    ligne: 'Il se peut que {X} atténue un désaccord pour préserver la relation et que {Y} le formule plus directement : une remarque franche peut être reçue comme un reproche, et un désaccord resté non dit n’être jamais traité.',
    fonctionnel: 'Il se peut que {X} accepte une demande pour ménager l’échange sans pouvoir la tenir, et que {Y} l’ait comprise comme un engagement ferme.',
    mentorat: 'Il se peut que {X} approuve les conseils reçus sans oser dire qu’ils ne conviennent pas, et que {Y} en conclue qu’ils sont utiles.',
    'client-fournisseur': 'Il se peut que {X} formule un refus ou une réserve avec beaucoup de précautions et que {Y} ne l’entende pas comme un refus, ce qui se retrouve ensuite dans les délais.',
    pairs: 'Il se peut que {X} cède sur un point pour éviter la tension et que {Y} négocie plus fermement, ce qui déplace peu à peu les décisions communes d’un seul côté.',
    'co-direction': 'Il se peut que {X} cède pour garder l’entente et que {Y} tranche plus nettement ; sans règle explicite pour trancher à deux, les décisions risquent de refléter un seul point de vue.'
  },
  C: {
    ligne: 'Il se peut que {X} attende des points d’étape précis et des engagements datés, et que {Y} préfère un cadre plus souple ; l’un peut lire le suivi comme du contrôle, l’autre la souplesse comme un manque de rigueur.',
    fonctionnel: 'Il se peut que les relances de {X} sur les échéances paraissent insistantes à {Y}, qui organise son travail sur un autre rythme.',
    mentorat: 'Il se peut que {X} attende des objectifs d’apprentissage et un suivi planifié, et que {Y} fonctionne par échanges au fil de l’eau, ce qui rend la relation peu lisible pour l’un des deux.',
    'client-fournisseur': 'Il se peut que {X} soit exigeant sur le détail et le respect des échéances et que {Y} livre selon des critères moins formalisés : les reprises se concentrent alors près des échéances.',
    pairs: 'Il se peut que {X} se charge de fait du suivi des échéances communes parce que {Y} le fait moins, ce qui crée une charge inégale que personne n’a décidée.',
    'co-direction': 'Il se peut que {X} et {Y} ne tiennent pas leurs engagements de la même façon, et que l’équipe ne sache pas à laquelle des deux s’adresser pour le suivi des échéances.'
  }
};

const COMPLEMENT = {
  N: 'Il se peut que cette différence de sensibilité à la tension devienne une ressource pour la tâche : {X} repère plus tôt les risques à instruire pendant que {Y} garde le cap quand l’incertitude monte.',
  E: 'Il se peut que cette différence d’énergie relationnelle serve la tâche : {X} peut porter la relation vers l’extérieur (siège, équipes) pendant que {Y} consolide le travail en profondeur.',
  O: 'Il se peut que cette différence d’ouverture serve la tâche : {X} peut apporter des pistes nouvelles pendant que {Y} les met à l’épreuve de l’existant, de sorte qu’exploration et sécurisation du lancement soient couvertes.',
  A: 'Il se peut que cette différence de façon de coopérer serve la tâche : {X} peut entretenir la qualité de l’échange pendant que {Y} dit plus directement ce qui ne va pas.',
  C: 'Il se peut que cette différence d’organisation serve la tâche : {X} peut tenir le cadre, les dates et le suivi pendant que {Y} garde de la souplesse face aux imprévus du lancement.'
};

const NATURE_SYN = {
  ligne: 'Dans une ligne hiérarchique, cette complémentarité ne joue que si la personne qui oriente laisse une place explicite à l’autre manière de faire.',
  fonctionnel: 'Dans un lien fonctionnel, elle ne joue que si les deux fonctions se donnent un moment régulier pour confronter leurs approches.',
  mentorat: 'En mentorat, elle prend la forme d’un échange de perspectives : la personne mentorée peut y trouver une autre façon de faire sans devoir l’adopter.',
  'client-fournisseur': 'Entre client et fournisseur internes, elle joue si la demande et la réponse sont formulées de façon à laisser voir ce que chaque fonction apporte.',
  pairs: 'Entre pairs, elle joue si aucune des deux manières de faire n’est présentée comme la référence.',
  'co-direction': 'En co-direction, elle joue si chacune des deux personnes reconnaît devant l’équipe l’apport de l’autre.'
};

const PROCHE = {
  N: 'une façon voisine de réagir à l’incertitude et à la pression, qui peut faciliter le partage des inquiétudes sur le calendrier',
  E: 'un niveau voisin d’énergie relationnelle, qui peut faciliter un rythme d’échange accepté par les deux',
  O: 'une ouverture voisine aux idées nouvelles, qui peut faciliter l’accord sur le degré de changement souhaitable',
  A: 'une manière voisine de coopérer et de traiter un désaccord, qui peut faciliter une franchise ou une prudence partagée',
  C: 'un rapport voisin à l’organisation et au suivi des engagements, qui peut faciliter l’accord sur les points d’étape'
};

const NATURE_PROCHE = {
  ligne: 'Dans une ligne hiérarchique, ces points de rencontre peuvent aider à poser des attentes claires sans longue négociation.',
  fonctionnel: 'Dans un lien fonctionnel, ils peuvent aider les deux fonctions à se comprendre sans autorité commune.',
  mentorat: 'En mentorat, ils peuvent donner un terrain d’entente pour les premiers échanges.',
  'client-fournisseur': 'Entre client et fournisseur internes, ils peuvent réduire les malentendus sur la demande.',
  pairs: 'Entre pairs, ils peuvent faciliter la décision commune en l’absence d’arbitre.',
  'co-direction': 'En co-direction, ils peuvent aider à parler d’une seule voix quand c’est utile.'
};

// Lecture croisée selon le sens (règle CAL-SENS-asymetrique) : {O} oriente, décide ou fournit ; {D} reçoit.
const SENS_CROISE = {
  ligne: {
    o: 'Du côté de {O}, qui oriente, il se peut que l’écart soit lu comme une question de méthode à faire converger vers ses priorités.',
    d: 'Du côté de {D}, dont les priorités dépendent de {O}, il se peut que l’écart soit lu comme une attente implicite d’alignement, et qu’un désaccord soit exprimé avec réserve.'
  },
  fonctionnel: {
    o: 'Du côté de {O}, il se peut que l’écart soit lu comme une demande de service à formuler plus clairement.',
    d: 'Du côté de {D}, il se peut qu’il soit lu comme une sollicitation de plus à arbitrer avec ses autres demandes.'
  },
  mentorat: {
    o: 'Du côté de {O}, qui accompagne, il se peut que l’écart soit lu comme une occasion de transmission.',
    d: 'Du côté de {D}, il se peut qu’il soit lu comme un jugement sur sa manière de faire si le choix de ce qui est retenu ne lui a pas été laissé.'
  },
  'client-fournisseur': {
    o: 'Du côté de {O}, qui fournit, il se peut que l’écart soit lu comme un écart de spécification à lever avant de livrer.',
    d: 'Du côté de {D}, qui reçoit, il se peut qu’il soit lu comme un écart de qualité à faire reprendre.'
  }
};

const INT_FRICTION = {
  sequentielle: 'Comme le travail de l’un alimente celui de l’autre, il se peut que l’écart se répercute en aval, d’abord à l’échéance « {echeance} ».',
  reciproque: 'Comme les deux personnes s’ajustent en continu, il se peut que l’écart se voie dans les échanges de tous les jours, et pas seulement à l’échéance « {echeance} ».',
  'mise-en-commun': 'Comme chacune contribue de son côté, il se peut que l’écart ne se voie qu’au moment de l’assemblage, à l’échéance « {echeance} ».'
};

const NATURE_REGLES = {
  ligne: [
    'Les priorités de la semaine sont écrites et validées ensemble par {O} et {D}, pour limiter les changements non dits.',
    '{D} peut signaler un désaccord de méthode par écrit en une ligne, sans attendre un point formel ; {O} répond sous un délai convenu.',
    'Le présent chapitre sert uniquement au calage entre {a} et {b} : il n’est pas versé à un dossier d’évaluation ni utilisé pour une décision touchant {D}.'
  ],
  fonctionnel: [
    'Toute demande d’une fonction à l’autre est formulée avec son échéance et son niveau de priorité ; la réponse précise ce qui sera fait et ce qui sera reporté.',
    'Les deux personnes conviennent de qui arbitre en cas de conflit de priorités, et à quel niveau le point remonte.'
  ],
  mentorat: [
    'Les rencontres ont un rythme fixé à l’avance, des objectifs d’apprentissage écrits par {D}, et un temps de parole réservé à {D}.',
    '{O} propose plusieurs façons de faire plutôt qu’une ; {D} choisit ce qui est retenu et peut dire qu’une piste ne convient pas sans que cela soit tenu pour un refus du mentorat.'
  ],
  'client-fournisseur': [
    'Toute demande est écrite avec un critère d’acceptation ; le fournisseur ({O}) la reformule avant de produire.',
    'Un point de revue intermédiaire est placé avant chaque échéance, pour limiter les reprises tardives.'
  ],
  pairs: [
    'Un désaccord non résolu sous un délai convenu est porté devant une tierce personne désignée à l’avance.',
    'En réunion, la parole est donnée à tour de rôle avant toute décision commune, et chacune des deux personnes reformule la position de l’autre.'
  ],
  'co-direction': [
    'Les deux personnes conviennent d’une règle écrite pour trancher à deux : qui décide de quoi, et que faire en cas d’avis opposés.',
    'Un message commun est préparé avant toute prise de parole devant l’équipe ou le siège ; les engagements pris sont consignés et repris dans le point de suivi.'
  ]
};

const INT_REGLES = {
  sequentielle: 'Un point de passage est fixé entre l’amont et l’aval avant chaque échéance du cas, avec ce qui est transmis et sous quel délai.',
  reciproque: 'Un point court d’ajustement est tenu à fréquence fixe ; chaque changement est annoncé à l’autre avant d’être appliqué.',
  'mise-en-commun': 'Chacune des deux personnes avance de son côté ; un temps d’assemblage est planifié bien avant l’échéance finale, avec un critère commun pour juger l’ensemble.'
};

const DOM_REGLE = {
  N: 'Les incertitudes et les risques sont notés dans un registre partagé, avec un niveau d’alerte convenu à l’avance, pour qu’un signalement de risque ne soit pas lu comme de l’inquiétude.',
  E: 'Un format d’échange est convenu (oral ou écrit selon le sujet), avec un temps de réflexion avant les décisions.',
  O: 'Tout changement de méthode est proposé par écrit avec ce qu’il change et ce qu’il coûte, et discuté avant d’être appliqué.',
  A: 'Les désaccords sont nommés comme tels, avec une phrase convenue à l’avance, pour éviter les non-dits.',
  C: 'Les engagements sont datés et consignés ; un point d’étape court, à fréquence convenue, remplace la relance informelle.'
};

const PREMORTEM = {
  ligne: 'des priorités modifiées sans que l’écart de méthode ait été dit, un alignement apparent qui masque un désaccord non exprimé, et un suivi vécu comme un contrôle',
  fonctionnel: 'des demandes entre fonctions sans arbitrage clair, relancées sans réponse, chaque fonction estimant avoir été claire',
  mentorat: 'des rencontres trop espacées ou trop générales, et un cadre d’apprentissage qui n’a jamais été posé',
  'client-fournisseur': 'une demande mal formulée, un livrable qui n’y correspond pas, et des reprises concentrées près des échéances',
  pairs: 'des décisions communes reportées faute d’arbitre, ou prises par défaut par l’une des deux personnes',
  'co-direction': 'des messages divergents adressés au siège et à l’équipe, et des décisions qui n’engagent en pratique qu’une des deux personnes'
};

const SCEN_RISQUE = {
  ligne: 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que toute lecture de ce chapitre qui circulerait dans la ligne hiérarchique soit reçue comme une évaluation de {D}. Le rapport ne le permet pas : le chapitre reste un support de calage entre {O} et {D}.',
  fonctionnel: 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que les écarts lus plus haut se manifestent d’abord dans les relances entre fonctions, chacune renvoyant à l’autre la cause du retard ; un arbitre désigné à l’avance limite ce renvoi.',
  mentorat: 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que {D} voie le mentorat comme une évaluation déguisée et se confie peu ; la confidentialité de l’échange est alors la condition de son usage.',
  'client-fournisseur': 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que {D} reçoive un livrable tardif ou différent de sa demande et qu’il faille le reprendre près de l’échéance ; une reformulation de la demande avant production limite ce cas.',
  pairs: 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que {a} et {b} reportent les décisions communes en attendant que l’autre cède ; un arbitre désigné à l’avance et un délai de décision limitent ce report.',
  'co-direction': 'Scénario (hypothèse) : si le risque « {risque} » se réalise, il se peut que {a} et {b} donnent des réponses différentes au siège et à l’équipe ; un message commun avant chaque prise de parole limite cet écart.'
};
const RISQUE_IDX = { ligne: 2, fonctionnel: 1, mentorat: 2, 'client-fournisseur': 0, pairs: 0, 'co-direction': 1 };

const INT_SCEN = {
  sequentielle: 'Scénario (hypothèse) : si l’amont ({O}) livre une étape avec retard, il se peut que l’aval ({D}) ne puisse pas absorber le décalage avant l’échéance « {echeance} » ; un point de passage placé en amont de l’échéance permet de le voir plus tôt.',
  reciproque: 'Scénario (hypothèse) : si les ajustements entre {a} et {b} se font au fil de l’eau sans trace, il se peut qu’un changement décidé par l’un ne soit pas connu de l’autre avant l’échéance « {echeance} » ; un point court à fréquence fixe réduit ce cas.',
  'mise-en-commun': 'Scénario (hypothèse) : si chacune des deux personnes avance de son côté, il se peut que l’assemblage final révèle des critères différents entre les deux contributions à l’échéance « {echeance} » ; un critère commun posé tôt réduit ce cas.'
};

const VERIF_DOM = {
  N: 'Demander à chacune des deux personnes un exemple récent où une incertitude sur le calendrier a été exprimée ou tue, et comment l’autre l’a reçue.',
  E: 'Demander à chacune des deux personnes comment elle préfère recevoir une demande (de vive voix ou par écrit) et un exemple récent où l’échange a été trop long ou trop court.',
  O: 'Demander à chacune des deux personnes un exemple récent de changement de méthode proposé ou reçu, et comment il a été accueilli.',
  A: 'Demander à chacune des deux personnes un exemple récent de désaccord, dit ou non dit, et ce qui a été fait ensuite.',
  C: 'Demander à chacune des deux personnes comment elle suit ses engagements et un exemple récent d’échéance tenue ou décalée.'
};
const VERIF_NAT = {
  ligne: 'Interroger séparément les deux personnes sur la façon dont les priorités sont fixées et sur ce qui se passe quand elles divergent, puis comparer les deux récits.',
  fonctionnel: 'Interroger séparément les deux personnes sur la dernière demande entre leurs fonctions : qui l’a formulée, qui l’a arbitrée, avec quel délai.',
  mentorat: 'Demander à la personne accompagnée ce qu’elle a retenu des trois dernières rencontres, et à l’autre ce qu’elle pense avoir transmis.',
  'client-fournisseur': 'Reprendre avec les deux personnes le dernier livrable : demande initiale, livrable reçu, reprises éventuelles.',
  pairs: 'Demander aux deux personnes comment le dernier désaccord a été tranché et qui a eu le dernier mot.',
  'co-direction': 'Demander aux deux personnes qui a parlé au nom des deux lors de la dernière prise de parole commune, et comment les positions avaient été préparées.'
};

const DOM_COACH = {
  N: {
    texte: 'Un coaching court, individuel pour chacune des deux personnes, sur la formulation et la réception d’un signalement de risque (dire un risque sans le dramatiser, l’entendre sans le lire comme de la pression).',
    indicateur: 'Entretien de suivi à 60 jours : chacune des deux personnes cite un risque signalé et traité depuis le début de l’action, oui ou non.'
  },
  E: {
    texte: 'Un coaching court, individuel pour chacune des deux personnes, sur l’équilibre entre prise de parole et écoute, et sur le choix du canal (oral ou écrit) selon le sujet.',
    indicateur: 'Entretien de suivi à 60 jours : chacune des deux personnes indique si le rythme et le canal d’échange lui conviennent, oui ou non.'
  },
  O: {
    texte: 'Un coaching court, individuel pour chacune des deux personnes, sur la manière de présenter un changement de méthode et de recevoir une proposition de changement.',
    indicateur: 'Entretien de suivi à 60 jours : le nombre de changements de méthode proposés par écrit puis discutés avant application, relevé auprès des deux personnes.'
  },
  A: {
    texte: 'Un coaching court, individuel pour chacune des deux personnes, sur la façon de nommer un désaccord et de recevoir une remarque franche.',
    indicateur: 'Entretien de suivi à 60 jours : chacune des deux personnes cite un désaccord nommé comme tel depuis le début de l’action, oui ou non.'
  },
  C: {
    texte: 'Un coaching court, individuel pour chacune des deux personnes, sur la façon de convenir d’engagements datés et de les suivre sans que le suivi soit vécu comme un contrôle.',
    indicateur: 'Relevé à 60 jours : la part des engagements communs datés qui sont tenus à la date convenue, relevée sur le tableau de suivi partagé.'
  }
};

const DOM_FORM = {
  N: 'Un atelier de pratique de deux heures sur le signalement et la réception d’un risque, avec pour objectifs d’apprentissage : formuler un risque de façon factuelle, convenir d’un niveau d’alerte, répondre à un signalement.',
  E: 'Un atelier de pratique de deux heures sur l’équilibre de la parole en réunion, avec pour objectifs d’apprentissage : alterner prise de parole et écoute, reformuler, choisir le bon canal.',
  O: 'Un atelier de pratique de deux heures sur la conduite d’un changement de méthode, avec pour objectifs d’apprentissage : présenter un changement et son coût, recevoir une proposition de changement, décider d’un essai.',
  A: 'Un atelier de pratique de deux heures sur le désaccord constructif, avec pour objectifs d’apprentissage : nommer un désaccord, formuler une réserve ou un refus de façon claire, recevoir une remarque franche.',
  C: 'Un atelier de pratique de deux heures sur les engagements et le suivi, avec pour objectifs d’apprentissage : convenir d’engagements datés et vérifiables, tenir un point d’étape, suivre sans contrôler.'
};

const RECO_ORG = {
  ligne: {
    texte: 'Instituer pour la ligne hiérarchique un point de priorités hebdomadaire écrit, et une voie de désaccord en une ligne, avec l’engagement écrit que ce chapitre ne sert à aucune évaluation.',
    indicateur: 'Relevé à 30 jours puis à 60 jours : le nombre de points de priorités tenus par rapport aux points prévus, et le nombre de désaccords de méthode signalés par écrit.',
    risque: 'Le point de priorités devient un contrôle perçu et la voie de désaccord reste inutilisée.'
  },
  fonctionnel: {
    texte: 'Instituer entre les deux fonctions un format de demande (échéance, priorité, critère d’acceptation) et désigner à l’avance l’arbitre des conflits de priorités.',
    indicateur: 'Relevé à 30 jours puis à 60 jours : la part des demandes entre les deux fonctions qui portent échéance et priorité, et le nombre de conflits de priorités arbitrés dans le délai convenu.',
    risque: 'Le format de demande est vécu comme une lourdeur administrative et contourné.'
  },
  mentorat: {
    texte: 'Poser le cadre du mentorat : rythme des rencontres, objectifs d’apprentissage écrits par la personne accompagnée, confidentialité de l’échange.',
    indicateur: 'Relevé à 30 jours puis à 90 jours : le nombre de rencontres tenues par rapport aux rencontres prévues, et la révision des objectifs d’apprentissage par la personne accompagnée.',
    risque: 'Les rencontres, rares ou trop générales, ne produisent pas d’apprentissage, ou le mentorat est perçu comme une évaluation déguisée.'
  },
  'client-fournisseur': {
    texte: 'Instituer entre client et fournisseur internes une demande écrite avec critère d’acceptation, reformulée par le fournisseur, et un point de revue intermédiaire avant chaque échéance.',
    indicateur: 'Relevé à 30 jours puis à 60 jours : le nombre de reprises de livrables, rapporté au nombre de livrables, avant et après l’introduction du point de revue.',
    risque: 'Le critère d’acceptation est rédigé après coup et ne protège pas contre les reprises.'
  },
  pairs: {
    texte: 'Désigner à l’avance une tierce personne pour trancher un désaccord non résolu dans un délai convenu, et instaurer la parole à tour de rôle avant toute décision commune.',
    indicateur: 'Relevé à 30 jours puis à 60 jours : le nombre de décisions communes prises dans le délai convenu, et le nombre de désaccords portés devant la tierce personne.',
    risque: 'La tierce personne est sollicitée à chaque désaccord et la relation entre pairs perd son autonomie.'
  },
  'co-direction': {
    texte: 'Écrire une règle de décision à deux (qui décide de quoi, que faire en cas d’avis opposés) et préparer un message commun avant toute prise de parole devant l’équipe ou le siège.',
    indicateur: 'Relevé à 30 jours puis à 60 jours : le nombre de prises de parole communes précédées d’un message préparé, et le nombre de décisions tranchées selon la règle écrite.',
    risque: 'La règle écrite reste théorique et les décisions continuent de se prendre au cas par cas.'
  }
};

const RECO_INT = {
  sequentielle: {
    texte: 'Mettre en place un point de passage entre l’amont et l’aval avant chaque échéance du cas, avec le détail de ce qui est transmis et du délai (mécanisme de coordination par planification).',
    indicateur: 'Relevé à chaque échéance du cas : la présence du point de passage et le respect du délai de transmission, consignés dans le plan du projet.',
    risque: 'Le point de passage est placé trop près de l’échéance pour permettre d’absorber un décalage.'
  },
  reciproque: {
    texte: 'Mettre en place un point court d’ajustement mutuel, à fréquence fixe, avec annonce de tout changement avant son application (mécanisme de coordination par ajustement mutuel).',
    indicateur: 'Relevé à 30 jours puis à 60 jours : le nombre de points d’ajustement tenus par rapport aux points prévus, et le nombre de changements annoncés avant application.',
    risque: 'Le point d’ajustement devient une réunion de plus et se vide de contenu.'
  },
  'mise-en-commun': {
    texte: 'Planifier un temps d’assemblage bien avant l’échéance finale, avec un critère commun posé au départ pour juger l’ensemble (mécanisme de coordination par standardisation).',
    indicateur: 'Relevé à 60 jours puis à 90 jours : la date du temps d’assemblage par rapport à l’échéance finale, et l’existence du critère commun écrit.',
    risque: 'Le critère commun est posé trop tard et les deux contributions divergent à l’assemblage.'
  }
};

// Facettes dont le bloc n’est jamais cité à un pair : tout le domaine N (lu au niveau du domaine seulement), O3 (émotions), O6 (opinions, donnée sensible) et A2 (usage des autres).
const SENSIBLES = new Set(['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'O3', 'O6', 'A2']);
// ponytail: liste fixe des facettes pertinentes pour la tâche du cas de démonstration (lancement d’un canal de vente en ligne, conformité, coordination avec le siège), à dériver de tache.nature si d’autres tâches arrivent.
const PERTINENTES = new Set(['E1', 'E3', 'E4', 'O4', 'O5', 'A1', 'A3', 'A4', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6']);
const citable = (k) => !SENSIBLES.has(k) && PERTINENTES.has(k);
/** Trois facettes notables les plus éloignées, citables à un pair et pertinentes pour la tâche. */
export const facettesRetenues = (rel) => rel.facettes_notables.filter((f) => citable(f.k)).slice(0, 3);

const GARDE_EMPLOI = 'GARDE-EMPLOI';
const GARDE_POP = 'GARDE-POPULATION';
const GARDE_NAT = 'GARDE-NATIONALE';

// ---------------------------------------------------------------- aides
const regleTexte = (regles, id) => {
  const r = regles.regles.find((x) => x.id === id);
  if (!r) throw new Error(`règle inconnue ${id}`);
  return r.texte.replace(/'/g, '’');
};

function orientation(rel) {
  if (rel.sens === 'b->a') return { O: rel.b, D: rel.a };
  return { O: rel.a, D: rel.b };
}

function infoDomaines(rel, faits) {
  const infos = rel.domaines.map((x) => {
    const ma = faits.personnes[rel.a].domaines[x.d].moy;
    const mb = faits.personnes[rel.b].domaines[x.d].moy;
    const aHaut = ma >= mb;
    return {
      d: x.d,
      ecart: x.ecart,
      classe: x.classe,
      a: rel.a,
      b: rel.b,
      na: faits.personnes[rel.a].domaines[x.d].niveau,
      nb: faits.personnes[rel.b].domaines[x.d].niveau,
      hi: aHaut ? rel.a : rel.b,
      lo: aHaut ? rel.b : rel.a,
      niveauHi: faits.personnes[aHaut ? rel.a : rel.b].domaines[x.d].niveau,
      niveauLo: faits.personnes[aHaut ? rel.b : rel.a].domaines[x.d].niveau
    };
  });
  return infos;
}

// élision devant un code de personne commençant par une voyelle : « de AM » devient « d’AM », « que AM » devient « qu’AM »
const elision = (t) => t.replace(/\b(de|que) (A[A-Z])\b/g, (_, m, c) => (m === 'de' ? 'd’' : 'qu’') + c).replace(/\b(De|Que) (A[A-Z])\b/g, (_, m, c) => (m === 'De' ? 'D’' : 'Qu’') + c);
// première lettre en minuscule, sauf devant un code de personne ou un sigle (AM, KB, CNDP)
const minuscule = (t) => (/^[A-ZÉÈ]{2,}(?![\p{L}])/u.test(t) ? t : t.charAt(0).toLowerCase() + t.slice(1));
const libelleFacette = (bib, k) => bib.facettes.find((f) => f.code === k).libelle.fr;
const parEcart = (infos) => [...infos].sort((p, q) => q.ecart - p.ecart || DOMAINES.indexOf(p.d) - DOMAINES.indexOf(q.d));

const phraseDomaine = (i) => `domaine ${i.d} (${DOM_COURT[i.d]}) : écart ${exact(i.ecart)}, ${CLASSE_FR[i.classe]} ; ${i.a} ${NIVEAU_FR[i.na]}, ${i.b} ${NIVEAU_FR[i.nb]}`;

const poidsDe = (rel, id) => rel.calibrage.regles.find((r) => r.id === id)?.poids;

// ---------------------------------------------------------------- chapitre d'une relation
function chapitre(ctx, rel, relCas) {
  const { cas, faits, bib, regles } = ctx;
  const pa = personne(cas, rel.a);
  const pb = personne(cas, rel.b);
  const slug = rel.id.toLowerCase();
  const { O, D } = orientation(rel);
  const natureId = `CAL-NAT-${rel.nature}`;
  const sensId = SYMETRIQUES.has(rel.nature) || rel.sens === 'reciproque' ? 'CAL-SENS-reciproque' : 'CAL-SENS-asymetrique';
  const intId = `CAL-INT-${rel.interdependance}`;
  const tacheId = `CAL-TACHE-${cas.tache.nature}`;
  const oriId = `CAL-ORI-${cas.strategie.orientation}`;
  const idsCalibrage = new Set(rel.calibrage.regles.map((r) => r.id));
  for (const id of [natureId, sensId, intId, tacheId, oriId]) {
    if (!idsCalibrage.has(id)) throw new Error(`relation ${rel.id} : la règle ${id} n’est pas dans le calibrage des faits`);
  }
  const confNat = poidsDe(rel, natureId) === 'élevé' ? 'moyenne' : 'faible';

  const infos = infoDomaines(rel, faits);
  const classees = parEcart(infos);
  const proches = infos.filter((i) => i.classe === 'proche');
  let focus = classees.filter((i) => i.classe === 'notable').slice(0, 2);
  const focusNotable = focus.length > 0;
  if (!focus.length) focus = classees.slice(0, 1);
  const ruleFocus = focusNotable ? 'ECART-notable' : `ECART-${focus[0].classe}`;
  // trois facettes notables les plus éloignées parmi celles qui sont citables à un pair et pertinentes pour la tâche
  const top3 = facettesRetenues(rel);
  const passDiff = pa.langue_passation !== pb.langue_passation;
  const echeances = cas.tache.echeances;
  const echeance = rel.interdependance === 'sequentielle' ? echeances[0] : rel.interdependance === 'reciproque' ? echeances[1] ?? echeances[0] : echeances[echeances.length - 1];
  const risques = cas.tache.risques;
  const risque = risques[RISQUE_IDX[rel.nature]] ?? risques[0];
  const vars = { O, D, a: rel.a, b: rel.b, echeance, risque };

  const sections = [];
  const nouvelle = (cle, rubrique, titre) => {
    const sid = `${slug}-${cle}`;
    const paragraphes = [];
    const s = { ...section(sid, `${rel.a} et ${rel.b} : ${titre}`, paragraphes), relation_id: rel.id, rubrique };
    sections.push(s);
    return (texte, opts) => {
      // la règle citée se place dans la phrase qui précède : « … . (règle X). » devient « … (règle X). »
      const propre = elision(texte.replace(/\.\s+\((règles? [^)]+)\)\./g, ' ($1).'));
      const p = paragraphe(`n2-${sid}-${paragraphes.length + 1}`, propre, opts);
      paragraphes.push(p);
      return p;
    };
  };

  // ------------------------------------------------ rubrique 0 : cadre
  const cadre = nouvelle('cadre', 0, `cadre de la relation (${NATURE_FR[rel.nature]})`);
  cadre(
    `Relation ${rel.id} : ${NATURE_FR[rel.nature]}, ${relCas ? `fréquence ${relCas.frequence}, ` : ''}interdépendance ${INT_FR[rel.interdependance]}. ${rel.a} : ${pa.fonction}. ${rel.b} : ${pb.fonction}. ${SYMETRIQUES.has(rel.nature) || rel.sens === 'reciproque' ? 'Le sens est réciproque : aucune direction ne domine.' : `${O} oriente, décide ou fournit pour ${D}.`}`,
    { statut: 'constate' }
  );
  const etiquettes = [pa, pb].filter((p) => p.fictif === false).map((p) => `Le profil de ${p.code} est indiqué dans le cas comme suit : « ${p.etiquette} ».`);
  if (etiquettes.length) cadre(etiquettes.join(' '), { statut: 'constate' });
  cadre(`Tâche commune, selon le cas : ${cas.tache.description}.`, { statut: 'constate' });
  cadre(
    `Écarts entre ${rel.a} et ${rel.b}, repris des faits calculés : ${infos.map(phraseDomaine).join(' ; ')}. Facettes notables les plus éloignées, retenues pour la tâche : ${top3.map((f) => `${f.k} (écart ${exact(f.ecart)} ; ${rel.a} ${NIVEAU_FR[f.niveau_a]}, ${rel.b} ${NIVEAU_FR[f.niveau_b]})`).join(' ; ')}. Le domaine N et les facettes à lecture sensible ne sont lus qu’au niveau du domaine. Langues de passation : ${rel.a} (${pa.langue_passation}), ${rel.b} (${pb.langue_passation}) ; équivalence des versions non établie.`,
    { statut: 'constate' }
  );
  cadre(
    `Règles de calibrage appliquées à cette relation : ${rel.calibrage.regles.map((r) => `${r.id} (poids ${r.poids})`).join(', ')}.`,
    { statut: 'constate' }
  );
  cadre(`${regleTexte(regles, natureId)} (règle ${natureId}, poids ${poidsDe(rel, natureId)}).`, { statut: 'hypothese', confiance: confNat, verification: VERIF_NAT[rel.nature] });
  cadre(`${regleTexte(regles, sensId)} (règle ${sensId}).`, { statut: 'hypothese', confiance: 'faible', verification: 'Demander à chacune des deux personnes qui décide de quoi dans cette relation, puis comparer les deux réponses.' });
  cadre(`${regleTexte(regles, intId)} (règle ${intId}).`, { statut: 'hypothese', confiance: 'faible', verification: 'Demander aux deux personnes à quel moment le travail de l’une dépend de celui de l’autre, et ce qui se passe en cas de retard.' });
  if (rel.nature === 'ligne') {
    cadre(
      `Dans une ligne hiérarchique, ce chapitre ne doit pas alimenter l’évaluation du travail de ${D} par ${O} ni aucune décision d’emploi (règle ${GARDE_EMPLOI}). Il est un support de calage, partagé avec le consentement des deux personnes, et pas un élément de dossier.`,
      { statut: 'constate' }
    );
  }
  if (passDiff) {
    cadre(
      `Langue de passation : ${rel.a} a répondu en ${pa.langue_passation}, ${rel.b} en ${pb.langue_passation}. ${regleTexte(regles, 'CAL-IC-PASSATION')} (règle CAL-IC-PASSATION).`,
      { statut: 'hypothese', confiance: 'faible', verification: 'Faire relire en entretien, dans la langue de travail de la relation, quelques affirmations du questionnaire par chacune des deux personnes pour vérifier que leur sens est compris de la même façon.' }
    );
  }

  // ------------------------------------------------ rubrique 1 : synergies
  const syn = nouvelle('synergies', 1, 'synergies probables sur la tâche');
  if (proches.length) {
    syn(
      `Les réponses de ${rel.a} et de ${rel.b} sont voisines sur ${liste(proches.map((i) => `le domaine ${i.d} (écart ${exact(i.ecart)})`))}. Il se peut que ce point de rencontre facilite la compréhension mutuelle : ${proches.map((i) => `pour le domaine ${i.d}, ${PROCHE[i.d]}`).join(' ; ')}. ${NATURE_PROCHE[rel.nature]} (règles ECART-proche, ${natureId}).`,
      { statut: 'hypothese', confiance: confNat, verification: proches.map((i) => VERIF_DOM[i.d]).slice(0, 2).join(' ') }
    );
  } else {
    syn(`Aucun domaine n’est classé proche entre ${rel.a} et ${rel.b} (règle ECART-proche) : la synergie se cherche dans la complémentarité des manières de faire.`, { statut: 'constate' });
  }
  for (const i of focus) {
    syn(
      `Sur le ${phraseDomaine(i)}. ${remplir(COMPLEMENT[i.d], { X: i.hi, Y: i.lo })} ${NATURE_SYN[rel.nature]} (règles ${ruleFocus}, ${natureId}).`,
      { statut: 'hypothese', confiance: confNat, verification: VERIF_DOM[i.d] }
    );
  }
  const tacheDom = {
    routine: ['C'], creative: ['O', 'E'], urgence: ['N', 'C'], projet: ['C', 'A']
  }[cas.tache.nature];
  const oriDom = {
    exploration: ['O'], exploitation: ['C'], redressement: ['N', 'C'], croissance: ['E', 'O'], conformite: ['C']
  }[cas.strategie.orientation];
  const sollicites = DOMAINES.filter((d) => tacheDom.includes(d) || oriDom.includes(d));
  const solInfos = sollicites.map((d) => infos.find((i) => i.d === d));
  const utiles = solInfos.filter((i) => i.classe === 'proche');
  const attention = solInfos.filter((i) => i.classe === 'notable');
  syn(
    `Pour cette tâche (nature : ${cas.tache.nature}) et cette orientation (${cas.strategie.orientation}), les domaines les plus sollicités sont ${liste(sollicites)}. Dans cette relation, ${utiles.length ? `${liste(utiles.map((i) => i.d))} ${utiles.length > 1 ? 'sont proches' : 'est proche'}, ce qui peut servir de socle commun` : 'aucun de ces domaines n’est proche'}${attention.length ? `, et ${liste(attention.map((i) => i.d))} ${attention.length > 1 ? 'sont notables, ce qui en fait les points d’attention' : 'est notable, ce qui en fait un point d’attention'} de la tâche` : ''} (règles ${tacheId}, ${oriId}).`,
    { statut: 'hypothese', confiance: 'faible', verification: 'Demander aux deux personnes quelles qualités la tâche exige le plus d’elles dans les trois prochains mois, et comparer avec cette lecture.' }
  );
  for (const f of top3) {
    const bha = bloc(bib, f.k, f.niveau_a);
    const bhb = bloc(bib, f.k, f.niveau_b);
    const memeBloc = bha.id === bhb.id;
    const texteApport = memeBloc
      ? `Apport possible sur la facette ${f.k} (${bha.libelle}), niveau ${NIVEAU_FR[f.niveau_a]} pour ${rel.a} et pour ${rel.b} (bloc ${bha.id}) : « ${bha.apport[0]} »`
      : `Apport possible sur la facette ${f.k} (${bha.libelle}), écart ${exact(f.ecart)}. Pour ${rel.a}, niveau ${NIVEAU_FR[f.niveau_a]} (bloc ${bha.id}) : « ${bha.apport[0]} » Pour ${rel.b}, niveau ${NIVEAU_FR[f.niveau_b]} (bloc ${bhb.id}) : « ${bhb.apport[0]} »`;
    syn(`${texteApport} (règle ECART-notable).`, {
      statut: 'hypothese',
      confiance: 'faible',
      verification: `Poser en entretien à ${rel.a} : « ${bha.question} » et à ${rel.b} : « ${bhb.question} »`,
      bloc_ids: [...new Set([bha.id, bhb.id])]
    });
  }

  // ------------------------------------------------ rubrique 2 : frictions
  const fri = nouvelle('frictions', 2, 'frictions probables sur la tâche');
  for (const i of focus) {
    fri(
      `Sur le ${phraseDomaine(i)}. ${remplir(FRICTION[i.d][rel.nature], { X: i.hi, Y: i.lo })} (règles ${ruleFocus}, ${natureId}).`,
      { statut: 'hypothese', confiance: confNat, verification: `${VERIF_DOM[i.d]} ${VERIF_NAT[rel.nature]}` }
    );
  }
  if (SENS_CROISE[rel.nature] && rel.sens !== 'reciproque') {
    const sc = SENS_CROISE[rel.nature];
    fri(
      `Lecture croisée dans les deux sens, sur le domaine ${focus[0].d} : ${(O === rel.a ? [sc.o, sc.d] : [sc.d, sc.o]).map((t) => remplir(t, vars)).join(' ')} (règle ${sensId}).`,
      { statut: 'hypothese', confiance: 'faible', verification: 'Demander à chacune des deux personnes, séparément, comment elle lit la dernière situation où les deux manières de faire se sont heurtées, puis comparer les deux lectures.' }
    );
  } else {
    fri(
      `Le sens étant réciproque, la lecture de l’écart est symétrique : chacune des deux personnes peut tenir son approche pour la référence, d’où l’intérêt d’une règle explicite (règle ${sensId}).`,
      { statut: 'hypothese', confiance: 'faible', verification: 'Demander à chacune des deux personnes comment une décision commune a été prise la dernière fois, et qui a cédé.' }
    );
  }
  fri(`${remplir(INT_FRICTION[rel.interdependance], vars)} (règle ${intId}).`, {
    statut: 'hypothese',
    confiance: 'faible',
    verification: 'Reconstituer avec les deux personnes la dernière échéance : qui attendait quoi de l’autre, et à quel moment un décalage a été vu.'
  });
  fri(
    `${regleTexte(regles, tacheId)} (règle ${tacheId}, poids ${poidsDe(rel, tacheId)}). ${regleTexte(regles, oriId)} (règle ${oriId}, poids ${poidsDe(rel, oriId)}).`,
    { statut: 'hypothese', confiance: 'faible', verification: 'Demander aux deux personnes quelles échéances du cas leur paraissent les plus sensibles et pourquoi.' }
  );
  if (passDiff) {
    fri(
      `Réserve de comparaison : ${rel.a} a répondu en ${pa.langue_passation} et ${rel.b} en ${pb.langue_passation}. Chacune des frictions ci-dessus se lit avec cette réserve : une partie de l’écart peut tenir à la langue de passation et non aux manières de faire (règle CAL-IC-PASSATION).`,
      { statut: 'hypothese', confiance: 'faible', verification: 'Vérifier en entretien, avec exemples de situations réelles, que l’écart décrit est reconnu par les deux personnes dans leur travail commun, indépendamment du questionnaire.' }
    );
  }
  for (const f of top3) {
    const bha = bloc(bib, f.k, f.niveau_a);
    const bhb = bloc(bib, f.k, f.niveau_b);
    const memeBloc = bha.id === bhb.id;
    const t = memeBloc
      ? `Coût possible sur la facette ${f.k} (${bha.libelle}), niveau ${NIVEAU_FR[f.niveau_a]} pour ${rel.a} et pour ${rel.b} (bloc ${bha.id}) : « ${bha.cout[0]} »`
      : `Coût possible sur la facette ${f.k} (${bha.libelle}), écart ${exact(f.ecart)}. Pour ${rel.a}, niveau ${NIVEAU_FR[f.niveau_a]} (bloc ${bha.id}) : « ${bha.cout[0]} » Pour ${rel.b}, niveau ${NIVEAU_FR[f.niveau_b]} (bloc ${bhb.id}) : « ${bhb.cout[0]} »`;
    fri(`${t} (règle ECART-notable).`, {
      statut: 'hypothese',
      confiance: 'faible',
      verification: `Poser en entretien à ${rel.a} : « ${bha.question} » et à ${rel.b} : « ${bhb.question} »`,
      bloc_ids: [...new Set([bha.id, bhb.id])]
    });
  }

  // ------------------------------------------------ rubrique 3 : règles de fonctionnement
  const reg = nouvelle('regles', 3, 'règles de fonctionnement proposées');
  const verifRegle = 'Présenter la règle aux deux personnes lors d’un entretien de calage, recueillir leur accord ou leurs réserves, et l’ajuster avant toute mise en place.';
  for (const t of NATURE_REGLES[rel.nature]) {
    reg(`Règle proposée : ${minuscule(remplir(t, vars))} (règle ${natureId}).`, { statut: 'hypothese', confiance: confNat, verification: verifRegle });
  }
  reg(`Règle proposée : ${minuscule(INT_REGLES[rel.interdependance])} (règle ${intId}).`, { statut: 'hypothese', confiance: 'faible', verification: verifRegle });
  for (const i of focus) {
    reg(`Règle proposée, pour le domaine ${i.d} : ${minuscule(DOM_REGLE[i.d])} (règle ${ruleFocus}).`, { statut: 'hypothese', confiance: 'faible', verification: verifRegle });
  }
  reg(
    `Toute règle proposée ici respecte les contraintes dures du cas, notamment le cadre de la loi 09-08 pour les données personnelles et l’absence de toute décision d’emploi fondée sur ces rapports ; la marge de manœuvre se cherche dans les contraintes négociables, par exemple la disponibilité de l’équipe projet (règles CAL-DURETE-dure, CAL-DURETE-negociable, ${GARDE_EMPLOI}).`,
    { statut: 'hypothese', confiance: 'moyenne', verification: 'Faire valider les règles par la personne chargée du cadre juridique et par le commanditaire avant leur mise en place.' }
  );

  // ------------------------------------------------ rubrique 4 : scénarios et pré-mortem
  const scn = nouvelle('scenarios', 4, 'scénarios et pré-mortem (hypothèses)');
  scn(
    `Pré-mortem (hypothèse) : imaginons qu’à l’échéance du lancement, la relation entre ${rel.a} et ${rel.b} ait nui au projet. Les causes à instruire en premier seraient ${PREMORTEM[rel.nature]}. Il s’agit de situations de coordination à prévenir, pas de défauts de l’une ou de l’autre des deux personnes (règles ${natureId}, ${tacheId}).`,
    { statut: 'hypothese', confiance: 'faible', verification: VERIF_NAT[rel.nature] }
  );
  scn(remplir(SCEN_RISQUE[rel.nature], vars) + ` (règles ${natureId}, ${tacheId}).`, {
    statut: 'hypothese',
    confiance: 'faible',
    verification: 'Demander aux deux personnes comment ce risque du cas se traduirait concrètement dans leur travail commun, et ce qu’elles feraient en premier.'
  });
  scn(`${remplir(INT_SCEN[rel.interdependance], vars)} (règle ${intId}).`, {
    statut: 'hypothese',
    confiance: 'faible',
    verification: 'Reconstituer avec les deux personnes une échéance passée où un décalage a été constaté, et ce qui l’a révélé.'
  });
  scn(
    `Scénario favorable (hypothèse) : si les règles de fonctionnement ci-dessus sont posées et suivies, il se peut que ${liste(focus.map((i) => `l’écart sur le domaine ${i.d} (${DOM_COURT[i.d]})`))} devienne${focus.length > 1 ? 'nt' : ''} une ressource pour le lancement plutôt qu’une source de frottement (règles ${ruleFocus}, ${natureId}).`,
    { statut: 'hypothese', confiance: 'faible', verification: 'Refaire le point avec les deux personnes à 60 jours : les règles ont-elles été tenues, et l’écart a-t-il été utile ou gênant dans les faits ?' }
  );

  // ------------------------------------------------ recommandations
  // Chaque recommandation est ancrée dans la relation (codes, facettes retenues), une échéance du cas et un risque inscrit au cas.
  const recs = [];
  const roleDe = (code) => personne(cas, code).role_equipe;
  const sym = SYMETRIQUES.has(rel.nature) || rel.sens === 'reciproque';
  // candidats à la responsabilité : les deux rôles de la relation ; la répartition entre rôles se fait à la fin, sur l’ensemble des chapitres
  const cand = [roleDe(rel.a), roleDe(rel.b)];
  const f0 = focus[0];
  const f1 = classees.find((i) => i.d !== f0.d);
  const nE = echeances.length;
  const e0 = echeances[0];
  const e1 = echeances[Math.min(1, nE - 1)];
  const eFin = echeances[nE - 1];
  const rk = (k) => risques[k % risques.length];
  const r0 = RISQUE_IDX[rel.nature];
  const facettesDe = (dom) => {
    const l = top3.filter((f) => f.k.startsWith(dom));
    return l.length ? ` Elle s’appuie sur ${liste(l.map((f) => `la facette ${f.k} (${libelleFacette(bib, f.k)})`))}.` : ' Le domaine est lu au niveau du domaine seulement, sans citer de facette.';
  };
  const ancre = (texte, rk_) => `${texte} Pour ${rel.a} et ${rel.b}, elle est à situer avant l’échéance « ${rk_.e} » et répond au risque inscrit au cas : « ${rk_.r} ».`;
  const donneeDom = (i) => `Écart de ${exact(i.ecart)} sur le domaine ${i.d}, ${CLASSE_FR[i.classe]} ; ${i.a} ${NIVEAU_FR[i.na]}, ${i.b} ${NIVEAU_FR[i.nb]} (${rel.id}).`;
  const contexte = (e) => `Relation de ${NATURE_FR[rel.nature]} entre ${roleDe(rel.a)} (${rel.a}) et ${roleDe(rel.b)} (${rel.b}), interdépendance ${INT_FR[rel.interdependance]}, tâche de nature ${cas.tache.nature} (lancement du canal de vente en ligne), orientation ${cas.strategie.orientation}, échéance visée : « ${e} » (règles ${natureId}, ${intId}, ${tacheId}, ${oriId}).`;
  const sansPoint = (t) => t.replace(/\.$/, '');
  const hyp = { niveau: 'hypothese', reference_id: null };
  const ro = RECO_ORG[rel.nature];
  recs.push({
    type: 'organisation',
    fixe: sym ? cand : [roleDe(O)],
    texte: ancre(ro.texte, { e: e0, r: rk(r0) }),
    a: { donnee: donneeDom(f0), contexte: contexte(e0), risque: ro.risque, responsable: 'à attribuer', horizon: '30 jours', indicateur: `${sansPoint(ro.indicateur)}, pour la relation ${rel.id}.`, preuve: hyp }
  });
  recs.push({
    type: 'coaching',
    cand,
    texte: `${ancre(DOM_COACH[f0.d].texte, { e: e1, r: rk(r0 + 1) })}${facettesDe(f0.d)}`,
    a: { donnee: donneeDom(f0), contexte: contexte(e1), risque: 'Le coaching est perçu comme une correction attendue de l’une des deux personnes plutôt que comme un appui aux deux, ou il est engagé sans l’accord de l’une d’elles.', responsable: 'à attribuer', horizon: '60 jours', indicateur: `${sansPoint(DOM_COACH[f0.d].indicateur)}, pour la relation ${rel.id}.`, preuve: hyp }
  });
  recs.push({
    type: 'formation',
    cand,
    texte: `${ancre(DOM_FORM[f1.d], { e: eFin, r: rk(r0 + 2) })}${facettesDe(f1.d)}`,
    a: { donnee: donneeDom(f1), contexte: contexte(eFin), risque: 'L’atelier reste théorique et n’est pas relié aux échéances du cas.', responsable: 'à attribuer', horizon: '90 jours', indicateur: `Relevé à 90 jours : ${rel.a} et ${rel.b} décrivent chacun une situation réelle du projet où un des objectifs d’apprentissage a été appliqué, oui ou non.`, preuve: hyp }
  });
  const ri = RECO_INT[rel.interdependance];
  recs.push({
    type: 'organisation',
    cand,
    texte: ancre(ri.texte, { e: echeance, r: rk(r0) }),
    a: { donnee: `Interdépendance ${INT_FR[rel.interdependance]} entre ${rel.a} et ${rel.b}, échéance du cas : « ${echeance} » (${rel.id}, règle ${intId}).`, contexte: contexte(echeance), risque: ri.risque, responsable: 'à attribuer', horizon: '60 jours', indicateur: `${sansPoint(ri.indicateur)}, pour la relation ${rel.id}.`, preuve: { niveau: 'source', reference_id: 'thompson-1967' } }
  });
  if (passDiff) {
    recs.push({
      type: 'vérification',
      cand,
      texte: `Tenir avec ${rel.a} (${pa.langue_passation}) et ${rel.b} (${pb.langue_passation}) un entretien de vérification dans la langue de travail de la relation : établir quels écarts ${liste(top3.map((f) => f.k))} sont reconnus dans leur travail réel avant d’en tirer une règle, et avant l’échéance « ${e0} ».`,
      a: { donnee: `Langues de passation différentes : ${rel.a} en ${pa.langue_passation}, ${rel.b} en ${pb.langue_passation}, avec des écarts notables sur ${liste(top3.map((f) => `${f.k} (${exact(f.ecart)})`))} (${rel.id}, règle CAL-IC-PASSATION).`, contexte: contexte(e0), risque: 'La réserve de comparaison est oubliée et l’écart est lu comme un écart de personnalité.', responsable: 'à attribuer', horizon: '30 jours', indicateur: `Relevé à 30 jours : un entretien de vérification a été tenu avec ${rel.a} et avec ${rel.b}, et le compte rendu précise quels écarts de la relation ${rel.id} sont reconnus dans le travail réel.`, preuve: hyp }
    });
  }

  // ------------------------------------------------ rubrique 5 : recommandations (renvoi)
  const rec5 = nouvelle('reco', 5, 'recommandations (coaching, formation, organisation)');
  recs.forEach((r, k) => {
    rec5(`Recommandation ${r.type}, horizon ${r.a.horizon} : ${r.texte} Indicateur : ${r.a.indicateur}`, {
      statut: 'hypothese',
      confiance: 'faible',
      verification: 'Recueillir auprès des deux personnes, en entretien de calage, si l’action répond à un besoin ressenti dans leur travail commun avant de la lancer.'
    });
  });

  return { sections, specs: recs };
}

// ---------------------------------------------------------------- niveau
export function construire(ctx) {
  const { cas, faits, regles } = ctx;
  const consenti = (code) => personne(cas, code).consentements?.binome === true;
  const sections = [];
  const specs = [];
  const omises = [];
  const charge = {};

  for (const rel of faits.relations) {
    if (!(consenti(rel.a) && consenti(rel.b))) {
      omises.push(rel.id);
      continue;
    }
    const relCas = cas.relations.find((r) => r.id === rel.id);
    const c = chapitre(ctx, rel, relCas);
    sections.push(...c.sections);
    specs.push(...c.specs);
  }

  for (const sp of specs) if (sp.fixe) for (const r of sp.fixe) charge[r] = (charge[r] ?? 0) + 1;
  for (const sp of specs) {
    if (sp.fixe) continue;
    const [r1, r2] = sp.cand;
    const choisi = (charge[r1] ?? 0) < (charge[r2] ?? 0) ? r1 : r2;
    charge[choisi] = (charge[choisi] ?? 0) + 1;
    sp.a.responsable = choisi;
  }
  for (const sp of specs) if (sp.fixe) sp.a.responsable = sp.fixe.join(' et ');
  const recommandations = specs.map((sp, k) => recommandation(`REC-N2-${String(k + 1).padStart(2, '0')}`, 'n2', sp.texte, sp.a));

  const gen = [];
  const pg = (texte, opts) => gen.push(paragraphe(`n2-cadre-${gen.length + 1}`, texte, opts));
  pg('Ce niveau présente une lecture par relation entre deux personnes. Chaque chapitre n’existe que si les deux personnes ont consenti au partage du binôme ; chaque lecture est une hypothèse, avec sa confiance et sa façon de la vérifier en entretien, et seuls les chiffres repris des faits calculés sont présentés comme constatés.', { statut: 'constate' });
  pg(`${regleTexte(regles, GARDE_EMPLOI)} (règle ${GARDE_EMPLOI}).`, { statut: 'constate' });
  // l’identifiant GARDE-POPULATION contient un terme du lexique de l’audit : le texte de la règle est repris sans son identifiant
  pg(regleTexte(regles, GARDE_POP), { statut: 'constate' });
  pg(`${regleTexte(regles, GARDE_NAT)} (règle ${GARDE_NAT}).`, { statut: 'constate' });
  pg(
    omises.length
      ? `${omises.length > 1 ? 'Les chapitres des relations suivantes sont omis' : 'Le chapitre de la relation suivante est omis'} : ${liste(omises)}. Le consentement des deux personnes au partage du binôme n’est pas réuni pour ${omises.length > 1 ? 'ces relations' : 'cette relation'}.`
      : 'Tous les chapitres de relation prévus par le cas sont présents : les deux personnes de chaque relation ont consenti au partage du binôme.',
    { statut: 'constate' }
  );

  const roles = Object.entries(charge).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0], 'fr'));
  if (roles.length) {
    const ct = cas.contraintes.find((c) => c.id === 'CT-07');
    pg(
      `Charge des rôles : les recommandations de ce niveau sont réparties entre les rôles du cas, du plus au moins sollicité : ${liste(roles.map(([r]) => `« ${r} »`))}. ${ct ? `La contrainte ${ct.id} du cas (« ${ct.libelle} ») impose d’échelonner les actions de chaque rôle et de les arbitrer avec le commanditaire, en commençant par celui qui est le plus sollicité.` : 'Les actions de chaque rôle sont à échelonner avec le commanditaire.'}`,
      { statut: 'constate' }
    );
  }

  const general = { ...section('cadre', 'Cadre de lecture des relations', gen), rubrique: 0 };
  return {
    niveau: { id: 'n2-relations', titre: 'Analyse des relations (binômes)', sections: [general, ...sections] },
    recommandations
  };
}
