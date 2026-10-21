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
 * responsable du client n'y a jamais accès : il ne voit que des
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
 * Accès au questionnaire : seul un participant d'au moins une
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

// Plafonds uniques, repris par les schémas, l'analyse de la liste et les
// composants (attributs `maxLength`) : ne jamais les recopier.
// Message libre : borné à 1..1000 par la base (CHECK de la migration 0003).
export const INVITATION_MESSAGE_MAX = 1000;
// Le prénom est borné à 1..80 par la base (CHECK de la migration 0003).
export const INVITEE_NAME_MAX = 80;
export const INVITE_BATCH_MAX = 25;
export const INVITE_LIST_MAX_CHARS = 4000;
export const CAMPAIGN_TITLE_MAX = 160;
// Adresse : 254 caractères au plus, comme le CHECK de `app.invitations.email`
// (migration 0003) et la limite d'une adresse de messagerie (RFC 5321).
export const INVITE_ADDRESS_MAX = 254;

// Hameçonnage (I4) : un texte libre saisi par un responsable est repris dans un
// e-mail envoyé au nom de Tenga, il ne doit ni porter de lien ni masquer
// quoi que ce soit.
//
// LINKISH, appliqué au texte NFKC (pleine chasse ramenée à l'ASCII) dont on a
// retiré les marques combinantes et les caractères ignorables (sinon
// « evil\u0332.com » échappe) :
//  - un schéma suivi de « :// » (http, https, ftp, javascript...), « www. »,
//    « mailto: », une arobase (adresse) ;
//  - une adresse IPv4 (« 192.168.1.10/login ») ;
//  - un domaine nu suivi de « / » (« evil.example/login ») ;
//  - un domaine nu dont le suffixe est dans DOMAIN_SUFFIXES.
// Choix assumé et réversible : un point collé à un mot ne suffit PAS à faire un
// domaine, sinon « Dr.Alami », « Mme.Tazi », « M.Dupont », « p.ex. »,
// « Merci.Cordialement » seraient refusés. Seuls les suffixes de la liste le
// sont. Risque résiduel accepté : un domaine à suffixe hors liste sans « / »
// (« evil.finance »), et les formes obfusquées qui ne sont pas des liens
// (« hxxp://evil[.]com », « evil dot com »). Pour durcir, allonger la liste.
const LABEL = String.raw`[\p{L}\p{N}](?:[\p{L}\p{N}-]*[\p{L}\p{N}])?`;
const DOT = String.raw`[.\u3002]`;
// Extensions les plus utilisées pour l'hameçonnage (génériques, gratuites ou
// bon marché) et celles du Maroc, de la France, du Maghreb et de l'Afrique
// francophone proches des destinataires. Volontairement sans « it », « to »,
// « us », « es » : trop proches d'abréviations ordinaires.
const DOMAIN_SUFFIXES = [
  'com',
  'net',
  'org',
  'info',
  'biz',
  'io',
  'co',
  'me',
  'app',
  'xyz',
  'top',
  'online',
  'site',
  'link',
  'click',
  'dev',
  'cloud',
  'live',
  'shop',
  'store',
  'tech',
  'club',
  'vip',
  'email',
  'support',
  'work',
  'page',
  'icu',
  'cc',
  'ws',
  'tk',
  'ml',
  'ga',
  'cf',
  'gq',
  'pw',
  'eu',
  'uk',
  'de',
  'ru',
  'cn',
  'gov',
  'edu',
  'africa',
  'ma',
  'fr',
  'dz',
  'tn',
  'sn',
  'ci',
  'be',
  'ch',
  'ca',
  'zip',
  'mov',
  'pro',
  'in',
  'ng',
  'ly'
].join('|');
const LINKISH = new RegExp(
  [
    String.raw`[a-z][a-z0-9+.-]*:\/\/`,
    String.raw`www\.`,
    'mailto:',
    '@',
    String.raw`(?<![\p{L}\p{N}.])(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)(?![\p{L}\p{N}])`,
    `(?<![\\p{L}\\p{N}-])${LABEL}(?:${DOT}${LABEL})*${DOT}\\p{L}{2,}\\/`,
    `(?<![\\p{L}\\p{N}-])${LABEL}(?:${DOT}${LABEL})*${DOT}(?:${DOMAIN_SUFFIXES})(?![\\p{L}\\p{N}])`
  ].join('|'),
  'iu'
);

