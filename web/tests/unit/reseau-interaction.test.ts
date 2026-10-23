import { describe, expect, it } from 'vitest';
import {
  INTERACTION_INITIALE,
  cleAccords,
  doitConfirmerRefus,
  messageReseau,
  reduireInteraction,
  type EtatInteraction
} from '@/lib/reseau-interaction';
import type { EtatMoi } from '@/lib/reseau-releve';

// Logique d'interaction de l'écran du relevé, sans DOM : panneau ouvert, cible
// du focus après chaque geste, clé de remontage du formulaire d'accords,
// confirmation du refus de répondre, message de la région vivante. Le composant
// applique ces décisions telles quelles (contrat de source plus bas).

const moi = (surcharge: Partial<EtatMoi> = {}): EtatMoi => ({
  informeLe: '2026-10-23T09:00:00Z',
  opposeLe: null,
  accordRepondreLe: null,
  accordCarteLe: null,
  ...surcharge
});

const apres = (
  ...evenements: Parameters<typeof reduireInteraction>[1][]
): EtatInteraction =>
  evenements.reduce(reduireInteraction, INTERACTION_INITIALE);

describe('clé du formulaire d’accords (case de carte restée cochée après retrait)', () => {
  it('change dès que l’une des deux dates d’accord change', () => {
    const avant = cleAccords(
      moi({ accordRepondreLe: 'a', accordCarteLe: 'b' })
    );
    // Après un retrait, les deux accords sont effacés : la clé change, le
    // formulaire est remonté et la case de carte repart de l’état enregistré.
    expect(cleAccords(moi())).not.toBe(avant);
    expect(cleAccords(moi({ accordRepondreLe: 'a' }))).not.toBe(avant);
    expect(cleAccords(moi({ accordCarteLe: 'b' }))).not.toBe(avant);
  });
  it('stable tant que rien ne change ; définie sans ligne', () => {
    expect(cleAccords(moi({ accordCarteLe: 'b' }))).toBe(
      cleAccords(moi({ accordCarteLe: 'b' }))
    );
    expect(cleAccords(null)).toBe(cleAccords(moi()));
  });
});

describe('refus de répondre après un accord', () => {
  it('décocher « J’accepte de répondre » quand il était accordé : confirmation', () => {
    expect(doitConfirmerRefus(true, false)).toBe(true);
  });
  it('aucune confirmation sinon', () => {
    expect(doitConfirmerRefus(true, true)).toBe(false);
    expect(doitConfirmerRefus(false, false)).toBe(false);
    expect(doitConfirmerRefus(false, true)).toBe(false);
  });
});

describe('panneaux et focus', () => {
  it('ouvrir une confirmation : le focus va au bouton de confirmation', () => {
    expect(apres({ type: 'ouvrir', panneau: 'retrait' })).toEqual({
      panneau: 'retrait',
      focus: { cible: 'confirmation', panneau: 'retrait' }
    });
  });

  it('annuler : panneau fermé, focus rendu au déclencheur', () => {
    expect(
      apres({ type: 'ouvrir', panneau: 'opposition' }, { type: 'fermer' })
    ).toEqual({
      panneau: null,
      focus: { cible: 'declencheur', panneau: 'opposition' }
    });
  });

  it('rouvrir le même panneau par son déclencheur le referme', () => {
    expect(
      apres(
        { type: 'ouvrir', panneau: 'accords' },
        { type: 'ouvrir', panneau: 'accords' }
      )
    ).toEqual({
      panneau: null,
      focus: { cible: 'declencheur', panneau: 'accords' }
    });
  });

  it('modifier les accords : le focus va au premier champ du formulaire', () => {
    expect(apres({ type: 'ouvrir', panneau: 'accords' }).focus).toEqual({
      cible: 'premierChamp',
      panneau: 'accords'
    });
  });

  it('un seul panneau à la fois', () => {
    expect(
      apres(
        { type: 'ouvrir', panneau: 'retrait' },
        { type: 'ouvrir', panneau: 'opposition' }
      ).panneau
    ).toBe('opposition');
  });

  it('confirmation du refus, imbriquée dans la modification des accords', () => {
    const ouverte = apres(
      { type: 'ouvrir', panneau: 'accords' },
      { type: 'ouvrir', panneau: 'refus' }
    );
    expect(ouverte.panneau).toBe('refus');
    // Annuler revient au formulaire d’accords, focus sur la case « répondre ».
    expect(reduireInteraction(ouverte, { type: 'fermer' })).toEqual({
      panneau: 'accords',
      focus: { cible: 'declencheur', panneau: 'refus' }
    });
  });

  it('« répondre » recoché pendant la confirmation du refus : la confirmation se referme', () => {
    const refus = apres(
      { type: 'ouvrir', panneau: 'accords' },
      { type: 'ouvrir', panneau: 'refus' },
      { type: 'focusApplique' }
    );
    // Le focus reste sur la case que la personne vient de cocher.
    expect(reduireInteraction(refus, { type: 'repondreRecoche' })).toEqual({
      panneau: 'accords',
      focus: null
    });
  });

  it('« répondre » recoché hors confirmation : rien ne change', () => {
    const accords = apres({ type: 'ouvrir', panneau: 'accords' });
    expect(reduireInteraction(accords, { type: 'repondreRecoche' })).toBe(
      accords
    );
  });

  it('succès : tout se ferme, le focus va au titre de l’étape', () => {
    expect(
      apres({ type: 'ouvrir', panneau: 'retrait' }, { type: 'succes' })
    ).toEqual({ panneau: null, focus: { cible: 'titre' } });
  });

  it('focus appliqué : la cible est consommée, le panneau reste', () => {
    expect(
      apres({ type: 'ouvrir', panneau: 'retrait' }, { type: 'focusApplique' })
    ).toEqual({ panneau: 'retrait', focus: null });
  });

  it('fermer sans panneau ouvert : rien ne change', () => {
    expect(apres({ type: 'fermer' })).toEqual(INTERACTION_INITIALE);
  });
});

