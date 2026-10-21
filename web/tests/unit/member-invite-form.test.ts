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
vi.mock('@/actions/members', () => ({ inviteMember: vi.fn() }));

import { inviteMember } from '@/actions/members';
import {
  MemberInviteForm,
  type MemberInviteLabels
} from '@/components/member-invite-form';

const labels: MemberInviteLabels = {
  requiredLegend: 'Les champs (*) sont obligatoires.',
  emailLabel: 'Adresse',
  confirmLabel: 'Confirmation',
  confirmHelp: 'Deux fois.',
  roleLabel: 'Rôle',
  rolePlaceholder: 'Choisissez un rôle',
  roleHelp: 'Remplace le rôle existant.',
  roles: { responsable: 'Responsable', consultant: 'Consultant' },
  languageLabel: 'Langue',
  languages: { fr: 'Français', ar: 'Arabe', en: 'Anglais' },
  working: 'Opération en cours…',
  submit: 'Donner l’accès',
  invited: 'Accès accordé.',
  invitedMailFailed: 'Accès accordé, e-mail non parti.',
  invalid: 'Vérifiez le formulaire.',
  forbidden: 'Interdit.',
  rateLimited: 'Plafond atteint.',
  error: 'Échec.'
};

const render = (
  roles: ('responsable' | 'consultant')[] = ['responsable', 'consultant']
): string =>
  renderToStaticMarkup(
    createElement(MemberInviteForm, {
      locale: 'fr',
      slug: 'acme',
      organisationId: 'o1',
      roles,
      defaultLanguage: 'en',
      labels
    })
  );
const tagNamed = (html: string, tag: string, name: string): string =>
  new RegExp(`<${tag}[^>]*name="${name}"[^>]*>`).exec(html)?.[0] ?? '';
const roleSelect = (html: string): string =>
  /<select[^>]*name="role"[^>]*>.*?<\/select>/s.exec(html)?.[0] ?? '';

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('MemberInviteForm', () => {
  it('le rôle n’est jamais présélectionné : option vide désactivée sélectionnée', () => {
    const select = roleSelect(render());
    expect(select).toMatch(
      /<option value="" disabled=""[^>]*selected=""|<option value="" selected="" disabled=""/
    );
    expect(select).not.toMatch(
      /<option value="(responsable|consultant)"[^>]*selected/
    );
    expect(select).toContain('required');
    expect(select).toContain('Choisissez un rôle');
  });

  it('le rôle proposé dépend du rôle de l’appelant', () => {
    const select = roleSelect(render(['consultant']));
    expect(select).not.toContain('value="responsable"');
    expect(select).toContain('value="consultant"');
  });

  it('langue contrôlée : la langue par défaut est sélectionnée', () => {
    expect(render()).toMatch(/<option value="en" lang="en" selected=""/);
  });

  it('validation « aria » : aucun setCustomValidity ne bloque le renvoi après un refus', () => {
    states.set(inviteMember, { status: 'invalid' });
    const html = render();
    for (const name of ['email', 'emailConfirmation']) {
      const input = tagNamed(html, 'input', name);
      expect(input).toContain('aria-invalid="true"');
      expect(input).toContain('aria-required="true"');
      expect(input).not.toMatch(/\srequired(=|\s|>)/);
    }
  });

  it('légende des champs obligatoires', () => {
    expect(render()).toContain(labels.requiredLegend);
  });

  it('adresses en ltr, sans saisie automatique', () => {
    const html = render();
    for (const name of ['email', 'emailConfirmation']) {
      expect(tagNamed(html, 'input', name)).toContain('dir="ltr"');
      expect(tagNamed(html, 'input', name)).toContain('autoComplete="off"');
    }
  });

  it('refus de saisie : les deux adresses sont marquées, reliées à la région', () => {
    states.set(inviteMember, { status: 'invalid' });
    const html = render();
    const regionId = /<div id="([^"]+)" role="status"/.exec(html)?.[1];
    for (const name of ['email', 'emailConfirmation']) {
      const field = tagNamed(html, 'input', name);
      expect(field).toContain('aria-invalid="true"');
      expect(field).toContain(`aria-describedby="${regionId}`);
    }
    expect(html).toContain('Vérifiez le formulaire.');
  });

  it('au repos : rien de marqué, région présente et vide', () => {
    const html = render();
    expect(html).not.toContain('aria-invalid="true"');
    expect(html).toMatch(/<div id="[^"]+" role="status"[^>]*><\/div>/);
  });

  it('en cours : état annoncé, bouton aria-disabled', () => {
    pendings.add(inviteMember);
    const html = render();
    expect(html).toContain('Opération en cours…');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)[^>]*>Opération/);
  });
});

describe('MemberInviteForm : envoi sans reset natif', () => {
  it('le formulaire n’a pas de prop action et ne bloque pas une adresse mal formée', () => {
    const form = /<form[^>]*>/.exec(render())?.[0] ?? '';
    expect(form).not.toContain('action=');
    expect(form).toContain('noValidate=""');
  });

  it('les adresses gardent type email (clavier mobile) mais sans blocage natif', () => {
    const html = render();
    expect(tagNamed(html, 'input', 'email')).toContain('type="email"');
    expect(tagNamed(html, 'input', 'emailConfirmation')).toContain(
      'type="email"'
    );
  });
});
