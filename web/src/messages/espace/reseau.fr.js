// Espace « reseau » : relevé du réseau réel d'une équipe (cadrage du 23/10,
// docs/design/cadrage-reseau-reel.md). Écran de la personne (information des
// personnes citées, consentement, liste fermée), page du consultant. Hors des
// blocs juridiques signalés, tout le texte est un défaut non validé par Amine.
// Les espaces insécables avant : ; ? ! et à l'intérieur des guillemets sont
// écrites « ». La question « qui vous bloque » est retirée (cadrage §2).
const reseauFr = {
  title: 'Réseau de l’équipe',
  liste: {
    titre: 'Relevé du réseau de votre équipe',
    intro:
      'Votre situation dans le relevé des échanges de travail de votre équipe.',
    ouvrir: 'Voir mon relevé',
    ouvrirAria: 'Voir mon relevé de la campagne {titre}',
    statut: {
      brouillon: 'Campagne en préparation',
      ouverte: 'Campagne ouverte',
      close: 'Campagne close'
    }
  },
  page: {
    titre: 'Relevé du réseau de l’équipe',
    retour: 'Retour à mes résultats'
  },
  etapes: {
    legende: 'Avancement du relevé',
    information: 'Information',
    consentement: 'Accord',
    releve: 'Réponses',
    position: 'Étape {numero} sur {total}'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  information: {
    titre: 'Vous pouvez être cité',
    texte:
      'Les membres de votre équipe vont être invités à décrire leurs échanges de travail avec vous et avec leurs autres collègues : conseil, information, confiance, dépendance. Vous pouvez donc être cité dans leurs réponses. Ces réponses servent à un atelier de restitution de l’équipe et, pour les seules personnes ayant donné leur accord distinct, à un rapport nominatif remis à Tenga Conseil ; aucune n’est communiquée à la hiérarchie ni utilisée pour une décision vous concernant. Vous pouvez vous opposer à être cité : vos liens sont alors retirés de la carte et vous ne répondez pas au relevé ; aucune autre conséquence.',
    opposition: 'Je m’oppose à être cité dans ce relevé.',
    oppositionAide:
      'Les réponses qui vous citent sont alors supprimées. Vous pourrez lever votre opposition plus tard.',
    lu: 'J’ai lu'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  consentement: {
    titre: 'Votre accord',
    texte:
      'Tenga Conseil vous propose de répondre à quatre questions sur vos échanges de travail avec les membres de votre équipe : conseil, information, confiance, dépendance. Vos réponses nomment des collègues. Elles servent à décrire la façon dont l’équipe travaille réellement, lors d’un atelier de restitution et, si vous l’acceptez ci-dessous, dans un rapport nominatif remis à Tenga Conseil. Seuls les consultants de Tenga Conseil affectés à votre organisation et les administrateurs de la plateforme peuvent lire vos réponses une à une. Elles ne seront jamais communiquées à votre hiérarchie et ne serviront à aucune décision vous concernant ou concernant vos collègues. Répondre est facultatif : refuser n’a aucune conséquence, et votre employeur ne saura pas si vous avez répondu. Vous pouvez modifier vos réponses jusqu’à la clôture, puis les retirer à tout moment.',
    repondre: 'J’accepte de répondre.',
    carte:
      'J’accepte que la carte de l’équipe, avec les prénoms ou les codes, soit montrée aux membres de l’équipe lors de l’atelier.',
    carteAide:
      'La carte n’est montrée que si chaque membre de l’équipe l’accepte ; sinon, l’atelier ne présente que des indicateurs sans noms.',
    rapport:
      'J’accepte que mes réponses figurent nommément dans le rapport remis à Tenga Conseil.',
    rapportAide:
      'Sans cette case, vos réponses ne figurent dans aucun rapport nominatif ; ce choix n’a aucune conséquence. Cette case n’est disponible que si vous acceptez de répondre.',
    refusAide:
      'Sans la première case, vous ne répondez pas ; ce choix n’a aucune conséquence. Décocher la première case supprime les réponses déjà enregistrées.',
    confirmerRefus: 'Confirmer : supprimer mes réponses',
    enregistrer: 'Enregistrer mon choix'
  },
  // À relire par Amine (relecteur juridique) : texte non validé.
  mentions: {
    titre: 'Responsable et droits',
    responsable: 'Responsable du traitement : Tenga Conseil.',
    contact:
      'Droits d’accès, de rectification et d’opposition : écrivez à {contact}.',
    contactSansAdresse:
      'Droits d’accès, de rectification et d’opposition : adressez-vous à Tenga Conseil.',
    conservation:
      'Vos réponses et vos choix enregistrés (information, opposition, accords) sont supprimés automatiquement trois ans après leur dernier enregistrement.',
    cndp: 'Déclaration à la CNDP : en cours.'
  },
  releve: {
    titre: 'Vos réponses',
    intro:
      'Pour chaque membre de votre équipe, quatre questions. Il n’y a pas de bonne réponse : décrivez ce qui se passe réellement.',
    vide: 'Aucun autre membre de votre équipe n’est encore inscrit au relevé. Revenez plus tard.',
    repli: 'Membre de l’équipe {numero} (nom non renseigné)',
    questions: {
      conseil:
        'À quelle fréquence demandez-vous conseil à cette personne pour résoudre un problème de travail ?',
      information:
        'À quelle fréquence recevez-vous de cette personne une information utile à votre travail ?',
      confiance:
        'Pourriez-vous signaler à cette personne une erreur ou une difficulté sans crainte ?',
      dependance:
        'À quelle fréquence devez-vous attendre le travail de cette personne pour avancer ?'
    },
    frequences: {
      jamais: 'Jamais',
      rarement: 'Rarement',
      mois: 'Chaque mois',
      semaine: 'Chaque semaine',
      jour: 'Chaque jour'
    },
    confiances: {
      oui: 'Oui',
      plutotOui: 'Plutôt oui',
      plutotNon: 'Plutôt non',
      non: 'Non'
    },
    compteMembre: '{faites} sur {total}',
    progression: 'Réponses données : {faites} sur {total}',
    manque:
      'Réponses manquantes : {nombre}. Chaque membre attend ses quatre réponses.',
    enregistrer: 'Enregistrer mes réponses',
    lectureSeule: 'Vos réponses enregistrées',
    sansReponse: 'Sans réponse'
  },
  accords: {
    titre: 'Vos accords',
    repondre: 'Vous avez accepté de répondre.',
    carteOui: 'Vous acceptez que la carte de l’équipe soit montrée en atelier.',
    carteNon:
      'Vous n’acceptez pas que la carte de l’équipe soit montrée en atelier.',
    rapportOui:
      'Vous acceptez que vos réponses figurent nommément dans le rapport remis à Tenga Conseil.',
    rapportNon: 'Vos réponses ne figurent dans aucun rapport nominatif.',
    modifier: 'Modifier mes accords',
    annuler: 'Annuler'
  },
  close: {
    titre: 'Campagne close',
    texte:
      'Le relevé n’accepte plus de réponses ni de modifications. Vous pouvez encore retirer vos réponses et vous opposer à être cité.'
  },
  ferme: {
    titre: 'Relevé fermé',
    texte:
      'Le relevé est fermé aux réponses ; vous pouvez toujours retirer vos réponses ou vous opposer à être cité.',
    leverPlusTard:
      'Vous pourrez lever votre opposition à la réouverture du relevé.',
    texteOpposition:
      'Le relevé est fermé aux réponses ; vous pouvez toujours vous opposer à être cité.',
    texteOppose:
      'Votre opposition est enregistrée. Le relevé est fermé aux réponses.'
  },
  brouillon: {
    titre: 'Relevé pas encore ouvert',
    texte: 'Le relevé n’est pas encore ouvert aux réponses.'
  },
  oppose: {
    titre: 'Votre opposition est enregistrée',
    texte:
      'Vos liens sont retirés du relevé et vous n’y répondez pas. Vous pouvez lever votre opposition à tout moment.',
    lever: 'Lever mon opposition'
  },
  opposer: {
    bouton: 'Je m’oppose à être cité',
    aide: 'Vos liens seront retirés du relevé, y compris ceux que vos collègues ont déjà déclarés, et vos propres réponses seront supprimées.',
    confirmer: 'Confirmer mon opposition',
    annuler: 'Annuler'
  },
  retrait: {
    bouton: 'Retirer mes réponses',
    aide: 'Vos réponses et vos deux accords seront supprimés.',
    aideOuverte:
      'Vos réponses et vos deux accords seront supprimés. Vous pourrez répondre de nouveau tant que la campagne est ouverte.',
    confirmer: 'Confirmer le retrait',
    annuler: 'Annuler'
  },
  working: 'Envoi en cours…',
  messages: {
    informe: 'C’est noté. Vous pouvez maintenant donner votre accord, ou non.',
    informeSansReponse:
      'C’est noté. Le relevé n’accepte pas de réponses pour le moment.',
    oppose:
      'Votre opposition est enregistrée. Vos liens sont retirés du relevé.',
    enregistre: 'Votre choix est enregistré.',
    repondu:
      'Vos réponses sont enregistrées. Vous pouvez les modifier jusqu’à la clôture.',
    retire: 'Vos réponses et vos accords sont supprimés.',
    closed: 'Votre situation a changé ; la page est mise à jour.',
    forbidden: 'Vous ne pouvez pas effectuer cette action.',
    notfound: 'Relevé introuvable.',
    invalid:
      'La liste de l’équipe a changé et vient d’être mise à jour ; vérifiez puis enregistrez de nouveau.',
    failed: 'L’envoi a échoué. Réessayez dans un instant.',
    reconnexion: 'Votre session a expiré : reconnectez-vous pour continuer.',
    reconnexionLien: 'Se reconnecter',
    apercu: 'Aperçu : rien n’est enregistré.'
  },
  consultant: {
    lien: 'Relevé du réseau',
    titre: 'Relevé du réseau',
    intro:
      'Nombres par groupe, sans aucun nom. Les réponses brutes ne se lisent que dans l’export, réservé à la préparation du rapport ; chaque lecture est inscrite au journal.',
    retour: 'Retour aux résultats',
    campagne: 'Campagne : {titre}',
    statut: 'Statut de la campagne',
    statuts: {
      brouillon: 'En préparation',
      ouverte: 'Ouverte',
      close: 'Close'
    },
    effectif: 'Effectif',
    informes: 'Informés, sans opposition',
    oppositions: 'Oppositions',
    repondants: 'Répondants',
    accordsCarte: 'Accords de carte',
    aucunGroupe: 'Aucun groupe dans cette campagne.',
    information: {
      bouton: 'Envoyer le courriel d’information',
      envoi: 'Envoi en cours…',
      aide: 'Envoie le courriel d’information (art. 5 de la loi 09-08) aux personnes des groupes de cette campagne qui n’ont pas encore pris connaissance de l’information dans l’application. Chaque personne le reçoit une seule fois ; l’envoi est inscrit au journal. Possible seulement relevé ouvert.',
      aucun: 'Toutes les personnes ont déjà été informées : aucun courriel à envoyer.',
      termine: '{n} courriel(s) envoyé(s).',
      echecs: '{n} courriel(s) non envoyé(s) : relancez l’envoi, seules ces personnes seront reprises.',
      restants: '{n} personne(s) restent à informer : relancez l’envoi.',
      nonTraces: '{n} courriel(s) sont partis sans que l’envoi soit inscrit au journal : ces personnes risquent de le recevoir une seconde fois. Prévenez Tenga.',
      ferme: 'Le relevé du réseau est fermé : aucun courriel ne peut partir.',
      interdit: 'Cet envoi est réservé au consultant de l’organisation et aux administrateurs Tenga.',
      plafond: 'Trop d’envois sur la dernière heure : réessayez plus tard.',
      reconnexion: 'Votre session a expiré : reconnectez-vous puis relancez l’envoi.',
      erreur: 'L’envoi a échoué : réessayez ; si cela se répète, prévenez Tenga.'
    },
    exporter: 'Exporter les réponses (JSON)',
    exportAide:
      'Le fichier contient les réponses de chaque personne et le nom des personnes citées ; pour le consultant, les personnes qui se sont opposées n’y figurent que par leur nombre. Ne le transmettez à personne hors de la mission.'
  }
};

export default reseauFr;
