import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import ar from '@/messages/ar.js';
import fr from '@/messages/fr.js';

// Écran de réponse du relevé : les trois temps, la campagne close, l'opposition.
// Le composant reçoit données et actions en props ; rendu statique ici.

vi.mock('@/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  Link: (props: { href: string; children?: unknown }) =>
    createElement('a', { href: props.href }, props.children as never)
}));

import { EcranReseau } from '@/components/reseau/ecran-reseau';
import { libellesReseau } from '@/components/reseau/libelles';
import type { EtatMoi, ReleveReseau } from '@/lib/reseau-releve';

type Tree = { [key: string]: string | Tree };

const traducteur =
  (catalogue: Tree) =>
  (cle: string, valeurs?: Record<string, string>): string => {
    let noeud: string | Tree | undefined = catalogue;
    for (const part of cle.split('.')) {
      noeud = typeof noeud === 'object' ? noeud[part] : undefined;
    }
    if (typeof noeud !== 'string') throw new Error(`Message absent ${cle}`);
    return noeud.replace(
      /\{(\w+)\}/g,
      (tout, nom: string) => valeurs?.[nom] ?? tout
    );
  };

const t = traducteur(fr.reseau as Tree);
const PART = '66666666-6666-4666-8666-666666666666';
const M1 = '77777777-7777-4777-8777-777777777771';
const M2 = '77777777-7777-4777-8777-777777777772';
const M3 = '77777777-7777-4777-8777-777777777773';

const moi = (surcharge: Partial<EtatMoi> = {}): EtatMoi => ({
  informeLe: '2026-10-23T09:00:00Z',
  opposeLe: null,
  accordRepondreLe: null,
  accordCarteLe: null,
  ...surcharge
});

const releve = (surcharge: Partial<ReleveReseau> = {}): ReleveReseau => ({
  campagneOuverte: true,
  moi: null,
  membres: [],
  reponses: [],
  ...surcharge
});

const membres = [
  { participationId: M1, nom: 'Karim B.' },
  { participationId: M2, nom: 'Salma R.' },
  { participationId: M3, nom: null }
];

const actions = {
  informer: vi.fn(),
  consentir: vi.fn(),
  repondre: vi.fn(),
  retirer: vi.fn()
};

const rendre = (
  r: ReleveReseau,
  {
    locale = 'fr',
    contact = 'contact@tenga.test',
    statutCampagne = undefined as 'brouillon' | 'ouverte' | 'close' | undefined
  } = {}
): string =>
  renderToStaticMarkup(
    createElement(EcranReseau, {
      participationId: PART,
      releve: r,
      actions,
      locale,
      statutCampagne:
        statutCampagne ?? (r.campagneOuverte ? 'ouverte' : 'close'),
      reconnexion: `/connexion?next=/mes-resultats/reseau/${PART}`,
      libelles: libellesReseau(
        locale === 'ar' ? traducteur(ar.reseau as Tree) : t,
        contact
      )
    })
  );

const compter = (html: string, motif: RegExp): number =>
  [...html.matchAll(motif)].length;
// Le rendu échappe les apostrophes : on compare au texte tel que React l'écrit.
const echappe = (texte: string): string =>
  texte.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;');

describe('premier temps : information et opposition', () => {
  const html = rendre(releve());

  it('montre le texte d’information des personnes citées', () => {
    expect(html).toContain(echappe(fr.reseau.information.texte));
    expect(html).toContain('data-etape="information"');
  });

  it('une case d’opposition non cochée et le bouton « J’ai lu »', () => {
    const cases = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)];
    expect(cases).toHaveLength(1);
    expect(cases[0]?.[0]).not.toContain('checked');
    expect(html).toContain(echappe(fr.reseau.information.opposition));
    expect(html).toContain(echappe(fr.reseau.information.lu));
  });

  it('mentions : responsable, contact, déclaration CNDP en cours, sans numéro', () => {
    expect(html).toContain('Tenga Conseil');
    expect(html).toContain('contact@tenga.test');
    expect(html).toContain(echappe(fr.reseau.mentions.cndp));
    expect(html).not.toMatch(/n°|numéro/i);
  });

  it('sans adresse de contact configurée : phrase de repli, jamais un trou', () => {
    const sans = rendre(releve(), { contact: '' });
    expect(sans).toContain(echappe(fr.reseau.mentions.contactSansAdresse));
    expect(sans).not.toContain('{contact}');
  });

  it('indique l’étape courante (1 sur 3)', () => {
    expect(compter(html, /aria-current="step"/g)).toBe(1);
    expect(html).toContain('Étape 1 sur 3');
  });

  it('aucune question ni case de consentement à ce stade', () => {
    expect(html).not.toContain('<fieldset');
    expect(html).not.toContain(echappe(fr.reseau.consentement.repondre));
  });
});

