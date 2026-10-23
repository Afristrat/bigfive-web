import { describe, expect, it } from 'vitest';
import {
  LIENS,
  brouillonDepuis,
  cleReponse,
  etapeReseau,
  manquantes,
  peutRetirer,
  reponsesDepuis,
  valeursDuLien,
  valeurValide,
  type EtatMoi,
  type ReleveReseau
} from '@/lib/reseau-releve';

// Règles pures de l'écran du relevé : étape montrée, brouillon des réponses,
// complétude. Aucune base, aucun composant.

const M1 = '11111111-aaaa-4aaa-8aaa-000000000001';
const M2 = '11111111-aaaa-4aaa-8aaa-000000000002';
const INCONNU = '11111111-aaaa-4aaa-8aaa-0000000000ff';

const moi = (surcharge: Partial<EtatMoi> = {}): EtatMoi => ({
  informeLe: '2026-10-23T09:00:00Z',
  opposeLe: null,
  accordRepondreLe: null,
  accordCarteLe: null,
  ...surcharge
});

const releve = (surcharge: Partial<ReleveReseau> = {}): ReleveReseau => ({
  ferme: false,
  nbReponses: 0,
  campagneOuverte: true,
  moi: null,
  membres: [
    { participationId: M1, nom: 'Karim B.' },
    { participationId: M2, nom: null }
  ],
  reponses: [],
  ...surcharge
});

describe('étape montrée', () => {
  it('pas encore informé : information', () => {
    expect(etapeReseau(null)).toBe('information');
  });
  it('informé sans accord : consentement', () => {
    expect(etapeReseau(moi())).toBe('consentement');
  });
  it('accord pour la carte seulement : toujours le consentement', () => {
    expect(etapeReseau(moi({ accordCarteLe: '2026-10-23T09:05:00Z' }))).toBe(
      'consentement'
    );
  });
  it('accord de répondre : relevé', () => {
    expect(etapeReseau(moi({ accordRepondreLe: '2026-10-23T09:05:00Z' }))).toBe(
      'releve'
    );
  });
  it('opposé : opposition, quels que soient les autres champs', () => {
    expect(etapeReseau(moi({ opposeLe: '2026-10-23T09:05:00Z' }))).toBe(
      'oppose'
    );
  });
});

describe('valeurs de chaque lien', () => {
  it('quatre liens, dans l’ordre du cadrage', () => {
    expect(LIENS).toEqual([
      'conseil',
      'information',
      'confiance',
      'dependance'
    ]);
  });
  it('fréquence : de jamais (0) à chaque jour (4)', () => {
    for (const lien of ['conseil', 'information', 'dependance'] as const) {
      expect(valeursDuLien(lien)).toEqual([0, 1, 2, 3, 4]);
    }
  });
  it('confiance : oui (3), plutôt oui, plutôt non, non (0), dans cet ordre', () => {
    expect(valeursDuLien('confiance')).toEqual([3, 2, 1, 0]);
  });
  it('valeur valide selon le lien', () => {
    expect(valeurValide('conseil', 4)).toBe(true);
    expect(valeurValide('confiance', 4)).toBe(false);
    expect(valeurValide('confiance', 3)).toBe(true);
    expect(valeurValide('information', -1)).toBe(false);
    expect(valeurValide('dependance', 1.5)).toBe(false);
  });
});

describe('brouillon des réponses', () => {
  it('reprend les réponses enregistrées des membres encore listés seulement', () => {
    const brouillon = brouillonDepuis(
      releve({
        reponses: [
          { cite: M1, lien: 'conseil', valeur: 3 },
          { cite: INCONNU, lien: 'conseil', valeur: 4 }
        ]
      })
    );
    expect(brouillon).toEqual({ [cleReponse(M1, 'conseil')]: 3 });
  });

  it('compte les réponses manquantes : quatre par membre', () => {
    const r = releve();
    expect(manquantes(r.membres, {})).toBe(8);
    expect(
      manquantes(r.membres, {
        [cleReponse(M1, 'conseil')]: 0,
        [cleReponse(M1, 'confiance')]: 2
      })
    ).toBe(6);
  });

  it('rend les réponses dans l’ordre des membres puis des liens', () => {
    const r = releve();
    const brouillon = {
      [cleReponse(M2, 'dependance')]: 1,
      [cleReponse(M1, 'confiance')]: 0,
      [cleReponse(M1, 'conseil')]: 4
    };
    expect(reponsesDepuis(r.membres, brouillon)).toEqual([
      { cite: M1, lien: 'conseil', valeur: 4 },
      { cite: M1, lien: 'confiance', valeur: 0 },
      { cite: M2, lien: 'dependance', valeur: 1 }
    ]);
  });

  it('une clé d’un membre sorti de la liste n’est jamais envoyée', () => {
    expect(
      reponsesDepuis(releve().membres, { [cleReponse(INCONNU, 'conseil')]: 2 })
    ).toEqual([]);
  });
});

describe('retrait possible', () => {
  it('rien à retirer : non', () => {
    expect(peutRetirer(releve({ moi: moi() }))).toBe(false);
    expect(peutRetirer(releve())).toBe(false);
  });
  it('des réponses, un accord de répondre ou de carte : oui', () => {
    expect(
      peutRetirer(
        releve({
          moi: moi(),
          reponses: [{ cite: M1, lien: 'conseil', valeur: 1 }]
        })
      )
    ).toBe(true);
    expect(
      peutRetirer(releve({ moi: moi({ accordRepondreLe: '2026-10-23' }) }))
    ).toBe(true);
    expect(
      peutRetirer(releve({ moi: moi({ accordCarteLe: '2026-10-23' }) }))
    ).toBe(true);
  });
});
