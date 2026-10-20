import { describe, expect, it } from 'vitest';
import {
  decideOrgAccess,
  decideReadResult,
  decideSignInEligibility,
  decideTestMode,
  isAdminEmail,
  isInvitationLocale,
  isOrgRole,
  type OrgRole,
  type ReadViewer
} from '@/lib/access-rules';

// Résultat de « alice » dans l'organisation A.
const result = { userId: 'alice', organizationId: 'orgA' };

const viewer = (
  userId: string,
  role: OrgRole | null = null,
  isTengaAdmin = false
): ReadViewer => ({ userId, isTengaAdmin, roleInResultOrganization: role });

describe('decideReadResult', () => {
  it('refuse sans session', () => {
    expect(decideReadResult(null, result)).toBe(false);
  });

  it('autorise le propriétaire', () => {
    expect(decideReadResult(viewer('alice', 'member'), result)).toBe(true);
  });

  it('autorise le propriétaire d’un résultat hors organisation', () => {
    expect(
      decideReadResult(viewer('alice'), {
        userId: 'alice',
        organizationId: null
      })
    ).toBe(true);
  });

  it('refuse un autre participant de la même organisation', () => {
    expect(decideReadResult(viewer('bob', 'member'), result)).toBe(false);
  });

  it('refuse le responsable (owner) de la même organisation', () => {
    expect(decideReadResult(viewer('carol', 'owner'), result)).toBe(false);
  });

  it('autorise le consultant affecté à l’organisation du résultat', () => {
    expect(decideReadResult(viewer('dave', 'consultant'), result)).toBe(true);
  });

  it('refuse le consultant d’une autre organisation', () => {
    // Le rôle fourni est celui de l’organisation du résultat : aucun ici.
    expect(decideReadResult(viewer('erin', null), result)).toBe(false);
  });

  it('autorise l’administrateur Tenga', () => {
    expect(decideReadResult(viewer('root', null, true), result)).toBe(true);
  });

  it('refuse l’accès à un résultat sans organisation à un consultant', () => {
    expect(
      decideReadResult(viewer('dave', 'consultant'), {
        userId: 'alice',
        organizationId: null
      })
    ).toBe(false);
  });

  it('refuse un résultat ancien sans propriétaire à un non-administrateur', () => {
    expect(decideReadResult(viewer('alice'), {})).toBe(false);
    expect(decideReadResult(viewer('root', null, true), {})).toBe(true);
  });
});

describe('decideOrgAccess', () => {
  const dashboardRoles: OrgRole[] = ['owner', 'consultant'];

  it('refuse sans session', () => {
    expect(decideOrgAccess(null, dashboardRoles)).toBeNull();
  });

  it('renvoie le rôle d’un responsable', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: false, roleInOrganization: 'owner' },
        dashboardRoles
      )
    ).toBe('owner');
  });

  it('renvoie le rôle d’un consultant affecté', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: false, roleInOrganization: 'consultant' },
        dashboardRoles
      )
    ).toBe('consultant');
  });

  it('refuse un consultant non affecté (non membre)', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: false, roleInOrganization: null },
        dashboardRoles
      )
    ).toBeNull();
  });

  it('refuse un participant quand son rôle n’est pas autorisé', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: false, roleInOrganization: 'member' },
        dashboardRoles
      )
    ).toBeNull();
  });

  it('laisse entrer l’administrateur Tenga non membre comme consultant', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: true, roleInOrganization: null },
        dashboardRoles
      )
    ).toBe('consultant');
  });

  it('prend le premier rôle autorisé pour l’administrateur Tenga sinon', () => {
    expect(
      decideOrgAccess({ isTengaAdmin: true, roleInOrganization: null }, [
        'owner',
        'member'
      ])
    ).toBe('owner');
  });

  it('renvoie null si aucun rôle n’est autorisé, même pour un administrateur', () => {
    expect(
      decideOrgAccess({ isTengaAdmin: true, roleInOrganization: null }, [])
    ).toBeNull();
  });

  it('garde le rôle réel d’un administrateur Tenga membre', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: true, roleInOrganization: 'owner' },
        dashboardRoles
      )
    ).toBe('owner');
  });

  it('applique la règle d’administration à un administrateur membre sans rôle autorisé', () => {
    expect(
      decideOrgAccess(
        { isTengaAdmin: true, roleInOrganization: 'member' },
        dashboardRoles
      )
    ).toBe('consultant');
  });
});

