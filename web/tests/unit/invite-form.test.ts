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
vi.mock('@/actions/invitations', () => ({ inviteParticipants: vi.fn() }));

import { inviteParticipants } from '@/actions/invitations';
import type { InviteState } from '@/actions/invitations';
import {
  InviteForm,
  batchSummary,
  counterNotice,
  remainingAddresses,
  type InviteFormLabels
} from '@/components/invite-form';
import {
  INVITATION_MESSAGE_MAX,
  INVITE_LIST_MAX_CHARS
} from '@/lib/access-rules';

const labels: InviteFormLabels = {
  requiredLegend: 'Les champs (*) sont obligatoires.',
  addressesLabel: 'Personnes à inviter',
  addressesHelp: 'Une adresse par ligne, 25 au plus.',
  languageLabel: 'Langue',
  languages: { fr: 'Français', ar: 'Arabe', en: 'Anglais' },
  messageLabel: 'Message',
  messageHelp: 'Aide message',
  counter: '{count} / {max}',
  counterLow: 'Moins de {remaining} caractères restants.',
  counterFull: 'Limite de caractères atteinte.',
  submit: 'Envoyer',
  sending: 'Envoi en cours…',
  summary: 'Invitations envoyées : {sent} sur {total}.',
  doneNone: 'Aucune invitation n’est partie.',
  summaryFailed: 'Adresses sans invitation : {failed}.',
  summaryUnprocessed: 'Adresses non traitées : {unprocessed}.',
  abortedError: 'Lot interrompu sur une erreur.',
  abortedForbidden: 'Lot interrompu : droit retiré.',
  abortedClosed: 'Lot interrompu : campagne clôturée.',
  failuresTitle: 'Ces adresses restent dans la liste :',
  outcome: {
    mail_failed: 'E-mail non parti.',
    skipped_recent: 'Invitée à l’instant.',
    refused: 'Adresse refusée.',
    rate_limited: 'Limite atteinte.'
  },
  invalid: {
    empty: 'Saisissez une adresse.',
    too_many: 'Trop d’adresses.',
    address: 'Lignes invalides :',
    message: 'Message refusé.'
  },
  forbidden: 'Interdit.',
  closed: 'Campagne fermée.',
  rateLimited: 'Plafond atteint.',
  error: 'Échec.'
};

type Done = Extract<InviteState, { status: 'done' }>;

const render = (language: 'fr' | 'ar' | 'en' = 'fr'): string =>
  renderToStaticMarkup(
    createElement(InviteForm, {
      locale: 'fr',
      slug: 'acme',
      campaignId: 'c1',
      defaultLanguage: language,
      labels
    })
  );
const withState = (state: InviteState): string => {
  states.set(inviteParticipants, state);
  return render();
};
const tagNamed = (html: string, tag: string, name: string): string =>
  new RegExp(`<${tag}[^>]*name="${name}"[^>]*>`).exec(html)?.[0] ?? '';
/** Région vivante du résultat : de son ouverture à la fermeture de sa boîte. */
const region = (html: string): string => {
  const start = html.search(/<div id="[^"]*-resultat" role="status"/);
  if (start === -1) return '';
  const rest = html.slice(start);
  // Le conteneur est suivi, au plus, d'une seule boîte : on s'arrête au bouton ou au détail.
  const end = rest.search(/<div tabindex="-1"|<div><button/);
  return end === -1 ? rest : rest.slice(0, end);
};

beforeEach(() => {
  states.clear();
  pendings.clear();
});

describe('InviteForm : plafonds et champs', () => {
  it('plafonds importés de access-rules', () => {
    const html = render();
    expect(tagNamed(html, 'textarea', 'adresses')).toContain(
      `maxLength="${INVITE_LIST_MAX_CHARS}"`
    );
    expect(tagNamed(html, 'textarea', 'message')).toContain(
      `maxLength="${INVITATION_MESSAGE_MAX}"`
    );
  });

  it('langue contrôlée : la langue de la campagne est sélectionnée', () => {
    expect(render('ar')).toMatch(/<option value="ar" lang="ar" selected=""/);
  });

  it('légende des champs obligatoires et astérisque visible mais muet', () => {
    const html = render();
    expect(html).toContain(labels.requiredLegend);
    expect(html).toContain('aria-hidden="true"> *</span>');
  });

  it('région vivante persistante : présente et vide avant tout envoi', () => {
    const zone = region(render());
    expect(zone).toContain('role="status"');
    expect(zone).not.toContain('<p>');
  });

  it('au repos : aucun champ marqué invalide', () => {
    expect(render()).not.toContain('aria-invalid="true"');
  });

  it('champs libres : dir auto sur le message, ltr sur les adresses', () => {
    const html = render();
    expect(tagNamed(html, 'textarea', 'message')).toContain('dir="auto"');
    expect(tagNamed(html, 'textarea', 'adresses')).toContain('dir="ltr"');
  });
});