describe('deuxième temps : consentement à deux cases distinctes', () => {
  const html = rendre(releve({ moi: moi(), membres }));

  it('deux cases distinctes, non cochées, chacune avec son libellé', () => {
    const cases = [...html.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map(
      (m) => m[0]
    );
    expect(cases).toHaveLength(2);
    for (const c of cases) expect(c).not.toContain('checked');
    const ids = cases.map((c) => /id="([^"]+)"/.exec(c)?.[1]);
    expect(new Set(ids).size).toBe(2);
    expect(html).toContain(echappe(fr.reseau.consentement.repondre));
    expect(html).toContain(echappe(fr.reseau.consentement.carte));
  });

  it('le texte de consentement et les mentions', () => {
    expect(html).toContain(echappe(fr.reseau.consentement.texte));
    expect(html).toContain(echappe(fr.reseau.mentions.cndp));
    expect(html).toContain('data-etape="consentement"');
    expect(html).toContain('Étape 2 sur 3');
  });

  it('l’opposition reste possible ensuite', () => {
    expect(html).toContain(echappe(fr.reseau.opposer.bouton));
  });

  it('pas encore de liste de membres', () => {
    expect(html).not.toContain('<fieldset');
  });

  it('accords déjà donnés : les cases reflètent l’état enregistré', () => {
    const avec = rendre(
      releve({
        moi: moi({ accordCarteLe: '2026-10-23T09:05:00Z' }),
        membres
      })
    );
    const cases = [...avec.matchAll(/<input[^>]*type="checkbox"[^>]*>/g)].map(
      (m) => m[0]
    );
    expect(cases.filter((c) => c.includes('checked'))).toHaveLength(1);
  });
});

describe('troisième temps : liste fermée', () => {
  const accord = moi({ accordRepondreLe: '2026-10-23T09:05:00Z' });
  const html = rendre(releve({ moi: accord, membres }));

  it('un fieldset par membre, avec sa légende', () => {
    expect(compter(html, /<fieldset/g)).toBe(3);
    expect(compter(html, /<legend/g)).toBe(3);
    expect(html).toContain('Karim B.');
    expect(html).toContain('Salma R.');
  });

  it('libellé de repli quand le nom est absent', () => {
    expect(html).toContain(
      echappe(fr.reseau.releve.repli.replace('{numero}', '3'))
    );
  });

  it('quatre questions par membre, chacune un groupe de boutons radio', () => {
    expect(compter(html, /role="radiogroup"/g)).toBe(12);
    for (const q of Object.values(fr.reseau.releve.questions)) {
      expect(
        compter(html, new RegExp(echappe(q).replace(/[?()]/g, '\\$&'), 'g'))
      ).toBe(3);
    }
  });

  it('échelles : cinq fréquences, quatre degrés de confiance', () => {
    // 3 membres × (3 questions × 5 + 1 question × 4) = 57 boutons radio.
    expect(compter(html, /type="radio"/g)).toBe(57);
    for (const libelle of Object.values(fr.reseau.releve.frequences)) {
      expect(html).toContain(echappe(libelle));
    }
    for (const libelle of Object.values(fr.reseau.releve.confiances)) {
      expect(html).toContain(echappe(libelle));
    }
  });

  it('aucune réponse cochée au premier passage, un seul bouton d’enregistrement', () => {
    expect(html).not.toMatch(/type="radio"[^>]*checked/);
    expect(compter(html, /type="submit"/g)).toBe(1);
    expect(html).toContain(echappe(fr.reseau.releve.enregistrer));
  });

  it('les noms des boutons radio sont uniques par question', () => {
    const noms = new Set(
      [...html.matchAll(/type="radio"[^>]*name="([^"]+)"/g)].map((m) => m[1])
    );
    expect(noms.size).toBe(12);
  });

  it('réponses enregistrées : cochées, et « Retirer mes réponses » est présent', () => {
    const repondu = rendre(
      releve({
        moi: accord,
        membres,
        reponses: [
          { cite: M1, lien: 'conseil', valeur: 4 },
          { cite: M2, lien: 'confiance', valeur: 0 }
        ]
      })
    );
    expect(compter(repondu, /type="radio"[^>]*checked/g)).toBe(2);
    expect(repondu).toContain(echappe(fr.reseau.retrait.bouton));
    expect(repondu).toContain(echappe(fr.reseau.opposer.bouton));
  });

  it('personne d’autre n’est encore inscrit : état vide, pas de formulaire', () => {
    const vide = rendre(releve({ moi: accord }));
    expect(vide).toContain(echappe(fr.reseau.releve.vide));
    expect(vide).not.toContain('type="submit"');
  });

  it('étape 3 sur 3', () => {
    expect(html).toContain('Étape 3 sur 3');
    expect(html).toContain('data-etape="releve"');
  });
});

