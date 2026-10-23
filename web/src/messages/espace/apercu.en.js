const apercuEn = {
  title: 'Results preview',
  intro:
    'The real platform rendering (results view, individual report, group summary, pair report) on fictitious profiles and groups, so it can be validated without an account or real data. Super administrators only.',
  bandeau: 'Fictitious data: no account, no real data',
  vueLegende: 'Audience',
  vues: {
    participant: 'Participant',
    consultant: 'Consultant',
    groupe: 'Group',
    binome: 'Pair'
  },
  profilLegende: 'Fictitious profile',
  premiereLegende: 'First person',
  partenaireLegende: 'Second person',
  lecteurLegende: 'Read by',
  lecteurs: {
    personne: 'The first person',
    consultant: 'The consultant'
  },
  binomeTitre: 'Pair report',
  binomePersonneAide:
    'What {premiere} sees on the page of their pair with {seconde}, once both have given consent. The button to withdraw consent is not reproduced here.',
  binomeConsultantAide:
    'What the organisation’s consultant sees for the pair {premiere} and {seconde}: both people are referred to by a number.',
  simulationTitre: 'Simulate showing unreviewed texts',
  simulationAide:
    'Without this setting, the participant sees “text under review” for every unreviewed block, as in production today. With it, the team sees the final rendering with the texts. No environment variable is changed.',
  simulationOff: 'Setting off: rendering exactly as it is actually served.',
  simulationOn:
    'Setting on: final rendering, unreviewed texts shown with their notice.',
  simulationActiver: 'Turn the simulation on',
  simulationDesactiver: 'Turn the simulation off',
  resultatTitre: 'Results view',
  rapportTitre: 'Individual report',
  syntheseTitre: 'Group summary',
  syntheseAide:
    'Three fictitious groups: two published and one whose size is below the anonymity threshold.',
  consultantAide:
    'Consultant audience: unreviewed blocks are shown with their notice and facet O6 is removed.',
  participantAide:
    'Participant audience: what the person actually sees on their own result.'
};

export default apercuEn;