describe('InviteForm : résultat d’un lot', () => {
  const done = (over: Partial<Done>): Done => ({
    status: 'done',
    sent: 3,
    total: 3,
    failures: [],
    aborted: null,
    ...over
  });

  it('lot complet : récapitulatif chiffré, ton neutre, pas de détail', () => {
    const html = withState(done({}));
    expect(region(html)).toContain('Invitations envoyées : 3 sur 3.');
    expect(region(html)).toContain('bg-creux');
    expect(html).not.toContain(labels.failuresTitle);
  });

  it('lot partiel : récapitulatif dans la région, détail HORS région, focalisable', () => {
    const html = withState(
      done({
        sent: 1,
        total: 3,
        failures: [
          { email: 'a@exemple.ma', outcome: 'mail_failed' },
          { email: 'b@exemple.ma', outcome: 'refused' }
        ]
      })
    );
    const zone = region(html);
    expect(zone).toContain('Invitations envoyées : 1 sur 3.');
    expect(zone).toContain('Adresses sans invitation : 2.');
    expect(zone).toContain('bg-avis-doux');
    expect(zone).not.toContain('a@exemple.ma');
    const detail = /<div tabindex="-1".*?<\/ul><\/div>/s.exec(html);
    expect(detail?.[0]).toContain(labels.failuresTitle);
    expect(detail?.[0]).toContain('a@exemple.ma');
    expect(detail?.[0]).toContain('E-mail non parti.');
    expect(detail?.[0]).toContain('b@exemple.ma');
    expect(detail?.[0]).not.toContain('role="status"');
  });

  it('aucune invitation partie : ton d’erreur', () => {
    const html = withState(
      done({
        sent: 0,
        total: 1,
        failures: [{ email: 'a@exemple.ma', outcome: 'rate_limited' }]
      })
    );
    expect(region(html)).toContain(labels.doneNone);
    expect(region(html)).toContain('bg-erreur-doux');
  });

  it('lot interrompu : cause et nombre d’adresses non traitées', () => {
    const html = withState(
      done({ sent: 2, total: 10, failures: [], aborted: 'closed' })
    );
    const zone = region(html);
    expect(zone).toContain('Invitations envoyées : 2 sur 10.');
    expect(zone).toContain(labels.abortedClosed);
    expect(zone).toContain('Adresses non traitées : 8.');
    expect(zone).toContain('bg-avis-doux');
  });

  it('chaque cause d’interruption a son texte', () => {
    for (const [aborted, text] of [
      ['error', labels.abortedError],
      ['forbidden', labels.abortedForbidden],
      ['closed', labels.abortedClosed]
    ] as const) {
      expect(region(withState(done({ sent: 1, total: 2, aborted })))).toContain(
        text
      );
    }
  });
});

describe('InviteForm : refus', () => {
  it('lignes invalides : champ marqué, relié au message, lignes listées sans doublon de clé', () => {
    const errors = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const html = withState({
      status: 'invalid',
      reason: 'address',
      rejected: ['abc', 'abc', 'def']
    });
    const field = tagNamed(html, 'textarea', 'adresses');
    expect(field).toContain('aria-invalid="true"');
    const regionId = /<div id="([^"]*-resultat)" role="status"/.exec(html)?.[1];
    expect(regionId).toBeTruthy();
    expect(/aria-describedby="([^"]+)"/.exec(field)?.[1]?.split(' ')).toContain(
      regionId
    );
    expect(region(html)).toContain('Lignes invalides :');
    expect(html.match(/<bdi[^>]*>abc<\/bdi>/g)).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  it('message refusé : seul le champ message est marqué', () => {
    const html = withState({
      status: 'invalid',
      reason: 'message',
      rejected: []
    });
    expect(tagNamed(html, 'textarea', 'message')).toContain(
      'aria-invalid="true"'
    );
    expect(tagNamed(html, 'textarea', 'adresses')).not.toContain(
      'aria-invalid'
    );
  });

  it('refus plats : un texte par statut dans la région', () => {
    for (const [status, text] of [
      ['forbidden', labels.forbidden],
      ['closed', labels.closed],
      ['rate_limited', labels.rateLimited],
      ['error', labels.error]
    ] as const) {
      const html = withState({ status });
      expect(region(html)).toContain(text);
      expect(html).not.toContain('aria-invalid="true"');
    }
  });

  it('en cours : état annoncé, bouton aria-disabled et non disabled', () => {
    pendings.add(inviteParticipants);
    const html = render();
    expect(region(html)).toContain(labels.sending);
    expect(html).toContain('aria-disabled="true"');
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
  });
});