describe('campagne close : lecture seule et retrait', () => {
  const accord = moi({ accordRepondreLe: '2026-10-23T09:05:00Z' });
  const html = rendre(
    releve({
      campagneOuverte: false,
      moi: accord,
      membres,
      reponses: [{ cite: M1, lien: 'conseil', valeur: 4 }]
    })
  );

  it('aucun champ modifiable, les réponses en lecture seule', () => {
    expect(html).not.toContain('type="radio"');
    expect(html).not.toContain('type="submit"');
    expect(html).toContain(echappe(fr.reseau.releve.frequences.jour));
    expect(html).toContain(echappe(fr.reseau.releve.sansReponse));
  });

  it('le bandeau de clôture et le retrait restent présents', () => {
    expect(html).toContain(echappe(fr.reseau.close.texte));
    expect(html).toContain(echappe(fr.reseau.retrait.bouton));
    expect(html).toContain(echappe(fr.reseau.opposer.bouton));
  });

  it('aucun membre listé : ni « revenez plus tard », ni liste vide', () => {
    const vide = rendre(releve({ campagneOuverte: false, moi: accord }));
    expect(vide).not.toContain(echappe(fr.reseau.releve.vide));
    expect(vide).not.toContain('<ol class="flex flex-col gap-4"></ol>');
  });

  it('consentement pendant la clôture : plus de cases d’accord', () => {
    const sans = rendre(
      releve({ campagneOuverte: false, moi: moi(), membres })
    );
    expect(sans).not.toContain(echappe(fr.reseau.consentement.repondre));
    expect(sans).toContain(echappe(fr.reseau.close.texte));
  });
});

describe('campagne en préparation (brouillon)', () => {
  it('bandeau propre, jamais « campagne close »', () => {
    const html = rendre(releve({ campagneOuverte: false, moi: moi() }), {
      statutCampagne: 'brouillon'
    });
    expect(html).toContain(echappe(fr.reseau.brouillon.texte));
    expect(html).not.toContain(echappe(fr.reseau.close.texte));
  });
});

describe('déclencheurs, confirmations et accords', () => {
  const accord = moi({ accordRepondreLe: '2026-10-23T09:05:00Z' });
  const html = rendre(
    releve({
      moi: accord,
      membres,
      reponses: [{ cite: M1, lien: 'conseil', valeur: 4 }]
    })
  );
  const bouton = (texte: string): string =>
    new RegExp(`<button[^>]*>${echappe(texte)}</button>`).exec(html)?.[0] ?? '';

  it('déclencheurs montés, fermés : aria-expanded="false", sans aria-controls orphelin', () => {
    for (const texte of [
      fr.reseau.retrait.bouton,
      fr.reseau.opposer.bouton,
      fr.reseau.accords.modifier
    ]) {
      const b = bouton(texte);
      expect(b, texte).toContain('aria-expanded="false"');
      expect(b, texte).not.toContain('aria-controls');
    }
  });

  it('consentement : la case « répondre » est décrite par l’aide de refus', () => {
    const consent = rendre(releve({ moi: moi(), membres }));
    const id = /<input[^>]*id="([^"]+)"[^>]*name="repondre"/.exec(consent)?.[1];
    expect(id).toBeTruthy();
    expect(consent).toMatch(
      new RegExp(
        `name="repondre"[^>]*aria-describedby="${id}-aide"|aria-describedby="${id}-aide"[^>]*name="repondre"`
      )
    );
    expect(consent).toContain(
      `id="${id}-aide" class="mt-2 ps-4 text-petit text-texte-2">${echappe(fr.reseau.consentement.refusAide)}`
    );
  });

  it('l’avancement est une liste nommée, pas un repère de navigation', () => {
    const debut = rendre(releve());
    expect(debut).not.toContain('<nav');
    expect(debut).toContain(
      `<ol aria-label="${echappe(fr.reseau.etapes.legende)}"`
    );
  });
});

describe('opposition enregistrée', () => {
  const html = rendre(
    releve({ moi: moi({ opposeLe: '2026-10-23T09:10:00Z' }) })
  );

  it('le dit, et propose de lever l’opposition', () => {
    expect(html).toContain(echappe(fr.reseau.oppose.texte));
    expect(html).toContain(echappe(fr.reseau.oppose.lever));
    expect(html).toContain('data-etape="oppose"');
    expect(html).not.toContain('<fieldset');
  });
});

describe('accessibilité et langues', () => {
  it('région vivante persistante dès le premier rendu', () => {
    expect(rendre(releve())).toContain('role="status"');
  });

  it('arabe : les noms latins sont isolés', () => {
    const html = rendre(
      releve({
        moi: moi({ accordRepondreLe: '2026-10-23T09:05:00Z' }),
        membres
      }),
      { locale: 'ar' }
    );
    expect(html).toContain('<bdi>Karim B.</bdi>');
  });

  it('aucun identifiant en double', () => {
    const html = rendre(
      releve({
        moi: moi({ accordRepondreLe: '2026-10-23T09:05:00Z' }),
        membres
      })
    );
    const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
    expect(ids.length).toBeGreaterThan(0);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
