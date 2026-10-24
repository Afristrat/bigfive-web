import {
  consentirApercu,
  informerApercu,
  repondreApercu,
  retirerApercu
} from '@/actions/reseau-apercu';
import {
  nomProfilApercu,
  PROFILS_APERCU,
  type ProfilApercu
} from '@/lib/apercu-resultats';
import {
  LIENS,
  valeursDuLien,
  type ActionsReseau,
  type EtatMoi,
  type ReleveReseau,
  type ReponseLien
} from '@/lib/reseau-releve';

// Vue « reseau » de /admin/apercu-resultats : le vrai écran du relevé monté sur
// les quatre personnes fictives de l'aperçu (AM, KB, SR, HT). La personne
// choisie répond ; les trois autres sont les membres de son équipe. Aucune base :
// les données sont fabriquées ici et les actions ne font rien.

const CHEMIN = '/admin/apercu-resultats';

/** Étapes montrables : les trois temps, le relevé rempli, l'opposition et le relevé fermé par l'interrupteur. */
export const ETAPES_APERCU_RESEAU = [
  'information',
  'consentement',
  'releve',
  'repondu',
  'oppose',
  'ferme',
  'fermeOppose'
] as const;
export type EtapeApercuReseau = (typeof ETAPES_APERCU_RESEAU)[number];

export const CAMPAGNES_APERCU_RESEAU = [
  'ouverte',
  'close',
  'brouillon'
] as const;
export type CampagneApercuReseau = (typeof CAMPAGNES_APERCU_RESEAU)[number];

export type ReglagesReseau = {
  etape: EtapeApercuReseau;
  campagne: CampagneApercuReseau;
};

const estEtape = (valeur: unknown): valeur is EtapeApercuReseau =>
  ETAPES_APERCU_RESEAU.some((e) => e === valeur);

/** Réglages d'URL de la vue ; toute valeur inconnue ou multiple retombe sur le défaut. */
export function lireReglagesReseau(
  recherche: Record<string, string | string[] | undefined>
): ReglagesReseau {
  const { etape, campagne } = recherche;
  return {
    etape: estEtape(etape) ? etape : 'information',
    campagne:
      campagne === 'close' || campagne === 'brouillon' ? campagne : 'ouverte'
  };
}

export const lienApercuReseau = (
  profil: ProfilApercu,
  reglages: ReglagesReseau
): string =>
  `${CHEMIN}?vue=reseau&profil=${profil}&etape=${reglages.etape}&campagne=${reglages.campagne}`;

// Identifiants fictifs stables, un par personne de l'aperçu.
const IDENTIFIANTS: Record<ProfilApercu, string> = {
  AM: '22222222-bbbb-4bbb-8bbb-000000000001',
  KB: '22222222-bbbb-4bbb-8bbb-000000000002',
  SR: '22222222-bbbb-4bbb-8bbb-000000000003',
  HT: '22222222-bbbb-4bbb-8bbb-000000000004'
};

export const participationApercu = (profil: ProfilApercu): string =>
  IDENTIFIANTS[profil];

// Le nom de profil porte parfois une précision (« Amine (estimation) ») qui
// n'a pas de sens pour un collègue : seul le nom est gardé.
const nomCollegue = (code: ProfilApercu): string =>
  nomProfilApercu(code).replace(/\s*\(.*\)\s*$/, '');

const DATE = '2026-10-23T09:00:00Z';

/** Relevé fictif tel que le rendrait app.reseau_releve pour cette personne et cette étape. */
export function releveApercu(
  profil: ProfilApercu,
  etape: EtapeApercuReseau,
  campagne: CampagneApercuReseau
): ReleveReseau {
  // Comme la base : membres triés par nom.
  const membres = PROFILS_APERCU.filter((p) => p !== profil)
    .map((p) => ({ participationId: IDENTIFIANTS[p], nom: nomCollegue(p) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  // Interrupteur fermé : mon état et le nombre de mes réponses, rien d'autre.
  // Opposée : l'opposition a effacé accords et réponses.
  if (etape === 'ferme' || etape === 'fermeOppose') {
    const oppose = etape === 'fermeOppose';
    return {
      ferme: true,
      nbReponses: oppose ? 0 : membres.length * LIENS.length,
      campagneOuverte: false,
      moi: {
        informeLe: DATE,
        opposeLe: oppose ? DATE : null,
        accordRepondreLe: oppose ? null : DATE,
        accordCarteLe: oppose ? null : DATE,
        accordRapportLe: oppose ? null : DATE
      },
      membres: [],
      reponses: []
    };
  }

  const moi: EtatMoi | null =
    etape === 'information'
      ? null
      : {
          informeLe: DATE,
          opposeLe: etape === 'oppose' ? DATE : null,
          accordRepondreLe:
            etape === 'releve' || etape === 'repondu' ? DATE : null,
          accordCarteLe: etape === 'repondu' ? DATE : null,
          accordRapportLe: etape === 'repondu' ? DATE : null
        };

  // Réponses fabriquées, variées et toujours dans l'échelle de chaque lien.
  const reponses: ReponseLien[] =
    etape === 'repondu'
      ? membres.flatMap((m, i) =>
          LIENS.map((lien, j) => {
            const valeurs = valeursDuLien(lien);
            return {
              cite: m.participationId,
              lien,
              valeur: valeurs[(i + j) % valeurs.length] ?? 0
            };
          })
        )
      : [];

  return {
    ferme: false,
    nbReponses: reponses.length,
    campagneOuverte: campagne === 'ouverte',
    moi,
    // Comme la base : aucun membre tant que je ne suis pas informé, ni si je suis opposé.
    membres: etape === 'information' || etape === 'oppose' ? [] : membres,
    reponses
  };
}

/** Actions de l'aperçu : elles rendent « apercu » sans rien faire. */
export const actionsApercuReseau: ActionsReseau = {
  informer: informerApercu,
  consentir: consentirApercu,
  repondre: repondreApercu,
  retirer: retirerApercu
};
