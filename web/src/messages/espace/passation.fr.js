const passationFr = {
  title: 'Passation du questionnaire',
  intro:
    'Questionnaire demandé par {organisation}, campagne « {campagne} ». Vos réponses sont rattachées à votre compte.',
  closedTitle: 'Cette campagne n’est plus ouverte',
  closedText:
    'La campagne « {campagne} » de {organisation} n’accepte plus de réponses. Si vous pensez qu’il s’agit d’une erreur, contactez la personne qui vous a invité.',
  backToAccount: 'Retour à mon compte',
  encartTitle: 'Vous avez un questionnaire à passer pour {organisation}',
  encartText:
    'Campagne « {campagne} ». Passez par le lien ci-dessous : les réponses données sur cette page publique ne sont pas rattachées à cette campagne.',
  encartCta: 'Passer le questionnaire',
  resumed:
    'Nous avons repris vos réponses enregistrées sur votre compte. Vous pouvez continuer là où vous en étiez.',
  errors: {
    closed:
      'Cette campagne n’accepte plus de réponses : vos dernières réponses n’ont pas pu être enregistrées.',
    already: 'Votre questionnaire a déjà été envoyé pour cette campagne.',
    conflict:
      'Vos réponses ont été modifiées ailleurs. Rechargez la page pour reprendre.',
    conflictReloaded:
      'Vos réponses ont été modifiées sur un autre appareil. Nous avons repris la dernière version enregistrée sur votre compte.'
  }
};

export default passationFr;
