import type { OrgRole } from '@/lib/access-rules';

// Accès « Rapports » de l'en-tête : règles pures, sans base ni session. Les faits
// (appartenance à tenga_admins, rôles, campagnes visibles) sont lus côté serveur
// avec l'identité de la personne ; ces règles décident seulement des liens à
// montrer. Chaque lien mène à une page qui revérifie le droit : le menu n'ouvre
// rien que la page n'ouvrirait pas.

export type EntreeRapports = {
  href: string;
  libelle: string;
  /** Précision sous le libellé (nature du rapport d'une campagne). */
  detail?: string;
};

export type SectionRapports = {
  /** Clé stable (rendu React). */
  cle: string;
  titre: string;
  /** Rôle tenu dans l'organisation, déjà traduit. */
  sousTitre?: string;
  entrees: EntreeRapports[];
};

export type MenuRapports = SectionRapports[];

export type AppartenanceRapports = {
  organisationId: string;
  nom: string;
  slug: string;
  role: OrgRole;
};

export type CampagneRapports = {
  id: string;
  titre: string;
  statut: 'brouillon' | 'ouverte' | 'close';
  organisationId: string;
};

export type FaitsRapports = {
  admin: boolean;
  appartenances: readonly AppartenanceRapports[];
  /** Campagnes des organisations où la personne est responsable ou consultant. */
  campagnes: readonly CampagneRapports[];
};

/** Libellés du menu (espace « pilotage.menu » et rôles), déjà traduits. */
export type LibellesRapports = {
  admin: string;
  organisations: string;
  apercuResultats: string;
  apercuRapport: string;
  campagnes: string;
  resultats: string;
  synthese: string;
  parcours: string;
  mesResultats: string;
  mesBinomes: string;
  roles: Record<OrgRole, string>;
};

/** Rôles dont l'organisation a des rapports de campagne à montrer. */
export const rolesAvecCampagnes: readonly OrgRole[] = [
  'responsable',
  'consultant'
];

/**
 * Sections du menu, dans l'ordre : administration Tenga, puis une section par
 * organisation (responsable : gestion et synthèses ; consultant : résultats et
 * synthèses de chaque campagne lancée), puis le parcours personnel du
 * participant. Aucune section vide : un visiteur ou un compte sans rôle reçoit
 * une liste vide, et l'en-tête ne montre alors rien.
 */
export function construireMenuRapports(
  faits: FaitsRapports,
  libelles: LibellesRapports
): MenuRapports {
  const sections: MenuRapports = [];

  if (faits.admin) {
    sections.push({
      cle: 'admin',
      titre: libelles.admin,
      entrees: [
        { href: '/admin', libelle: libelles.organisations },
        { href: '/admin/apercu-resultats', libelle: libelles.apercuResultats },
        { href: '/admin/apercu-rapport', libelle: libelles.apercuRapport }
      ]
    });
  }

  const organisations = [...faits.appartenances]
    .filter((a) => rolesAvecCampagnes.includes(a.role))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
  for (const org of organisations) {
    const base = `/o/${org.slug}`;
    const entrees: EntreeRapports[] = [];
    if (org.role === 'responsable') {
      entrees.push({ href: base, libelle: libelles.campagnes });
    }
    for (const campagne of faits.campagnes) {
      if (campagne.organisationId !== org.organisationId) continue;
      if (campagne.statut === 'brouillon') continue;
      const chemin = `${base}/campagnes/${campagne.id}`;
      // Résultats individuels : le consultant seul (le responsable ne voit
      // que des agrégats). Synthèse : à la clôture, pour les deux.
      if (org.role === 'consultant') {
        entrees.push({
          href: `${chemin}/resultats`,
          libelle: campagne.titre,
          detail: libelles.resultats
        });
      }
      if (campagne.statut === 'close') {
        entrees.push({
          href: `${chemin}/synthese`,
          libelle: campagne.titre,
          detail: libelles.synthese
        });
      }
    }
    if (entrees.length > 0) {
      sections.push({
        cle: `org-${org.organisationId}`,
        titre: org.nom,
        sousTitre: libelles.roles[org.role],
        entrees
      });
    }
  }

  if (faits.appartenances.some((a) => a.role === 'participant')) {
    sections.push({
      cle: 'parcours',
      titre: libelles.parcours,
      entrees: [
        { href: '/mes-resultats', libelle: libelles.mesResultats },
        { href: '/mes-resultats/binomes', libelle: libelles.mesBinomes }
      ]
    });
  }

  return sections;
}

/** Le lien mène-t-il à la page affichée (chemin sans préfixe de langue) ? */
export const estPageCourante = (href: string, chemin: string): boolean =>
  chemin === href || chemin.endsWith(href);