describe('message de la région vivante', () => {
  const libelles = {
    working: 'ENVOI',
    manque: 'MANQUE {nombre}',
    messages: {
      informe: 'INFORME',
      informeSansReponse: 'INFORME-FERME',
      oppose: 'OPPOSE',
      enregistre: 'ENREGISTRE',
      repondu: 'REPONDU',
      retire: 'RETIRE',
      closed: 'CHANGE',
      forbidden: 'INTERDIT',
      notfound: 'INTROUVABLE',
      invalid: 'LISTE',
      failed: 'ECHEC',
      reconnexion: 'SESSION',
      apercu: 'APERCU'
    }
  };
  const base = {
    pending: false,
    incomplet: false,
    restantes: 0,
    statut: null,
    campagneOuverte: true,
    locale: 'fr'
  } as const;

  it('rien à dire : aucun message', () => {
    expect(messageReseau(base, libelles)).toBeNull();
  });

  it('pendant l’envoi : message d’attente', () => {
    expect(
      messageReseau({ ...base, pending: true, statut: 'failed' }, libelles)
    ).toEqual({ texte: 'ENVOI', ton: 'info', reconnexion: false });
  });

  it('réponses manquantes : nombre recalculé à chaque rendu, disparaît à zéro', () => {
    const incomplet = { ...base, incomplet: true };
    expect(messageReseau({ ...incomplet, restantes: 5 }, libelles)?.texte).toBe(
      'MANQUE 5'
    );
    expect(messageReseau({ ...incomplet, restantes: 2 }, libelles)?.texte).toBe(
      'MANQUE 2'
    );
    expect(messageReseau({ ...incomplet, restantes: 0 }, libelles)).toBeNull();
    expect(messageReseau({ ...incomplet, restantes: 2 }, libelles)?.ton).toBe(
      'erreur'
    );
  });

  it('« informe » dépend de l’ouverture de la campagne', () => {
    expect(messageReseau({ ...base, statut: 'informe' }, libelles)?.texte).toBe(
      'INFORME'
    );
    expect(
      messageReseau(
        { ...base, statut: 'informe', campagneOuverte: false },
        libelles
      )?.texte
    ).toBe('INFORME-FERME');
  });

  it('session expirée : message de reconnexion, avec lien', () => {
    expect(messageReseau({ ...base, statut: 'reconnexion' }, libelles)).toEqual(
      { texte: 'SESSION', ton: 'erreur', reconnexion: true }
    );
  });

  it('tons : succès et aperçu en information, refus en erreur', () => {
    for (const s of ['repondu', 'retire', 'apercu'] as const) {
      expect(messageReseau({ ...base, statut: s }, libelles)?.ton).toBe('info');
    }
    for (const s of ['closed', 'invalid', 'failed', 'forbidden'] as const) {
      expect(messageReseau({ ...base, statut: s }, libelles)?.ton).toBe(
        'erreur'
      );
    }
  });
});
