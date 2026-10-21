import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Les états de `useActionState` sont pilotés par action : un rendu serveur ne
// déclenche aucune action, on injecte donc l'état que l'on veut examiner.
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

vi.mock('@/actions/campaigns', () => ({
  createCampaign: vi.fn(),
  openCampaign: vi.fn(),
  closeCampaign: vi.fn()
}));

import {
  closeCampaign,
  createCampaign,
  openCampaign
} from '@/actions/campaigns';
import { CampaignAnnouncer } from '@/components/campaign-announcer';
import {
  CampaignCreateForm,
  CampaignRowActions,
  type CampaignCreateLabels,
  type CampaignRowLabels
} from '@/components/campaign-forms';

const feedback = {
  invalid: 'Demande refusée',
  forbidden: 'Rôle insuffisant',
  conflict: 'Conflit',
  error: 'Échec'
};
const rowLabels: CampaignRowLabels = {
  ...feedback,
  working: 'Opération en cours…',
  open: {
    submit: 'Ouvrir',
    ariaLabel: 'Ouvrir la campagne « Cohorte »',
    done: 'Campagne « Cohorte » ouverte.'
  },
  close: {
    warning: 'Irréversible',
    confirm: 'Je confirme la clôture',
    submit: 'Clôturer',
    ariaLabel: 'Clôturer la campagne « Cohorte »',
    done: 'Campagne « Cohorte » clôturée.'
  }
};
const createLabels: CampaignCreateLabels = {
  ...feedback,
  requiredLegend: 'Les champs marqués (*) sont obligatoires.',
  titleLabel: 'Titre',
  titleHelp: '160 caractères au plus.',
  titleInvalid: 'Titre refusé : corrigez-le.',
  languageLabel: 'Langue',
  languages: { fr: 'Français', ar: 'Arabe', en: 'Anglais' },
  submit: 'Créer',
  working: 'Création en cours…',
  done: 'Campagne créée.'
};

// Balise <input> portant le name demandé (l'ordre des attributs n'importe pas).
const inputNamed = (html: string, name: string): string =>
  new RegExp(`<input[^>]*name="${name}"[^>]*>`).exec(html)?.[0] ?? '';

const row = (statut: 'brouillon' | 'ouverte' | 'close'): string =>
  renderToStaticMarkup(
    createElement(
      CampaignAnnouncer,
      null,
      createElement(CampaignRowActions, {
        locale: 'fr',
        slug: 'acme',
        campaignId: 'c1',
        statut,
        titleId: 'campagne-c1',
        labels: rowLabels
      })
    )
  );
const create = (): string =>
  renderToStaticMarkup(
    createElement(CampaignCreateForm, {
      locale: 'fr',
      slug: 'acme',
      organisationId: 'o1',
      defaultLanguage: 'fr',
      labels: createLabels
    })
  );

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('CampaignRowActions : un composant par ligne', () => {
  it('brouillon : un seul formulaire, « Ouvrir »', () => {
    const html = row('brouillon');
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).toContain('name="campagne" value="c1"');
    expect(html).toContain('aria-label="Ouvrir la campagne « Cohorte »"');
    expect(html).not.toContain('name="confirmer"');
  });

  it('ouverte : un seul formulaire, case de clôture nommée par le titre de la ligne', () => {
    const html = row('ouverte');
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(inputNamed(html, 'confirmer')).toMatch(
      /aria-labelledby="[^"]+ campagne-c1"/
    );
    expect(html).toContain('required');
  });

  it('clôturée : aucun formulaire', () => {
    expect(row('close')).not.toContain('<form');
  });

  it('la case de clôture couvre une cible de 44 px au moins', () => {
    expect(row('ouverte')).toMatch(/<label[^>]*min-h-\[44px\]/);
  });

  it('succès d’ouverture : message visible mais caché des lecteurs d’écran (la région de la page l’annonce)', () => {
    states.set(openCampaign, { status: 'opened' });
    const html = row('ouverte');
    expect(html).toContain('Campagne « Cohorte » ouverte.');
    expect(html).toMatch(/aria-hidden="true"[^>]*><div[^>]*bg-creux/);
    expect(html).not.toContain('role="alert"');
  });

  it('refus de clôture : le message d’erreur de la clôture est affiché', () => {
    states.set(openCampaign, { status: 'opened' });
    states.set(closeCampaign, { status: 'forbidden' });
    const html = row('ouverte');
    expect(html).toContain('Rôle insuffisant');
    expect(html).not.toContain('Campagne « Cohorte » ouverte.');
  });

  it('en cours : le bouton reste actif pour le focus (aria-disabled), état « en cours » affiché', () => {
    pendings.add(openCampaign);
    const html = row('brouillon');
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).toContain('Opération en cours…');
  });
});

describe('CampaignCreateForm', () => {
  it('champs contrôlés : titre avec plafond importé, langue contrôlée', () => {
    const html = create();
    expect(html).toContain('maxLength="160"');
    expect(html).toContain('name="titre"');
    expect(html).toContain('dir="auto"');
    expect(html).toContain(createLabels.requiredLegend);
  });

  it('validation « aria » : aucun setCustomValidity ne bloque le renvoi après un refus', () => {
    // NextUI en mode natif pose setCustomValidity tant que isInvalid vaut vrai ;
    // le champ garde alors aucun `required` natif, seulement aria-required.
    // Preuve réelle (la requête repart) : parcours déployé.
    states.set(createCampaign, { status: 'invalid' });
    const titre = inputNamed(create(), 'titre');
    expect(titre).toContain('aria-invalid="true"');
    expect(titre).toContain('aria-required="true"');
    expect(titre).not.toMatch(/\srequired(=|\s|>)/);
  });

  it('région vivante persistante : le conteneur existe avant tout résultat', () => {
    expect(create()).toMatch(/role="status"/);
  });

  it('titre refusé : aria-invalid, relié au message, texte qui dit quoi faire', () => {
    states.set(createCampaign, { status: 'invalid' });
    const html = create();
    const field = inputNamed(html, 'titre');
    expect(field).toContain('aria-invalid="true"');
    const described = /aria-describedby="([^"]+)"/.exec(field);
    expect(described?.[1]).toBeTruthy();
    const regionId = /<div id="([^"]+)" role="status"/.exec(html)?.[1];
    expect(described?.[1]?.split(' ')).toContain(regionId);
    expect(html).toContain('Titre refusé : corrigez-le.');
  });

  it('au repos : titre non invalide', () => {
    expect(create()).not.toContain('aria-invalid="true"');
  });

  it('liste des langues : une option par langue de la source unique', () => {
    const html = create();
    expect([...html.matchAll(/<option value="(fr|ar|en)"/g)]).toHaveLength(3);
  });

  it('en cours : message « création en cours »', () => {
    pendings.add(createCampaign);
    expect(create()).toContain('Création en cours…');
  });
});

describe('CampaignCreateForm : envoi sans reset natif', () => {
  it('le formulaire n’a pas de prop action (React réinitialiserait les champs) et ne bloque pas l’envoi', () => {
    const form = /<form[^>]*>/.exec(create())?.[0] ?? '';
    expect(form).not.toContain('action=');
    expect(form).toContain('noValidate=""');
  });
});

describe('CampaignRowActions : envoi sans reset natif', () => {
  it.each(['brouillon', 'ouverte'] as const)(
    '%s : le formulaire n’a pas de prop action',
    (statut) => {
      const form = /<form[^>]*>/.exec(row(statut))?.[0] ?? '';
      expect(form).toContain('<form');
      expect(form).not.toContain('action=');
    }
  );
});