describe('administrateurs et rôles', () => {
  const admins = [' Admin@Tenga.ma ', 'autre@tenga.ma'];

  it('compare les e-mails en minuscules, espaces ignorés', () => {
    expect(isAdminEmail('ADMIN@tenga.ma', admins)).toBe(true);
    expect(isAdminEmail('  autre@TENGA.ma ', admins)).toBe(true);
    expect(isAdminEmail('intrus@tenga.ma', admins)).toBe(false);
  });

  it('refuse une adresse absente, vide ou une liste vide', () => {
    expect(isAdminEmail(undefined, admins)).toBe(false);
    expect(isAdminEmail(null, admins)).toBe(false);
    expect(isAdminEmail('  ', ['  '])).toBe(false);
    expect(isAdminEmail('x@y.z', [])).toBe(false);
  });

  it('reconnaît les trois rôles et rien d’autre', () => {
    expect(isOrgRole('owner')).toBe(true);
    expect(isOrgRole('consultant')).toBe(true);
    expect(isOrgRole('member')).toBe(true);
    expect(isOrgRole('admin')).toBe(false);
    expect(isOrgRole('owner,member')).toBe(false);
  });

  it('reconnaît les langues d’invitation', () => {
    expect(isInvitationLocale('ar')).toBe(true);
    expect(isInvitationLocale('es')).toBe(false);
    expect(isInvitationLocale(undefined)).toBe(false);
  });
});

describe('decideSignInEligibility', () => {
  const none = {
    accountExists: false,
    isAdminEmail: false,
    hasPendingInvitation: false
  };

  it('refuse une adresse inconnue sans invitation (inscription fermée)', () => {
    expect(decideSignInEligibility(none)).toBe(false);
  });

  it('accepte un compte existant', () => {
    expect(decideSignInEligibility({ ...none, accountExists: true })).toBe(
      true
    );
  });

  it('accepte un administrateur Tenga pas encore inscrit', () => {
    expect(decideSignInEligibility({ ...none, isAdminEmail: true })).toBe(true);
  });

  it('accepte une invitation en cours', () => {
    expect(
      decideSignInEligibility({ ...none, hasPendingInvitation: true })
    ).toBe(true);
  });
});

describe('decideTestMode', () => {
  it('refuse sans session', () => {
    expect(decideTestMode(null)).toEqual({ mode: 'denied' });
  });

  it('fait passer le test à un participant, dans son organisation', () => {
    expect(
      decideTestMode({
        memberships: [{ organizationId: 'orgA', role: 'member' }],
        activeOrganizationId: null
      })
    ).toEqual({ mode: 'participate', organizationId: 'orgA' });
  });

  it('préfère l’organisation active quand le participant en a plusieurs', () => {
    expect(
      decideTestMode({
        memberships: [
          { organizationId: 'orgA', role: 'member' },
          { organizationId: 'orgB', role: 'member' }
        ],
        activeOrganizationId: 'orgB'
      })
    ).toEqual({ mode: 'participate', organizationId: 'orgB' });
  });

  it('retombe sur la première organisation si l’active n’est pas participante', () => {
    expect(
      decideTestMode({
        memberships: [
          { organizationId: 'orgA', role: 'owner' },
          { organizationId: 'orgB', role: 'member' }
        ],
        activeOrganizationId: 'orgA'
      })
    ).toEqual({ mode: 'participate', organizationId: 'orgB' });
  });

  it('refuse le consultant : plus d’aperçu du questionnaire', () => {
    expect(
      decideTestMode({
        memberships: [{ organizationId: 'orgA', role: 'consultant' }],
        activeOrganizationId: 'orgA'
      })
    ).toEqual({ mode: 'denied' });
  });

  it('refuse le responsable (un seul rôle par organisation)', () => {
    expect(
      decideTestMode({
        memberships: [{ organizationId: 'orgA', role: 'owner' }],
        activeOrganizationId: 'orgA'
      })
    ).toEqual({ mode: 'denied' });
  });

  it('refuse un compte sans aucune appartenance', () => {
    expect(
      decideTestMode({ memberships: [], activeOrganizationId: null })
    ).toEqual({ mode: 'denied' });
  });
});
