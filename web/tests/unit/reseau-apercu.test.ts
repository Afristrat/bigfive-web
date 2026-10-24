import { describe, expect, it } from 'vitest';
import { VUES_APERCU } from '@/lib/apercu-resultats';
import {
  ETAPES_APERCU_RESEAU,
  actionsApercuReseau,
  lienApercuReseau,
  lireReglagesReseau,
  releveApercu
} from '@/lib/apercu-reseau';
import { LIENS, valeurValide } from '@/lib/reseau-releve';

// Vue « reseau » de l'aperçu : réglages d'URL et relevé fictif (AM, KB, SR, HT),
// sans base. Les actions de l'aperçu ne font rien.

describe('réglages d’URL de la vue réseau', () => {
  it('la vue « reseau » fait partie des audiences de l’aperçu', () => {
    expect(VUES_APERCU).toContain('reseau');
  });

  it('défauts : premier temps, campagne ouverte', () => {
    expect(lireReglagesReseau({})).toEqual({
      etape: 'information',
      campagne: 'ouverte'
    });
  });

  it('lit chaque étape et la clôture', () => {
    for (const etape of ETAPES_APERCU_RESEAU) {
      expect(lireReglagesReseau({ etape }).etape).toBe(etape);
    }
    expect(lireReglagesReseau({ campagne: 'close' }).campagne).toBe('close');
    expect(lireReglagesReseau({ campagne: 'brouillon' }).campagne).toBe(
      'brouillon'
    );
  });

  it('valeur inconnue ou multiple : défaut', () => {
    expect(
      lireReglagesReseau({ etape: 'admin', campagne: ['close', 'ouverte'] })
    ).toEqual({ etape: 'information', campagne: 'ouverte' });
  });

  it('construit le lien complet', () => {
    expect(
      lienApercuReseau('SR', { etape: 'repondu', campagne: 'close' })
    ).toBe(
      '/admin/apercu-resultats?vue=reseau&profil=SR&etape=repondu&campagne=close'
    );
  });
});

describe('relevé fictif', () => {
  it('les membres sont les trois autres personnes fictives', () => {
    const r = releveApercu('AM', 'releve', 'ouverte');
    expect(r.membres.map((m) => m.nom)).toEqual([
      'Hind T.',
      'Karim B.',
      'Salma R.'
    ]);
    const ids = r.membres.map((m) => m.participationId);
    expect(new Set(ids).size).toBe(3);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('les noms ne portent pas la mention d’estimation du profil', () => {
    const r = releveApercu('KB', 'releve', 'ouverte');
    expect(r.membres.map((m) => m.nom)).toContain('Amine');
  });

  it('premier temps : pas encore informé, aucun membre montré', () => {
    const r = releveApercu('AM', 'information', 'ouverte');
    expect(r.moi).toBeNull();
    expect(r.membres).toEqual([]);
  });

  it('consentement : informé, aucun accord', () => {
    const r = releveApercu('AM', 'consentement', 'ouverte');
    expect(r.moi?.informeLe).toBeTruthy();
    expect(r.moi?.accordRepondreLe).toBeNull();
    expect(r.moi?.accordCarteLe).toBeNull();
  });

  it('relevé vide puis rempli : quatre réponses valides par membre', () => {
    expect(releveApercu('AM', 'releve', 'ouverte').reponses).toEqual([]);
    const r = releveApercu('AM', 'repondu', 'ouverte');
    expect(r.reponses).toHaveLength(12);
    for (const rep of r.reponses) {
      expect(LIENS).toContain(rep.lien);
      expect(valeurValide(rep.lien, rep.valeur)).toBe(true);
    }
    expect(r.moi?.accordRepondreLe).toBeTruthy();
  });

  it('opposition : opposé, sans accords ni membres', () => {
    const r = releveApercu('AM', 'oppose', 'ouverte');
    expect(r.moi?.opposeLe).toBeTruthy();
    expect(r.moi?.accordRepondreLe).toBeNull();
    expect(r.membres).toEqual([]);
  });

  it('relevé fermé : ma ligne et un nombre de réponses, jamais l’équipe', () => {
    const r = releveApercu('AM', 'ferme', 'ouverte');
    expect(r.ferme).toBe(true);
    expect(r.campagneOuverte).toBe(false);
    expect(r.membres).toEqual([]);
    expect(r.reponses).toEqual([]);
    expect(r.nbReponses).toBeGreaterThan(0);
    expect(r.moi?.accordRepondreLe).toBeTruthy();
  });

  it('relevé fermé, personne opposée : opposition posée, aucun accord', () => {
    const r = releveApercu('AM', 'fermeOppose', 'ouverte');
    expect(r.ferme).toBe(true);
    expect(r.moi?.opposeLe).toBeTruthy();
    expect(r.moi?.accordRepondreLe).toBeNull();
    expect(r.nbReponses).toBe(0);
  });

  it('campagne close', () => {
    expect(releveApercu('AM', 'repondu', 'close').campagneOuverte).toBe(false);
    expect(releveApercu('AM', 'repondu', 'ouverte').campagneOuverte).toBe(true);
    expect(
      releveApercu('AM', 'consentement', 'brouillon').campagneOuverte
    ).toBe(false);
  });
});

describe('actions neutralisées', () => {
  it('chacune rend « apercu » sans rien faire', async () => {
    const p = '00000000-0000-4000-8000-000000000000';
    expect(await actionsApercuReseau.informer(p, true)).toEqual({
      status: 'apercu'
    });
    expect(await actionsApercuReseau.consentir(p, true, true, true)).toEqual({
      status: 'apercu'
    });
    expect(await actionsApercuReseau.repondre(p, [])).toEqual({
      status: 'apercu'
    });
    expect(await actionsApercuReseau.retirer(p)).toEqual({ status: 'apercu' });
  });
});
