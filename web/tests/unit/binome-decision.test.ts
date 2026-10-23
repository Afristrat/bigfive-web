import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';
import { apresReponse, lireDecision } from '@/lib/binome-decision';

// Après une réponse à une proposition de binôme : où va la personne. Un retrait
// ou un refus ferme le rapport ; rafraîchir la page du rapport donnerait un 404
// (défaut vu en production). La personne revient à la liste, qui confirme.

describe('apresReponse', () => {
  it('retrait réussi : retour à la liste, confirmation du retrait', () => {
    expect(apresReponse('retirer', 'retire')).toEqual({
      aller: '/mes-resultats/binomes?decision=retrait'
    });
  });

  it('refus réussi : retour à la liste, confirmation du refus', () => {
    expect(apresReponse('refuser', 'retire')).toEqual({
      aller: '/mes-resultats/binomes?decision=refus'
    });
  });

  it('proposition déjà close ou introuvable : retour à la liste, sans confirmation', () => {
    for (const statut of ['closed', 'notfound'] as const) {
      expect(apresReponse('retirer', statut)).toEqual({
        aller: '/mes-resultats/binomes'
      });
    }
  });

  it('accord donné : la page se rafraîchit sur place', () => {
    expect(apresReponse('accepter', 'en_attente')).toBe('rafraichir');
    expect(apresReponse('accepter', 'actif')).toBe('rafraichir');
  });

  it('refus du serveur ou panne : rien ne bouge, le message d’erreur suffit', () => {
    for (const statut of ['forbidden', 'invalid', 'failed'] as const) {
      expect(apresReponse('retirer', statut)).toBeNull();
    }
  });
});

describe('lireDecision', () => {
  it('ne connaît que « retrait » et « refus »', () => {
    expect(lireDecision('retrait')).toBe('retrait');
    expect(lireDecision('refus')).toBe('refus');
    for (const autre of [undefined, '', 'actif', ['retrait'], '<script>']) {
      expect(lireDecision(autre)).toBeNull();
    }
  });
});

describe('messages de confirmation', () => {
  it('existent en fr, en et ar, non vides', () => {
    for (const catalogue of [fr, en, ar]) {
      expect(catalogue.binome.confirmation.retrait).toMatch(/\S/);
      expect(catalogue.binome.confirmation.refus).toMatch(/\S/);
    }
  });
});
