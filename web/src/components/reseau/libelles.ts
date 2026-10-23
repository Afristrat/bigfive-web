import type { Lien } from '@/lib/reseau-releve';

// Libellés de l'écran du relevé, lus dans l'espace « reseau » côté serveur et
// passés au composant client. Les gabarits remplis dans le navigateur (numéro
// d'un membre, nombre de réponses) gardent leurs marques {nom} : on les obtient
// en passant la marque elle-même comme valeur.

type Traducteur = (key: string, values?: Record<string, string>) => string;

export type LibellesReseau = {
  etapes: {
    legende: string;
    information: string;
    consentement: string;
    releve: string;
    /** Gabarit : {numero}, {total}. */
    position: string;
  };
  information: {
    titre: string;
    texte: string;
    opposition: string;
    oppositionAide: string;
    lu: string;
  };
  consentement: {
    titre: string;
    texte: string;
    repondre: string;
    carte: string;
    carteAide: string;
    refusAide: string;
    enregistrer: string;
  };
  mentions: {
    titre: string;
    responsable: string;
    /** Gabarit {contact} et adresse, ou phrase de repli sans adresse. */
    contact: { modele: string; adresse: string } | { repli: string };
    conservation: string;
    cndp: string;
  };
  releve: {
    titre: string;
    intro: string;
    vide: string;
    /** Gabarit : {numero}. */
    repli: string;
    questions: Record<Lien, string>;
    /** Libellé de chaque valeur, par lien (fréquence de 0 à 4, confiance de 0 à 3). */
    valeurs: Record<Lien, Record<number, string>>;
    /** Gabarits : {faites}, {total} ; {nombre}. */
    compteMembre: string;
    progression: string;
    manque: string;
    enregistrer: string;
    lectureSeule: string;
    sansReponse: string;
  };
  accords: {
    titre: string;
    repondre: string;
    carteOui: string;
    carteNon: string;
    modifier: string;
    annuler: string;
  };
  close: { titre: string; texte: string };
  oppose: { titre: string; texte: string; lever: string };
  opposer: { bouton: string; aide: string; confirmer: string; annuler: string };
  retrait: {
    bouton: string;
    aide: string;
    aideOuverte: string;
    confirmer: string;
    annuler: string;
  };
  working: string;
  messages: Record<
    | 'informe'
    | 'oppose'
    | 'enregistre'
    | 'repondu'
    | 'retire'
    | 'closed'
    | 'forbidden'
    | 'notfound'
    | 'invalid'
    | 'failed'
    | 'apercu',
    string
  >;
};

/**
 * Libellés de l'écran. `contact` est l'adresse de contact du site
 * (NEXT_PUBLIC_SUPPORT_EMAIL), vide quand elle n'est pas configurée : la
 * mention prend alors sa phrase de repli, sans trou ni marque visible.
 */
export function libellesReseau(t: Traducteur, contact: string): LibellesReseau {
  const garder = (cle: string, marques: string[]): string =>
    t(cle, Object.fromEntries(marques.map((m) => [m, `{${m}}`])));
  const frequences = (): Record<number, string> => ({
    0: t('releve.frequences.jamais'),
    1: t('releve.frequences.rarement'),
    2: t('releve.frequences.mois'),
    3: t('releve.frequences.semaine'),
    4: t('releve.frequences.jour')
  });
  return {
    etapes: {
      legende: t('etapes.legende'),
      information: t('etapes.information'),
      consentement: t('etapes.consentement'),
      releve: t('etapes.releve'),
      position: garder('etapes.position', ['numero', 'total'])
    },
    information: {
      titre: t('information.titre'),
      texte: t('information.texte'),
      opposition: t('information.opposition'),
      oppositionAide: t('information.oppositionAide'),
      lu: t('information.lu')
    },
    consentement: {
      titre: t('consentement.titre'),
      texte: t('consentement.texte'),
      repondre: t('consentement.repondre'),
      carte: t('consentement.carte'),
      carteAide: t('consentement.carteAide'),
      refusAide: t('consentement.refusAide'),
      enregistrer: t('consentement.enregistrer')
    },
    mentions: {
      titre: t('mentions.titre'),
      responsable: t('mentions.responsable'),
      contact: contact
        ? { modele: garder('mentions.contact', ['contact']), adresse: contact }
        : { repli: t('mentions.contactSansAdresse') },
      conservation: t('mentions.conservation'),
      cndp: t('mentions.cndp')
    },
    releve: {
      titre: t('releve.titre'),
      intro: t('releve.intro'),
      vide: t('releve.vide'),
      repli: garder('releve.repli', ['numero']),
      questions: {
        conseil: t('releve.questions.conseil'),
        information: t('releve.questions.information'),
        confiance: t('releve.questions.confiance'),
        dependance: t('releve.questions.dependance')
      },
      valeurs: {
        conseil: frequences(),
        information: frequences(),
        dependance: frequences(),
        confiance: {
          3: t('releve.confiances.oui'),
          2: t('releve.confiances.plutotOui'),
          1: t('releve.confiances.plutotNon'),
          0: t('releve.confiances.non')
        }
      },
      compteMembre: garder('releve.compteMembre', ['faites', 'total']),
      progression: garder('releve.progression', ['faites', 'total']),
      manque: garder('releve.manque', ['nombre']),
      enregistrer: t('releve.enregistrer'),
      lectureSeule: t('releve.lectureSeule'),
      sansReponse: t('releve.sansReponse')
    },
    accords: {
      titre: t('accords.titre'),
      repondre: t('accords.repondre'),
      carteOui: t('accords.carteOui'),
      carteNon: t('accords.carteNon'),
      modifier: t('accords.modifier'),
      annuler: t('accords.annuler')
    },
    close: { titre: t('close.titre'), texte: t('close.texte') },
    oppose: {
      titre: t('oppose.titre'),
      texte: t('oppose.texte'),
      lever: t('oppose.lever')
    },
    opposer: {
      bouton: t('opposer.bouton'),
      aide: t('opposer.aide'),
      confirmer: t('opposer.confirmer'),
      annuler: t('opposer.annuler')
    },
    retrait: {
      bouton: t('retrait.bouton'),
      aide: t('retrait.aide'),
      aideOuverte: t('retrait.aideOuverte'),
      confirmer: t('retrait.confirmer'),
      annuler: t('retrait.annuler')
    },
    working: t('working'),
    messages: {
      informe: t('messages.informe'),
      oppose: t('messages.oppose'),
      enregistre: t('messages.enregistre'),
      repondu: t('messages.repondu'),
      retire: t('messages.retire'),
      closed: t('messages.closed'),
      forbidden: t('messages.forbidden'),
      notfound: t('messages.notfound'),
      invalid: t('messages.invalid'),
      failed: t('messages.failed'),
      apercu: t('messages.apercu')
    }
  };
}