// Caractères sans largeur ou à effet caché : toute la propriété Unicode
// Default_Ignorable_Code_Point (dont U+00AD, U+034F, U+115F, U+180E,
// U+200B à U+200F, U+202A à U+202E, U+2060 à U+206F, U+3164, U+FE00 à U+FE0F,
// U+FEFF, U+E0000 à U+E0FFF), toute la catégorie Cf (dont U+061C), et les
// séparateurs de ligne et de paragraphe U+2028, U+2029.
const IGNORABLE = String.raw`\p{Default_Ignorable_Code_Point}\p{Cf}\u2028\u2029`;
const INVISIBLE = new RegExp(`[${IGNORABLE}]`, 'u');
// Exceptions légitimes, retirées avant le contrôle : U+200C et U+200D entre
// deux lettres arabes (arabe, persan), U+200D entre deux pictogrammes (émojis
// composés), U+FE0E et U+FE0F juste après un pictogramme (présentation émoji).
const LEGIT_FORMAT = new RegExp(
  [
    String.raw`(?<=\p{Script=Arabic})[\u200C\u200D](?=\p{Script=Arabic})`,
    String.raw`(?<=\p{Extended_Pictographic}[\uFE0E\uFE0F]?)\u200D(?=\p{Extended_Pictographic})`,
    String.raw`(?<=\p{Extended_Pictographic})[\uFE0E\uFE0F]`
  ].join('|'),
  'gu'
);
const DROPPED_FOR_LINKS = new RegExp(`[\\p{M}${IGNORABLE}]`, 'gu');

// LINKISH est quadratique sur « a.a.a. » répété (100 000 caractères : 10 à 46 s) et
// zod exécute `.refine` même après l'échec de `.max`. Toute entrée plus longue
// que le plus grand plafond du produit est donc refusée d'emblée, sans regex :
// aucun texte légitime ne la dépasse, la base la refuserait de toute façon.
const LINK_CHECK_MAX_CHARS = Math.max(
  INVITATION_MESSAGE_MAX,
  CAMPAIGN_TITLE_MAX,
  INVITEE_NAME_MAX
);

/**
 * Vrai si le texte contient un lien, une adresse, un domaine ou un caractère
 * invisible. Vrai aussi, sans analyse, au-delà de `LINK_CHECK_MAX_CHARS`.
 */
export const hasLinkOrInvisible = (text: string): boolean => {
  if (text.length > LINK_CHECK_MAX_CHARS) return true;
  const folded = text.normalize('NFKC');
  const skeleton = folded.replace(DROPPED_FOR_LINKS, '');
  return (
    LINKISH.test(skeleton) ||
    INVISIBLE.test(text.replace(LEGIT_FORMAT, '')) ||
    INVISIBLE.test(folded.replace(LEGIT_FORMAT, ''))
  );
};

/**
 * Miroir de `private.peut_gerer` : un administrateur Tenga ou le responsable
 * de l'organisation gère ses campagnes. La base reste l'autorité.
 */
export const canManageCampaigns = (viewer: OrgViewer | null): boolean =>
  decideOrgAccess(viewer, ['responsable']) !== null;

/**
 * Rôles que le lecteur peut attribuer dans l'organisation : l'administrateur
 * Tenga les trois, le responsable de l'organisation les participants seuls,
 * personne d'autre. Sert de pré-contrôle avant tout effet de bord.
 */
export function assignableRoles(viewer: OrgViewer | null): readonly OrgRole[] {
  if (!viewer) return [];
  if (viewer.isTengaAdmin) return orgRoles;
  return viewer.roleInOrganization === 'responsable' ? ['participant'] : [];
}

/** Rôles proposés pour inviter un membre (jamais participant : il passe par une campagne). */
export const memberInviteRoles = (
  viewer: OrgViewer | null
): readonly ('responsable' | 'consultant')[] =>
  assignableRoles(viewer).filter(
    (role): role is 'responsable' | 'consultant' => role !== 'participant'
  );
