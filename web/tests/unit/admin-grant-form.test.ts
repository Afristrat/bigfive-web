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
import { addTengaAdmin } from '@/actions/admin';
import {
  AdminGrantForm,
  type AdminGrantFormLabels
} from '@/components/admin-forms';

const labels: AdminGrantFormLabels = {
  working: fr.admin.grantWorking,
  requiredLegend: fr.admin.requiredLegend,
  invalidFields: fr.admin.grantInvalid,
  alreadyAdmin: fr.admin.grantExists,
  failed: fr.admin.grantError,
  emailLabel: 'Adresse e-mail',
  confirmLabel: 'Confirmer l’adresse e-mail',
  languageLabel: 'Langue',
  languages: { fr: 'Français', ar: 'Arabe', en: 'Anglais' },
  submit: 'Ajouter',
  done: 'Super administrateur ajouté.'
};

const render = (locale = 'fr'): string =>
  renderToStaticMarkup(createElement(AdminGrantForm, { locale, labels }));
const withState = (status: string): string => {
  states.set(addTengaAdmin, { status });
  return render('fr');
};
const field = (html: string, name: string): string =>
  new RegExp(`<input[^>]*name="${name}"[^>]*>`).exec(html)?.[0] ?? '';
const source = readFileSync(
  new URL('../../src/components/admin-forms.tsx', import.meta.url),
  'utf-8'
);

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('AdminGrantForm', () => {
  it('le collage dans la confirmation n’est plus bloqué (incohérent, inutile)', () => {
    expect(source).not.toContain('onPaste');
  });

  it('légende des champs obligatoires et région vivante vide au repos', () => {
    const html = render();
    expect(html).toContain(fr.admin.requiredLegend);
    expect(html).toMatch(/role="status"[^>]*><\/div>/);
    expect(html).not.toContain('aria-invalid="true"');
  });

  it('langue contrôlée : celle de la page est sélectionnée', () => {
    expect(render('en')).toMatch(/<option value="en" lang="en" selected=""/);
  });

  it('saisie refusée : les deux adresses sont marquées, texte qui dit quoi faire', () => {
    const html = withState('invalid');
    for (const name of ['email', 'confirmation']) {
      expect(field(html, name)).toContain('aria-invalid="true"');
    }
    expect(html).toContain(fr.admin.grantInvalid);
    expect(html).toContain('bg-erreur-doux');
  });

  it('validation « aria » : aucun setCustomValidity ne bloque le renvoi après un refus', () => {
    const html = withState('invalid');
    for (const name of ['email', 'confirmation']) {
      expect(field(html, name)).toContain('aria-required="true"');
      expect(field(html, name)).not.toMatch(/\srequired(=|\s|>)/);
    }
  });

  it('adresse déjà super administrateur : seul le champ adresse est marqué', () => {
    const html = withState('exists');
    expect(field(html, 'email')).toContain('aria-invalid="true"');
    expect(field(html, 'confirmation')).not.toContain('aria-invalid');
    expect(html).toContain(fr.admin.grantExists);
  });

  it('échec ou plafond : texte propre à l’ajout, aucun champ marqué', () => {
    const html = withState('error');
    expect(html).toContain(fr.admin.grantError);
    expect(html).not.toContain('aria-invalid="true"');
  });

  it('les cinq textes propres à l’ajout sont obligatoires : plus de retombée générique', () => {
    expect(source).not.toContain('ponytail');
    expect(source).not.toMatch(/labels\.\w+ \?\? labels\./);
    expect(source).not.toContain('as AdminState');
  });

  it('champs contrôlés soumis à la main : ni action native, ni validation native', () => {
    const html = render();
    expect(html).toMatch(/<form[^>]*noValidate/);
    expect(html).not.toMatch(/<form[^>]*action=/);
  });

  it('succès : confirmation affichée avec le ton neutre', () => {
    const html = withState('granted');
    expect(html).toContain(labels.done);
    expect(html).toContain('bg-creux');
  });

  it('en cours : état annoncé, bouton aria-disabled', () => {
    pendings.add(addTengaAdmin);
    const html = render();
    expect(html).toContain(fr.admin.grantWorking);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});