describe('remainingAddresses : après un lot partiel, seulement les adresses à renvoyer', () => {
  const text = 'a@x.ma, Anne\nb@x.ma\nc@x.ma\r\nd@x.ma';
  const done = (over: Partial<Done>): Done => ({
    status: 'done',
    sent: 0,
    total: 4,
    failures: [],
    aborted: null,
    ...over
  });

  it('garde les lignes en échec, prénom compris, pas celles envoyées', () => {
    expect(
      remainingAddresses(
        text,
        done({
          sent: 3,
          failures: [{ email: 'A@x.ma', outcome: 'mail_failed' }]
        })
      )
    ).toBe('a@x.ma, Anne');
  });

  it('lot complet : liste vide', () => {
    expect(remainingAddresses(text, done({ sent: 4 }))).toBe('');
  });

  it('lot interrompu : garde aussi la fin non traitée', () => {
    expect(
      remainingAddresses(
        text,
        done({
          sent: 1,
          aborted: 'error',
          failures: [{ email: 'b@x.ma', outcome: 'refused' }]
        })
      )
    ).toBe('b@x.ma\nc@x.ma\nd@x.ma');
  });

  it('doublons : comptés une fois, comme le serveur', () => {
    expect(
      remainingAddresses(
        'a@x.ma\nA@x.ma\nb@x.ma',
        done({
          sent: 1,
          total: 2,
          failures: [{ email: 'b@x.ma', outcome: 'refused' }]
        })
      )
    ).toBe('b@x.ma');
  });

  it('plus de non traitées que de lignes : pas de débordement', () => {
    expect(
      remainingAddresses(
        'a@x.ma',
        done({ sent: 0, total: 9, aborted: 'error' })
      )
    ).toBe('a@x.ma');
  });
});

describe('counterNotice : seuils d’annonce du compteur', () => {
  it('rien tant qu’il reste 50 caractères ou plus', () => {
    expect(counterNotice(1000)).toBeNull();
    expect(counterNotice(100)).toBeNull();
    expect(counterNotice(50)).toBeNull();
  });

  it('moins de 50 à 49 puis jusqu’à 10 restants', () => {
    expect(counterNotice(49)).toEqual({ kind: 'low', threshold: 50 });
    expect(counterNotice(30)).toEqual({ kind: 'low', threshold: 50 });
    expect(counterNotice(10)).toEqual({ kind: 'low', threshold: 50 });
  });

  it('moins de 10 à 9 restants (le texte change au second seuil)', () => {
    expect(counterNotice(9)).toEqual({ kind: 'low', threshold: 10 });
    expect(counterNotice(5)).toEqual({ kind: 'low', threshold: 10 });
    expect(counterNotice(1)).toEqual({ kind: 'low', threshold: 10 });
  });

  it('limite atteinte à 0 (ou moins)', () => {
    expect(counterNotice(0)).toEqual({ kind: 'full' });
    expect(counterNotice(-2)).toEqual({ kind: 'full' });
  });
});

describe('batchSummary : choix du message d’un lot', () => {
  const base: Done = {
    status: 'done',
    sent: 2,
    total: 2,
    failures: [],
    aborted: null
  };
  it('ton selon le résultat', () => {
    expect(batchSummary(base, labels).ton).toBe('info');
    expect(
      batchSummary(
        { ...base, failures: [{ email: 'a@x.ma', outcome: 'refused' }] },
        labels
      ).ton
    ).toBe('avis');
    expect(batchSummary({ ...base, sent: 0 }, labels).ton).toBe('erreur');
  });
});

describe('InviteForm : conteneur de détail nommé', () => {
  it('groupe nommé par le titre des échecs', () => {
    states.set(inviteParticipants, {
      status: 'done',
      sent: 0,
      total: 1,
      failures: [{ email: 'a@x.ma', outcome: 'refused' }],
      aborted: null
    });
    const html = render();
    const detail = /<div tabindex="-1"[^>]*>/.exec(html)?.[0] ?? '';
    expect(detail).toContain('role="group"');
    const labelled = /aria-labelledby="([^"]+)"/.exec(detail)?.[1];
    expect(html).toContain(`id="${labelled}"`);
  });

  it('lignes refusées : groupe avec étiquette', () => {
    states.set(inviteParticipants, {
      status: 'invalid',
      reason: 'address',
      rejected: ['zzz']
    });
    const detail = /<div tabindex="-1"[^>]*>/.exec(render())?.[0] ?? '';
    expect(detail).toContain('role="group"');
    expect(detail).toContain('aria-labelledby');
  });
});

describe('InviteForm : envoi sans reset natif', () => {
  it('le formulaire n’a pas de prop action (React réinitialiserait les champs)', () => {
    const form = /<form[^>]*>/.exec(render())?.[0] ?? '';
    expect(form).not.toContain('action=');
  });
});
