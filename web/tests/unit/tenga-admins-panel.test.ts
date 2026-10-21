import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

const states = new Map<unknown, unknown>();
const pendings = new Set<unknown>();
const effects: (() => void)[] = [];
vi.mock('react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react')>()),
  useActionState: (action: unknown, initial: unknown) => [
    states.get(action) ?? initial,
    action,
    pendings.has(action)
  ],
  useEffect: (run: () => void) => {
    effects.push(run);
  }
}));
vi.mock('@/actions/admin', () => ({
  addTengaAdmin: vi.fn(),
  assignRole: vi.fn(),
  createOrganization: vi.fn(),
  removeTengaAdmin: vi.fn()
}));
import { removeTengaAdmin } from '@/actions/admin';
import {
  TengaAdminsPanel,
  type TengaAdminRow,
  type TengaAdminsLabels
} from '@/components/tenga-admins-panel';

const ME = '11111111-1111-4111-8111-111111111111';
const OTHER = '22222222-2222-4222-8222-222222222222';

const rows: TengaAdminRow[] = [
  {
    userId: ME,
    address: 'acteur@tenga.test',
    addedAt: '1 octobre 2026',
    isMe: true,
    confirm: 'Je confirme (acteur)',
    ariaLabel: 'Retirer acteur'
  },
  {
    userId: OTHER,
    address: 'nezha@tenga.test',
    addedAt: '21 octobre 2026',
    isMe: false,
    confirm: 'Je confirme le retrait de nezha@tenga.test.',
    ariaLabel: 'Retirer l’accès de nezha@tenga.test'
  }
];
const labels: TengaAdminsLabels = {
  caption: fr.admin.removeCaption,
  colAddress: fr.admin.removeColAddress,
  colAdded: fr.admin.removeColAdded,
  colAction: fr.admin.removeColAction,
  you: fr.admin.removeYou,
  selfHelp: fr.admin.removeSelfHelp,
  submit: fr.admin.removeButton,
  working: fr.admin.removeWorking,
  done: fr.admin.removed,
  invalid: fr.admin.removeInvalid,
  self: fr.admin.removeSelf,
  absent: fr.admin.removeAbsent,
  forbidden: fr.admin.removeForbidden,
  error: fr.admin.removeError
};

const render = (status?: string, given = rows): string => {
  states.clear();
  if (status) states.set(removeTengaAdmin, { status });
  return renderToStaticMarkup(
    createElement(TengaAdminsPanel, {
      locale: 'fr',
      headingId: 'admins-titre',
      rows: given,
      labels
    })
  );
};

beforeEach(() => {
  states.clear();
  pendings.clear();
  effects.length = 0;
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TengaAdminsPanel : liste', () => {
  it('un tableau nommé, avec légende cachée et en-têtes de colonnes', () => {
    const html = render();
    expect(html).toContain(
      `<caption class="sr-only">${labels.caption}</caption>`
    );
    expect(html).toContain('aria-labelledby="admins-titre"');
    for (const header of [
      labels.colAddress,
      labels.colAdded,
      labels.colAction
    ]) {
      expect(html).toContain(header);
    }
    expect(html).toContain('nezha@tenga.test');
    expect(html).toContain('21 octobre 2026');
  });

  it('région vivante persistante, vide au repos', () => {
    expect(render()).toMatch(/role="status"[^>]*><\/div>/);
  });

  it('ma ligne : identifiée « Vous », aucun formulaire de retrait, explication', () => {
    const html = render();
    expect(html).toContain(labels.you);
    expect(html).toContain(labels.selfHelp);
    expect(html.match(/<form/g)).toHaveLength(1);
    expect(html).not.toContain(`value="${ME}"`);
  });

  it('autre ligne : formulaire avec identifiant, case de confirmation obligatoire de 44 px, bouton nommé', () => {
    const html = render();
    expect(html).toContain(`name="userId" value="${OTHER}"`);
    expect(html).toMatch(
      /<input[^>]*type="checkbox"[^>]*name="confirmer"[^>]*value="oui"/
    );
    expect(html).toContain('aria-required="true"');
    expect(html).toContain('min-h-[44px]');
    expect(html).toContain('Je confirme le retrait de nezha@tenga.test.');
    expect(html).toMatch(
      /<button[^>]*aria-label="Retirer l’accès de nezha@tenga.test"/
    );
  });

  it('formulaire soumis à la main, sans validation native ni action native', () => {
    const html = render();
    expect(html).toMatch(/<form[^>]*noValidate/);
    expect(html).not.toMatch(/<form[^>]*action=/);
  });

  it('adresse isolée (bdi ltr) pour l’ordre de lecture', () => {
    expect(render()).toContain('<bdi dir="ltr">nezha@tenga.test</bdi>');
  });
});

describe('TengaAdminsPanel : résultats annoncés dans la région persistante', () => {
  it.each([
    ['removed', labels.done, 'bg-creux'],
    ['invalid', labels.invalid, 'bg-erreur-doux'],
    ['self', labels.self, 'bg-erreur-doux'],
    ['absent', labels.absent, 'bg-erreur-doux'],
    ['forbidden', labels.forbidden, 'bg-erreur-doux'],
    ['error', labels.error, 'bg-erreur-doux']
  ])('%s : texte et ton', (status, text, ton) => {
    const html = render(status);
    expect(html).toContain(text);
    expect(html).toContain(ton);
  });

  it('succès avec une ligne en moins : le message reste dans la région', () => {
    const html = render('removed', [rows[0] as TengaAdminRow]);
    expect(html).toMatch(
      /role="status"[^>]*>.*Accès super administrateur retiré/s
    );
    expect(html).not.toContain('nezha@tenga.test');
  });

  it('en cours : texte annoncé, boutons aria-disabled et jamais disabled', () => {
    pendings.add(removeTengaAdmin);
    const html = render();
    expect(html).toContain(labels.working);
    const button = /<button[^>]*>/.exec(html)?.[0] ?? '';
    expect(button).toContain('aria-disabled="true"');
    expect(button).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});

describe('TengaAdminsPanel : focus après retrait', () => {
  const focus = vi.fn();
  const runEffects = (): void => {
    vi.stubGlobal('document', {
      getElementById: (id: string) => (id === 'admins-titre' ? { focus } : null)
    });
    for (const run of effects) run();
  };
  beforeEach(() => focus.mockClear());

  it('retrait réussi : le focus va au titre de la section (la ligne a disparu)', () => {
    render('removed');
    runEffects();
    expect(focus).toHaveBeenCalledTimes(1);
  });

  it.each(['invalid', 'self', 'absent', 'forbidden', 'error'])(
    '%s : le focus reste où il est',
    (status) => {
      render(status);
      runEffects();
      expect(focus).not.toHaveBeenCalled();
    }
  );

  it('au repos : aucun déplacement de focus', () => {
    render();
    runEffects();
    expect(focus).not.toHaveBeenCalled();
  });
});

describe('TengaAdminsPanel : source', () => {
  it('ni isLoading, ni disabled, ni Notice montée pleine', () => {
    const source = readFileSync(
      new URL('../../src/components/tenga-admins-panel.tsx', import.meta.url),
      'utf-8'
    );
    expect(source).not.toContain('isLoading');
    expect(source).not.toContain('isDisabled');
    expect(source).not.toContain("from '@/components/notice'");
  });
});
