// Espace « pilotage » : accès « Rapports » de l'en-tête et écrans
// d'administration et d'organisation. Les intitulés des pages visées sont repris
// de leur propre espace (apercu, synthese, mesResultats, binome) : ici, seuls
// les textes propres au pilotage. Défaut non validé par Amine.
const pilotageFr = {
  menu: {
    bouton: 'Rapports',
    organisations: 'Organisations et comptes',
    campagnes: 'Campagnes et invitations',
    resultats: 'Résultats individuels',
    parcours: 'Mon parcours'
  },
  retourAdmin: 'Retour à l’administration',
  surtitreApercu: 'Aperçu interne, données fictives',
  repere: {
    campagne: 'Campagne',
    remis: 'Résultats remis'
  },
  admin: {
    surtitre: 'Tenga Conseil',
    apercusTitre: 'Aperçus internes',
    apercuResultatsTexte:
      'Le rendu réel de la vue des résultats, du rapport individuel et de la synthèse par groupe, sur des données fictives.',
    apercuRapportTexte:
      'Le rapport cabinet de démonstration, lu à cinq niveaux, à télécharger en PDF, Word, Markdown ou HTML.',
    organisationsIntro:
      'Chaque organisation ouvre sur ses campagnes, ses invitations et ses membres.',
    ouvrirAria: 'Ouvrir l’organisation {nom}',
    creeLe: 'Créée le {date}',
    accesTitre: 'Comptes et accès'
  },
  organisation: {
    surtitre: 'Espace de l’organisation',
    roleTenu: 'Votre rôle'
  },
  rapportCabinet: {
    titre: 'Aperçu du rapport cabinet',
    intro:
      'Démonstration réservée aux administrateurs : une organisation fictive, trois profils fictifs et un profil estimé, lus à cinq niveaux (individuel, relations, équipe, lecture organisationnelle, plan d’accompagnement). Ces données sont fixes, elles ne viennent pas des résultats enregistrés ; les 150 textes types de la bibliothèque ne sont pas encore relus (le rapport en cite 85) et chaque lecture est une hypothèse à confirmer en entretien.',
    langue: 'Le rapport de démonstration est rédigé en français.',
    telecharger: 'Télécharger',
    formats: {
      pdf: 'PDF (avec graphiques)',
      docx: 'Word (modifiable)',
      md: 'Markdown',
      html: 'HTML (animé)'
    },
    cadre: 'Rapport cabinet : cinq niveaux de lecture'
  }
};

export default pilotageFr;
