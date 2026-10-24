import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  appliquerEtatRelecture,
  blocFacette,
  blocsBibliotheque,
  empreinteBloc,
  empreinteTexte,
  rafraichirApresEcriture,
  rafraichirEtatRelecture,
  type LigneEtatRelecture
} from '@/lib/bibliotheque';

const chargerEtatRelecture = vi.fn();
vi.mock('@/lib/relecture-etat', () => ({
  chargerEtatRelecture: () => chargerEtatRelecture()
}));

// État de relecture lu en base (migration 0022) PAR-DESSUS le fichier : le
// fichier reste la source du texte, la base dit seulement « relu » ou « à
// corriger » pour une empreinte du texte. Un texte modifié n'hérite de rien.

type BrutBloc = {
  description: string[];
  apport: string[];
  cout: string[];
  question: string;
};
type Brut = {
  facettes: {
    code: string;
    niveaux: Record<string, { fr: BrutBloc; relecture: string }>;
  }[];
};

const brut = JSON.parse(
  readFileSync(
    resolve(__dirname, '../../src/data/bibliotheque-facettes.json'),
    'utf8'
  )
) as Brut;
const texteN1Bas = brut.facettes[0]?.niveaux.bas?.fr as BrutBloc;
const sha = (texte: string): string =>
  createHash('sha256').update(texte).digest('hex');

let avant: string | undefined;
let runtime: string | undefined;
beforeEach(() => {
  avant = process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  runtime = process.env.NEXT_RUNTIME;
  delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  delete process.env.NEXT_RUNTIME;
  appliquerEtatRelecture(null);
});
afterEach(() => {
  if (avant === undefined) delete process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES;
  else process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = avant;
  if (runtime === undefined) delete process.env.NEXT_RUNTIME;
  else process.env.NEXT_RUNTIME = runtime;
  appliquerEtatRelecture(null);
  vi.restoreAllMocks();
});

const relu = (bloc: string, empreinte: string): LigneEtatRelecture => ({
  bloc,
  empreinte,
  verdict: 'relu'
});

describe('empreinte d’un bloc', () => {
  it('SHA-256 du JSON canonique [description, apport, cout, question]', () => {
    const attendu = sha(
      JSON.stringify([
        texteN1Bas.description,
        texteN1Bas.apport,
        texteN1Bas.cout,
        texteN1Bas.question
      ])
    );
    expect(empreinteTexte(texteN1Bas)).toBe(attendu);
    expect(empreinteBloc('N1/bas')).toBe(attendu);
    expect(attendu).toMatch(/^[0-9a-f]{64}$/);
  });

  it('change dès qu’un seul caractère du texte change', () => {
    const modifie = { ...texteN1Bas, question: `${texteN1Bas.question} ` };
    expect(empreinteTexte(modifie)).not.toBe(empreinteTexte(texteN1Bas));
  });

  it('un identifiant inconnu n’a pas d’empreinte', () => {
    expect(empreinteBloc('Z9/bas')).toBeNull();
    expect(empreinteBloc('N1/moyen')).toBeNull();
  });
});

describe('catalogue des 150 blocs', () => {
  const blocs = blocsBibliotheque();

  it('150 blocs dans l’ordre de la bibliothèque, empreintes distinctes', () => {
    expect(blocs).toHaveLength(150);
    expect(blocs[0]?.id).toBe('N1/bas');
    expect(blocs[4]?.id).toBe('N1/haut');
    expect(blocs[149]?.id).toBe('C6/haut');
    expect(new Set(blocs.map((b) => b.empreinte)).size).toBe(150);
    for (const b of blocs) expect(b.empreinte).toBe(empreinteBloc(b.id));
  });

  it('texte sans accord, et formes accordées seulement quand le texte en porte', () => {
    for (const b of blocs) {
      const tout = [
        ...b.texte.description,
        ...b.texte.apport,
        ...b.texte.cout,
        b.texte.question
      ].join(' ');
      expect(tout).not.toMatch(/\{[^{}]*\|[^{}]*\}/);
      if (b.accords) {
        expect(b.accords.m).not.toEqual(b.accords.f);
      }
    }
    expect(blocs.some((b) => b.accords !== null)).toBe(true);
    expect(blocs.some((b) => b.accords === null)).toBe(true);
  });

  it('le champ « relecture » du fichier n’est jamais une source d’affichage', () => {
    const source = readFileSync(
      resolve(__dirname, '../../src/lib/bibliotheque.ts'),
      'utf8'
    );
    expect(source).not.toMatch(/\.relecture\b|\bNON_RELU\b|reluDansLeFichier/);
    expect(blocs.every((b) => !('reluDansLeFichier' in b))).toBe(true);
  });
});

