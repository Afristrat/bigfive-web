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

/** Étapes montrables : les trois temps, le relevé rempli et l'opposition. */
export const ETAPES_APERCU_RESEAU = [
  'information',
  'consentement',
  'releve',
  'repondu',
  'oppose'
] as const;
export type EtapeApercuReseau = (typeof ETAPES_APERCU_RESEAU)[number];

export const CAMPAGNES_APERCU_RESEAU = ['ouverte', 'close'] as const;
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
    campagne: campagne === 'close' ? 'close' : 'ouverte'
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

  const moi: EtatMoi | null =
    etape === 'information'
      ? null
      : {
          informeLe: DATE,
          opposeLe: etape === 'oppose' ? DATE : null,
          accordRepondreLe:
            etape === 'releve' || etape === 'repondu' ? DATE : null,
          accordCarteLe: etape === 'repondu' ? DATE : null
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
