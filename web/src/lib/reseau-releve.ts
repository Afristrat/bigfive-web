// Relevé du réseau réel : types et règles pures de l'écran de réponse. Aucun
// accès aux données, aucune session : ce module est lu par le composant client,
// par le chargeur serveur et par l'aperçu. La base reste l'autorité (contrat
// §2) ; ces règles ne décident que de ce qui est montré.

/** Les quatre liens relevés, dans l'ordre du cadrage (§2). */
export const LIENS = [
  'conseil',
  'information',
  'confiance',
  'dependance'
] as const;
export type Lien = (typeof LIENS)[number];

/** Fréquence : 0 jamais, 1 rarement, 2 chaque mois, 3 chaque semaine, 4 chaque jour. */
const FREQUENCES = [0, 1, 2, 3, 4] as const;
/** Confiance, dans l'ordre de lecture : 3 oui, 2 plutôt oui, 1 plutôt non, 0 non. */
const CONFIANCES = [3, 2, 1, 0] as const;

export const valeursDuLien = (lien: Lien): readonly number[] =>
  lien === 'confiance' ? CONFIANCES : FREQUENCES;

/** Valeur admise par la base pour ce lien (contrainte de reseau_reponses). */
export const valeurValide = (lien: Lien, valeur: number): boolean =>
  Number.isInteger(valeur) && valeursDuLien(lien).includes(valeur);

export type ReponseLien = { cite: string; lien: Lien; valeur: number };

/** Ma ligne de reseau_membres, ou null tant que je n'ai pas pris connaissance de l'information. */
export type EtatMoi = {
  informeLe: string;
  opposeLe: string | null;
  accordRepondreLe: string | null;
  accordCarteLe: string | null;
};

export type MembreReseau = {
  participationId: string;
  /** Nom de profil ; null quand il n'est pas renseigné (libellé de repli). */
  nom: string | null;
};

/** Ce que rend app.reseau_releve quand l'interrupteur est ouvert. */
export type ReleveReseau = {
  campagneOuverte: boolean;
  moi: EtatMoi | null;
  /** Autres membres du groupe, informés et non opposés ; vide tant que je ne suis pas informé ou si je suis opposé. */
  membres: MembreReseau[];
  /** Mes réponses seulement. */
  reponses: ReponseLien[];
};

/** Ligne de app.mes_releves_reseau. */
export type MonReleveReseau = {
  participationId: string;
  organisationNom: string;
  campagneTitre: string;
  campagneStatut: 'brouillon' | 'ouverte' | 'close';
};

/**
 * Issue d'une action du relevé. `reconnexion` : session absente, expirée ou
 * jeton refusé (401) ; l'écran propose de se reconnecter. `apercu` n'est rendu
 * que par les actions neutralisées de l'aperçu administrateur : rien n'est
 * enregistré.
 */
export type ResultatReseau = {
  status:
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
    | 'reconnexion'
    | 'apercu';
};

export const SUCCES_RESEAU: readonly ResultatReseau['status'][] = [
  'informe',
  'oppose',
  'enregistre',
  'repondu',
  'retire'
];

/** Actions reçues par l'écran : les vraies (serveur) ou celles, neutres, de l'aperçu. */
export type ActionsReseau = {
  informer: (
    participation: string,
    opposition: boolean
  ) => Promise<ResultatReseau>;
  consentir: (
    participation: string,
    repondre: boolean,
    carte: boolean
  ) => Promise<ResultatReseau>;
  repondre: (
    participation: string,
    reponses: ReponseLien[]
  ) => Promise<ResultatReseau>;
  retirer: (participation: string) => Promise<ResultatReseau>;
};

export type EtapeReseau = 'information' | 'consentement' | 'releve' | 'oppose';

/** Étape montrée, d'après ma ligne de reseau_membres. */
export function etapeReseau(moi: EtatMoi | null): EtapeReseau {
  if (moi === null) return 'information';
  if (moi.opposeLe !== null) return 'oppose';
  return moi.accordRepondreLe === null ? 'consentement' : 'releve';
}

/** Y a-t-il quelque chose à retirer (réponses ou accords) ? */
export const peutRetirer = (releve: ReleveReseau): boolean =>
  releve.reponses.length > 0 ||
  releve.moi?.accordRepondreLe != null ||
  releve.moi?.accordCarteLe != null;

/** Brouillon de saisie : une valeur par couple (personne citée, lien). */
export type Brouillon = Readonly<Record<string, number>>;

export const cleReponse = (cite: string, lien: Lien): string =>
  `${cite}:${lien}`;

/** Brouillon initial : mes réponses enregistrées, pour les membres encore listés. */
export function brouillonDepuis(releve: ReleveReseau): Brouillon {
  const listes = new Set(releve.membres.map((m) => m.participationId));
  return Object.fromEntries(
    releve.reponses
      .filter((r) => listes.has(r.cite))
      .map((r) => [cleReponse(r.cite, r.lien), r.valeur])
  );
}

/** Nombre de questions sans réponse : quatre par membre listé. */
export const manquantes = (
  membres: readonly MembreReseau[],
  brouillon: Brouillon
): number =>
  membres.reduce(
    (total, m) =>
      total +
      LIENS.filter(
        (lien) => brouillon[cleReponse(m.participationId, lien)] === undefined
      ).length,
    0
  );

/** Réponses à envoyer, dans l'ordre des membres puis des liens ; jamais une personne hors liste. */
export const reponsesDepuis = (
  membres: readonly MembreReseau[],
  brouillon: Brouillon
): ReponseLien[] =>
  membres.flatMap((m) =>
    LIENS.flatMap((lien) => {
      const valeur = brouillon[cleReponse(m.participationId, lien)];
      return valeur === undefined
        ? []
        : [{ cite: m.participationId, lien, valeur }];
    })
  );
