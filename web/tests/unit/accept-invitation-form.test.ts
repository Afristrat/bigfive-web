import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const states = new Map<unknown, unknown>();
const pendings = new Set<unknown>();
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useActionState: (action: unknown, initial: unknown) => [
    states.get(action) ?? initial,
    action,
    pendings.has(action)
  ]
}));
vi.mock('@/actions/invitation-accept', () => ({ acceptInvitation: vi.fn() }));
vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; className?: string }) =>
    createElement(
      'a',
      { href: props.href, className: props.className },
      props.children as never
    )
}));

import { acceptInvitation } from '@/actions/invitation-accept';
import {
  AcceptInvitationForm,
  type AcceptLabels
} from '@/components/accept-invitation-form';

const labels: AcceptLabels = {
  button: 'Accepter l’invitation',
  accepting: 'Ouverture…',
  unavailable: 'Invitation indisponible.',
  otherSession: 'Autre session ouverte.',
  signinRequired: 'Invitation acceptée, connectez-vous.',
  signinLink: 'Aller à la connexion',
  failed: 'Échec.'
};

const render = (): string =>
  renderToStaticMarkup(
    createElement(AcceptInvitationForm, { token: 'T', labels })
  );
const set = (status: string): void => {
  states.set(acceptInvitation, { status });
};

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('AcceptInvitationForm', () => {
  it('au repos : un bouton, une région vivante vide', () => {
    const html = render();
    expect(html).toContain(labels.button);
    expect(html).toMatch(/role="status"[^>]*><\/div>/);
  });

  it('état définitif (invalid, unavailable, signin_required) : le bouton disparaît', () => {
    for (const status of ['invalid', 'unavailable', 'signin_required']) {
      states.clear();
      set(status);
      const html = render();
      expect(html, status).not.toContain('<button');
      expect(html, status).not.toContain(labels.button);
    }
  });

  it('état réessayable (other_session, failed) : le bouton reste', () => {
    for (const status of ['other_session', 'failed']) {
      states.clear();
      set(status);
      expect(render(), status).toContain(labels.button);
    }
  });

  it('état définitif : le message reste lisible et le conteneur est focalisable', () => {
    set('unavailable');
    const html = render();
    expect(html).toContain(labels.unavailable);
    expect(html).toContain('tabindex="-1"');
  });

  it('signin_required : lien vers la connexion', () => {
    set('signin_required');
    expect(render()).toContain('href="/connexion"');
  });

  it('en cours : état annoncé, bouton aria-disabled et non disabled', () => {
    pendings.add(acceptInvitation);
    const html = render();
    expect(html).toContain(labels.accepting);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});

describe('AcceptInvitationForm : envoi sans reset natif', () => {
  it('le formulaire n’a pas de prop action', () => {
    const form = /<form[^>]*>/.exec(render())?.[0] ?? '';
    expect(form).not.toContain('action=');
  });
});
