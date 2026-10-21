import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

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
vi.mock('@/actions/admin', () => ({
  addTengaAdmin: vi.fn(),
  assignRole: vi.fn(),
  createOrganization: vi.fn()
}));
import { assignRole, createOrganization } from '@/actions/admin';
import {
  OrganizationForm,
  RoleForm,
  type OrganizationFormLabels,
  type RoleFormLabels
} from '@/components/admin-forms';

const feedback = {
  invalid: 'Champs invalides',
  exists: 'Identifiant déjà utilisé',
  error: 'Échec'
};
const orgLabels: OrganizationFormLabels = {
  ...feedback,
  nameLabel: 'Nom',
  slugLabel: 'Identifiant',
  slugHelp: 'Aide',
  submit: 'Créer',
  done: 'Organisation créée.',
  working: fr.admin.createWorking,
  requiredLegend: fr.admin.requiredLegend
};
const roleLabels: RoleFormLabels = {
  ...feedback,
  emailLabel: 'Adresse e-mail',
  organizationLabel: 'Organisation',
  organizationPlaceholder: fr.admin.organizationPlaceholder,
  roleLabel: 'Rôle',
  rolePlaceholder: fr.admin.rolePlaceholder,
  languageLabel: 'Langue',
  roles: {
    responsable: 'Responsable',
    consultant: 'Consultant',
    participant: 'Participant'
  },
  languages: { fr: 'Français', ar: 'Arabe', en: 'Anglais' },
  submit: 'Attribuer',
  done: 'Rôle attribué.',
  working: fr.admin.assignWorking,
  requiredLegend: fr.admin.requiredLegend
};
const organizations = [
  { id: '22222222-2222-4222-8222-222222222222', nom: 'Acme' },
  { id: '33333333-3333-4333-8333-333333333333', nom: 'Globex' }
];

const renderOrg = (status?: string): string => {
  states.clear();
  if (status) states.set(createOrganization, { status });
  return renderToStaticMarkup(
    createElement(OrganizationForm, { locale: 'fr', labels: orgLabels })
  );
};
const renderRole = (
  status?: string,
  orgs = organizations,
  locale = 'fr'
): string => {
  states.clear();
  if (status) states.set(assignRole, { status });
  return renderToStaticMarkup(
    createElement(RoleForm, { locale, organizations: orgs, labels: roleLabels })
  );
};
const field = (html: string, name: string): string =>
  new RegExp(`<(?:input|select)[^>]*name="${name}"[^>]*>`).exec(html)?.[0] ??
  '';
const source = readFileSync(
  new URL('../../src/components/admin-forms.tsx', import.meta.url),
  'utf-8'
);

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('OrganizationForm', () => {
  it('légende des champs obligatoires, région vivante vide, champs contrôlés', () => {
    const html = renderOrg();
    expect(html).toContain(fr.admin.requiredLegend);
    expect(html).toMatch(/role="status"[^>]*><\/div>/);
    expect(field(html, 'nom')).toContain('value=""');
    expect(field(html, 'slug')).toContain('value=""');
    expect(html).not.toContain('aria-invalid="true"');
  });

  it('refus : les deux champs marqués et reliés à la région, texte affiché dans la région', () => {
    const html = renderOrg('invalid');
    for (const name of ['nom', 'slug']) {
      expect(field(html, name)).toContain('aria-invalid="true"');
      expect(field(html, name)).toMatch(/aria-describedby="[^"]*-resultat/);
    }
    expect(html).toContain('Champs invalides');
    expect(html).toContain('bg-erreur-doux');
  });

  it('identifiant déjà pris : seul le champ identifiant est marqué', () => {
    const html = renderOrg('exists');
    expect(field(html, 'slug')).toContain('aria-invalid="true"');
    expect(field(html, 'nom')).not.toContain('aria-invalid');
    expect(html).toContain('Identifiant déjà utilisé');
  });

  it('validation « aria » : aria-required, pas d’attribut required natif', () => {
    const html = renderOrg();
    for (const name of ['nom', 'slug']) {
      expect(field(html, name)).toContain('aria-required="true"');
      expect(field(html, name)).not.toMatch(/\srequired(=|\s|>)/);
    }
  });

  it('en cours : texte annoncé, bouton aria-disabled et jamais disabled', () => {
    pendings.add(createOrganization);
    const html = renderOrg();
    expect(html).toContain(fr.admin.createWorking);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it('succès : confirmation au ton neutre', () => {
    const html = renderOrg('created');
    expect(html).toContain('Organisation créée.');
    expect(html).toContain('bg-creux');
  });

  it('soumission manuelle : ni action native ni validation native', () => {
    const html = renderOrg();
    expect(html).toMatch(/<form[^>]*noValidate/);
    expect(html).not.toMatch(/<form[^>]*action=/);
  });
});

describe('RoleForm', () => {
  it('organisation et rôle partent vides (option désactivée), aucun privilège présélectionné', () => {
    const html = renderRole();
    expect(html).toMatch(
      /<option value="" disabled="" selected="">Choisissez une organisation<\/option>/
    );
    expect(html).toMatch(
      /<option value="" disabled="" selected="">Choisissez un rôle<\/option>/
    );
    expect(html).not.toMatch(/<option value="responsable"[^>]*selected/);
  });

  it('la langue de la page est sélectionnée', () => {
    expect(renderRole(undefined, organizations, 'ar')).toMatch(
      /<option value="ar" lang="ar" selected=""/
    );
  });

  it('refus : adresse, organisation et rôle vides sont marqués', () => {
    const html = renderRole('invalid');
    expect(field(html, 'email')).toContain('aria-invalid="true"');
    expect(field(html, 'organisation')).toContain('aria-invalid="true"');
    expect(field(html, 'role')).toContain('aria-invalid="true"');
    expect(html).toContain('Champs invalides');
  });

  it('aucune organisation : bouton aria-disabled (jamais disabled)', () => {
    const button = /<button[^>]*>/.exec(renderRole(undefined, []))?.[0] ?? '';
    expect(button).toContain('aria-disabled="true"');
    expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
  });

  it('en cours et succès', () => {
    pendings.add(assignRole);
    expect(renderRole()).toContain(fr.admin.assignWorking);
    pendings.clear();
    const html = renderRole('assigned');
    expect(html).toContain('Rôle attribué.');
    expect(html).toContain('bg-creux');
  });

  it('soumission manuelle : ni action native ni validation native', () => {
    const html = renderRole();
    expect(html).toMatch(/<form[^>]*noValidate/);
    expect(html).not.toMatch(/<form[^>]*action=/);
  });
});

describe('admin-forms.tsx (fichier corrigé en entier)', () => {
  it('plus de isLoading, de Notice montée pleine, de cast AdminState ni de liste non contrôlée', () => {
    expect(source).not.toContain('isLoading');
    expect(source).not.toContain('StatusNotice');
    expect(source).not.toContain('as AdminState');
    expect(source).not.toContain('defaultValue');
    expect(source).not.toContain('use-keep-select-value');
  });
});
