// Règles d'accès pures : aucune base, aucune session, aucun effet de bord.
// Les appelants fournissent les faits (rôle et appartenance à `tenga_admins`
// lus en base) ; ces règles les jugent.

// Un seul rôle par organisation (plan § 3) : responsable, consultant ou participant.
export const orgRoles = ['responsable', 'consultant', 'participant'] as const;
export type OrgRole = (typeof orgRoles)[number];

export const isOrgRole = (value: string): value is OrgRole =>
  orgRoles.some((role) => role === value);

export type ResultOwnership = {
  userId?: string | null;
  organizationId?: string | null;
};

export type ReadViewer = {
  userId: string;
  isTengaAdmin: boolean;
  // Rôle du lecteur dans l'organisation du résultat (null s'il n'en est pas membre).
  roleInResultOrganization: OrgRole | null;
};

/**
 * Un résultat individuel se lit uniquement par son propriétaire, un
 * administrateur Tenga ou un consultant de l'organisation du résultat. Le
 * responsable (responsable) du client n'y a jamais accès : il ne voit que des
 * agrégats de groupe.
 */
export function decideReadResult(
  viewer: ReadViewer | null,
  result: ResultOwnership
): boolean {
  if (!viewer) return false;
  if (result.userId && result.userId === viewer.userId) return true;
  if (viewer.isTengaAdmin) return true;
  return (
    !!result.organizationId && viewer.roleInResultOrganization === 'consultant'
  );
}

export type OrgViewer = {
  isTengaAdmin: boolean;
  // Rôle du lecteur dans l'organisation demandée (null s'il n'en est pas membre).
  roleInOrganization: OrgRole | null;
};

/**
 * Rôle exercé dans l'organisation, ou null si l'accès est refusé. Un
 * administrateur Tenga non membre agit comme consultant (ou, à défaut de ce
 * rôle dans la liste autorisée, avec le premier rôle autorisé).
 */
export function decideOrgAccess(
  viewer: OrgViewer | null,
  allowed: readonly OrgRole[]
): OrgRole | null {
  if (!viewer) return null;
  const held = viewer.roleInOrganization;
  if (held && allowed.includes(held)) return held;
  if (viewer.isTengaAdmin) {
    return allowed.includes('consultant') ? 'consultant' : allowed[0] ?? null;
  }
  return null;
}

export type Membership = {
  organizationId: string;
  role: OrgRole;
};

export type TestMode =
  | { mode: 'participate'; organizationId: string }
  | { mode: 'denied' };

/**
 * Accès au questionnaire : seul un participant (`participant`) d'au moins une
 * organisation le passe pour de bon, rattaché à l'organisation active si elle
 * en fait partie, sinon à la première de la liste (triée de la plus ancienne à
 * la plus récente par l'appelant). Tous les autres sont refusés : il n'y a plus
 * d'aperçu du questionnaire (arbitrage 7).
 */
export function decideTestMode(
  viewer: {
    memberships: readonly Membership[];
    activeOrganizationId: string | null;
  } | null
): TestMode {
  if (!viewer) return { mode: 'denied' };
  const asMember = viewer.memberships.filter((m) => m.role === 'participant');
  const chosen =
    asMember.find((m) => m.organizationId === viewer.activeOrganizationId) ??
    asMember[0];
  return chosen
    ? { mode: 'participate', organizationId: chosen.organizationId }
    : { mode: 'denied' };
}

// Langues proposées pour une invitation (e-mail et redirection après acceptation).
export const invitationLocales = ['fr', 'ar', 'en'] as const;
export type InvitationLocale = (typeof invitationLocales)[number];

export const isInvitationLocale = (value: unknown): value is InvitationLocale =>
  invitationLocales.some((locale) => locale === value);

export const INVITATION_MESSAGE_MAX = 1000;
export const INVITEE_NAME_MAX = 100;