describe('état de la base par-dessus le fichier', () => {
  it('sans état chargé : non relu, masqué à la personne (le fichier ne fait jamais foi)', () => {
    expect(blocFacette('N1/bas', 'fr', 'personne')).toEqual({
      etat: 'en_relecture'
    });
  });

  it('« relu » sur l’empreinte du texte servi : affiché à la personne, sans bandeau', () => {
    appliquerEtatRelecture([relu('N1/bas', empreinteBloc('N1/bas') ?? '')]);
    const etat = blocFacette('N1/bas', 'fr', 'personne');
    expect(etat.etat).toBe('affiche');
    if (etat.etat === 'affiche') expect(etat.nonRelu).toBe(false);
    const consultant = blocFacette('N1/bas', 'fr', 'consultant');
    if (consultant.etat === 'affiche') expect(consultant.nonRelu).toBe(false);
    // Les autres blocs restent masqués.
    expect(blocFacette('N1/haut', 'fr', 'personne').etat).toBe('en_relecture');
  });

  it('« relu » sur une autre empreinte (texte modifié depuis) : redevient non relu', () => {
    appliquerEtatRelecture([relu('N1/bas', 'a'.repeat(64))]);
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('en_relecture');
    const consultant = blocFacette('N1/bas', 'fr', 'consultant');
    expect(consultant.etat === 'affiche' && consultant.nonRelu).toBe(true);
  });

  it('« à corriger » sur le texte servi : masqué à la personne, bandeau pour le consultant', () => {
    appliquerEtatRelecture([
      {
        bloc: 'N1/bas',
        empreinte: empreinteBloc('N1/bas') ?? '',
        verdict: 'a_corriger'
      }
    ]);
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('en_relecture');
    const consultant = blocFacette('N1/bas', 'fr', 'consultant');
    expect(consultant.etat === 'affiche' && consultant.nonRelu).toBe(true);
  });

  it('la variable d’exploitation et l’option d’aperçu gardent leur effet', () => {
    process.env.BIBLIOTHEQUE_NON_RELUS_PERSONNES = 'afficher';
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('affiche');
    expect(
      blocFacette('N1/bas', 'fr', 'personne', 'n', { afficherNonRelus: false })
        .etat
    ).toBe('en_relecture');
  });

  it('l’arabe et l’anglais restent sans texte, relus ou non', () => {
    appliquerEtatRelecture([relu('N1/bas', empreinteBloc('N1/bas') ?? '')]);
    expect(blocFacette('N1/bas', 'ar', 'personne')).toEqual({
      etat: 'langue_absente'
    });
  });

  it('un état vide (base joignable, aucun verdict) : non relu, masqué à la personne', () => {
    appliquerEtatRelecture([]);
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('en_relecture');
  });
});

