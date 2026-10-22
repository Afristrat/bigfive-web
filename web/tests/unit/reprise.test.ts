import { describe, expect, it } from 'vitest';
import passationAr from '@/messages/espace/passation.ar.js';
import passationEn from '@/messages/espace/passation.en.js';
import passationFr from '@/messages/espace/passation.fr.js';
import { fusionnerReprise } from '@/lib/reprise';

describe('fusionnerReprise : le serveur prime, le local complète', () => {
  it('ajoute les réponses locales absentes du serveur', () => {
    expect(fusionnerReprise({ Q1: 3 }, { Q2: 4, Q3: 1 })).toEqual({
      Q1: 3,
      Q2: 4,
      Q3: 1
    });
  });

  it('sur une question commune, la valeur du serveur est gardée', () => {
    expect(fusionnerReprise({ Q1: 3, Q2: 5 }, { Q1: 1, Q3: 2 })).toEqual({
      Q1: 3,
      Q2: 5,
      Q3: 2
    });
  });

  it('serveur vide : le local est repris tel quel', () => {
    expect(fusionnerReprise({}, { Q1: 2 })).toEqual({ Q1: 2 });
  });

  it('local vide : le serveur est repris tel quel', () => {
    expect(fusionnerReprise({ Q1: 2 }, {})).toEqual({ Q1: 2 });
  });

  it('deux côtés vides : rien', () => {
    expect(fusionnerReprise({}, {})).toEqual({});
  });

  it('ne modifie aucune des deux entrées et rend un nouvel objet', () => {
    const serveur = { Q1: 3 };
    const local = { Q1: 1, Q2: 2 };
    const fusion = fusionnerReprise(serveur, local);
    expect(serveur).toEqual({ Q1: 3 });
    expect(local).toEqual({ Q1: 1, Q2: 2 });
    expect(fusion).not.toBe(serveur);
    expect(fusion).not.toBe(local);
  });

  it('une valeur de serveur à 0 ou absente n’est pas confondue : seule la présence compte', () => {
    expect(fusionnerReprise({ Q1: 0 }, { Q1: 4 })).toEqual({ Q1: 0 });
  });

  it('ne se laisse pas piéger par une clé de prototype', () => {
    const local = JSON.parse('{"__proto__": 5, "Q1": 2}') as Record<
      string,
      number
    >;
    const fusion = fusionnerReprise({}, local);
    expect(Object.getPrototypeOf(fusion)).toBe(Object.prototype);
    expect(fusion.Q1).toBe(2);
  });
});

describe('message de campagne close', () => {
  it.each([
    ['fr', passationFr.errors.closed, /appareil/],
    ['en', passationEn.errors.closed, /device/],
    ['ar', passationAr.errors.closed, /الجهاز/]
  ])(
    '%s : ne promet pas de reprise locale (la campagne est close, rien ne se reprend)',
    (_langue, texte, motif) => {
      expect(texte).not.toMatch(motif);
      expect(texte.length).toBeGreaterThan(20);
    }
  );
});
