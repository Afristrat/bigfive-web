import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

const catalogues = { fr, en, ar } as const;

describe('textes de T05 corrigés après contre-revue', () => {
  it('abortedForbidden dit quoi faire (fr)', () => {
    expect(fr.invitations.abortedForbidden).toContain(
      'Demandez à un responsable de l’organisation'
    );
  });

  it('abortedForbidden dit quoi faire (en)', () => {
    expect(en.invitations.abortedForbidden).toMatch(/ask .*organi[sz]ation/i);
  });

  it('opened dit où est le formulaire d’invitation (fr, en)', () => {
    expect(fr.campaigns.opened).toContain(
      'Le formulaire d’invitation s’affiche sous la liste.'
    );
    expect(en.campaigns.opened).toMatch(/form .* below the list/i);
  });

  it.each(Object.entries(catalogues))(
    'le titre invitation.messageTitle (%s) ne finit pas par deux-points',
    (_, catalogue) => {
      expect(catalogue.invitation.messageTitle).not.toMatch(/[: ]\s*$/);
    }
  );
});