describe('rafraîchissement de l’état', () => {
  it('charge les lignes de la base et les applique', async () => {
    const chargeur = vi
      .fn()
      .mockResolvedValue([relu('E3/haut', empreinteBloc('E3/haut') ?? '')]);
    await expect(rafraichirEtatRelecture(chargeur)).resolves.toBe(true);
    expect(chargeur).toHaveBeenCalledOnce();
    expect(blocFacette('E3/haut', 'fr', 'personne').etat).toBe('affiche');
  });

  it('un échec garde l’état précédent et ne journalise ni adresse ni texte', async () => {
    appliquerEtatRelecture([relu('E3/haut', empreinteBloc('E3/haut') ?? '')]);
    const avertir = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await expect(
      rafraichirEtatRelecture(() => Promise.reject(new Error('réseau')))
    ).resolves.toBe(false);
    expect(blocFacette('E3/haut', 'fr', 'personne').etat).toBe('affiche');
    expect(avertir).toHaveBeenCalledOnce();
    expect(String(avertir.mock.calls[0]?.[0])).toContain(
      'bibliotheque.relecture_indisponible'
    );
  });

  it('deux rafraîchissements simultanés ne font qu’un appel', async () => {
    let fin: (lignes: LigneEtatRelecture[]) => void = () => {};
    const chargeur = vi.fn(
      () =>
        new Promise<LigneEtatRelecture[]>((ok) => {
          fin = ok;
        })
    );
    const a = rafraichirEtatRelecture(chargeur);
    const b = rafraichirEtatRelecture(chargeur);
    await vi.waitFor(() => expect(chargeur).toHaveBeenCalled());
    fin([]);
    await Promise.all([a, b]);
    expect(chargeur).toHaveBeenCalledOnce();
  });

  it('après une écriture, sans chargement en cours : un seul chargement', async () => {
    const chargeur = vi
      .fn()
      .mockResolvedValue([relu('E3/haut', empreinteBloc('E3/haut') ?? '')]);
    await expect(rafraichirApresEcriture(chargeur)).resolves.toBe(true);
    expect(chargeur).toHaveBeenCalledOnce();
    expect(blocFacette('E3/haut', 'fr', 'personne').etat).toBe('affiche');
  });

  it('après une écriture, un chargement en cours (lu avant le verdict) est suivi d’un nouveau, qui fait foi', async () => {
    const fins: ((lignes: LigneEtatRelecture[]) => void)[] = [];
    const chargeur = vi.fn(
      () =>
        new Promise<LigneEtatRelecture[]>((ok) => {
          fins.push(ok);
        })
    );
    // Un chargement part avant le verdict (il lira l'état ancien)…
    const ancien = rafraichirEtatRelecture(chargeur);
    await vi.waitFor(() => expect(chargeur).toHaveBeenCalledOnce());
    // … le verdict est écrit, deux actions demandent l'état frais.
    const frais = rafraichirApresEcriture(chargeur);
    const frais2 = rafraichirApresEcriture(chargeur);
    fins[0]?.([]);
    await ancien;
    await vi.waitFor(() => expect(chargeur).toHaveBeenCalledTimes(2));
    fins[1]?.([relu('E3/haut', empreinteBloc('E3/haut') ?? '')]);
    await expect(frais).resolves.toBe(true);
    await expect(frais2).resolves.toBe(true);
    // Un seul chargement de plus pour toutes les écritures en attente.
    expect(chargeur).toHaveBeenCalledTimes(2);
    expect(blocFacette('E3/haut', 'fr', 'personne').etat).toBe('affiche');
  });

  it('hors du serveur Next.js (tests), blocFacette ne déclenche aucun chargement', () => {
    chargerEtatRelecture.mockReset();
    blocFacette('N1/bas', 'fr', 'personne');
    expect(chargerEtatRelecture).not.toHaveBeenCalled();
  });

  it('pendant le build non plus', () => {
    chargerEtatRelecture.mockReset();
    process.env.NEXT_RUNTIME = 'nodejs';
    const phase = process.env.NEXT_PHASE;
    process.env.NEXT_PHASE = 'phase-production-build';
    try {
      blocFacette('N1/bas', 'fr', 'personne');
      expect(chargerEtatRelecture).not.toHaveBeenCalled();
    } finally {
      if (phase === undefined) delete process.env.NEXT_PHASE;
      else process.env.NEXT_PHASE = phase;
    }
  });

  it('sur le serveur, un état périmé est rechargé en arrière-plan, une seule fois', async () => {
    chargerEtatRelecture
      .mockReset()
      .mockResolvedValue([relu('N1/bas', empreinteBloc('N1/bas') ?? '')]);
    process.env.NEXT_RUNTIME = 'nodejs';
    // L'appel en cours lit l'état présent (le fichier : masqué)…
    expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('en_relecture');
    blocFacette('N1/haut', 'fr', 'personne');
    await vi.waitFor(() =>
      expect(blocFacette('N1/bas', 'fr', 'personne').etat).toBe('affiche')
    );
    // … l'état chargé vaut pour la minute qui suit : aucun nouvel appel.
    expect(chargerEtatRelecture).toHaveBeenCalledOnce();
  });
});
