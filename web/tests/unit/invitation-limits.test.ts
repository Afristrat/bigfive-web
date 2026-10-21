import { describe, expect, it } from 'vitest';
import {
  INVITATION_CEILING_WINDOW_SECONDS,
  INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED,
  INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED,
  invitationLimits
} from '@/lib/invitation-limits';
import { createRateLimiter, type Limit } from '@/lib/sliding-window';

// Comportement réel du limiteur avec les plafonds d'IP : un bureau entier
// derrière une même adresse publique passe, une rafale est arrêtée.
const countAllowed = (limit: Limit) => {
  const limiter = createRateLimiter({ now: () => 1_000_000 });
  let allowed = 0;
  while (!limiter.isLimited('probe', limit, '203.0.113.9')) allowed += 1;
  return allowed;
};

describe('invitationLimits : plafonds par IP', () => {
  it('accepte 120 acceptations par heure et par IP, pas 121', () => {
    expect(countAllowed(invitationLimits.acceptPerIp)).toBe(120);
  });

  it('accepte 600 consultations de lien par heure et par IP, pas 601', () => {
    expect(countAllowed(invitationLimits.viewPerIp)).toBe(600);
  });
});

// Plafonds journaliers tenus en base (migration 0014) : constantes transmises à
// la fonction SQL, réglables sans migration. DÉFAUTS NON VALIDÉS par Amine.
describe('plafonds journaliers transmis à la base', () => {
  it('300 invitations par organisation, 5 e-mails par destinataire, sur 24 heures', () => {
    expect(INVITATIONS_PER_ORG_PER_DAY_UNVALIDATED).toBe(300);
    expect(INVITATIONS_PER_RECIPIENT_PER_DAY_UNVALIDATED).toBe(5);
    expect(INVITATION_CEILING_WINDOW_SECONDS).toBe(24 * 60 * 60);
  });

  it('la fenêtre ne dépasse pas la durée de conservation des compteurs (48 heures)', () => {
    expect(INVITATION_CEILING_WINDOW_SECONDS).toBeLessThanOrEqual(48 * 60 * 60);
  });

  it('les anciens plafonds journaliers en mémoire n’existent plus', () => {
    expect(invitationLimits).not.toHaveProperty('perRecipientDayUnvalidated');
  });
});
