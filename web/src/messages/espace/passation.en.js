const passationEn = {
  title: 'Taking the questionnaire',
  intro:
    'Questionnaire requested by {organisation}, campaign “{campagne}”. Your answers are attached to your account.',
  closedTitle: 'This campaign is no longer open',
  closedText:
    'The campaign “{campagne}” of {organisation} no longer accepts answers. If you think this is a mistake, contact the person who invited you.',
  backToAccount: 'Back to my account',
  encartTitle: 'You have a questionnaire to complete for {organisation}',
  encartText:
    'Campaign “{campagne}”. Use the link below: answers given on this public page are not attached to this campaign.',
  encartCta: 'Complete the questionnaire',
  resumed:
    'We restored your answers saved on your account. You can carry on where you left off.',
  errors: {
    closed:
      'This campaign no longer accepts answers: your latest answers could not be saved.',
    already: 'Your questionnaire has already been sent for this campaign.',
    conflict:
      'Your answers were changed elsewhere. Reload the page to continue.',
    conflictReloaded:
      'Your answers were changed on another device. We restored the latest version saved on your account.'
  }
};

export default passationEn;
