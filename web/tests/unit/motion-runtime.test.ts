import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { animerPage } from '@/components/home/motion-runtime';

// Moteur de mouvement piloté sur un faux document : chaque écriture dans un
// compteur est tracée, pour prouver ce que voit la personne entre le rendu
// servi et la fin de l'animation.

const HAUTEUR = 800;

class FauxElement {
  readonly dataset: Record<string, string> = {};
  readonly ecritures: string[] = [];
  parentElement: FauxElement | null = null;
  private readonly attributs = new Map<string, string>();
  private texte: string;

  constructor(
    attributs: Record<string, string>,
    private readonly haut: number,
    texte = ''
  ) {
    this.texte = texte;
    for (const [nom, valeur] of Object.entries(attributs)) {
      this.attributs.set(nom, valeur);
      if (nom.startsWith('data-')) {
        const cle = nom
          .slice(5)
          .replace(/-(\w)/g, (_, lettre: string) => lettre.toUpperCase());
        this.dataset[cle] = valeur;
      }
    }
  }

  get textContent(): string {
    return this.texte;
  }

  set textContent(valeur: string) {
    this.ecritures.push(valeur);
    this.texte = valeur;
  }

  getBoundingClientRect(): { top: number } {
    return { top: this.haut };
  }

  setAttribute(nom: string, valeur: string): void {
    this.attributs.set(nom, valeur);
  }

  hasAttribute(nom: string): boolean {
    return this.attributs.has(nom);
  }

  removeAttribute(nom: string): void {
    this.attributs.delete(nom);
  }
}

// Sélecteurs du moteur : « [a] » ou « [a]:not([b]) ».
function selectionner(elements: FauxElement[], selecteur: string) {
  const forme = /^\[([\w-]+)\](?::not\(\[([\w-]+)\]\))?$/.exec(selecteur);
  if (!forme) throw new Error(`sélecteur non pris en charge : ${selecteur}`);
  const [, present, absent] = forme;
  return elements.filter(
    (el) => el.hasAttribute(present) && !(absent && el.hasAttribute(absent))
  );
}

let observateurs: Array<{
  rappel: (
    entrees: Array<{ isIntersecting: boolean; target: unknown }>
  ) => void;
  cibles: Set<unknown>;
}> = [];

function entrerDansLEcran(el: FauxElement): void {
  for (const o of observateurs) {
    if (o.cibles.has(el)) o.rappel([{ isIntersecting: true, target: el }]);
  }
}

function monter(
  elements: FauxElement[],
  { reduit = false }: { reduit?: boolean } = {}
): () => void {
  vi.stubGlobal('window', {
    innerHeight: HAUTEUR,
    matchMedia: (requete: string) => ({
      matches: requete.includes('reduced-motion') ? reduit : false
    })
  });
  vi.stubGlobal('document', {
    querySelectorAll: (selecteur: string) => selectionner(elements, selecteur)
  });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      private readonly suivi;
      constructor(rappel: (typeof observateurs)[number]['rappel']) {
        this.suivi = { rappel, cibles: new Set<unknown>() };
        observateurs.push(this.suivi);
      }
      observe(cible: unknown): void {
        this.suivi.cibles.add(cible);
      }
      unobserve(cible: unknown): void {
        this.suivi.cibles.delete(cible);
      }
      disconnect(): void {
        this.suivi.cibles.clear();
      }
    }
  );
  vi.stubGlobal('performance', { now: () => Date.now() });
  vi.stubGlobal('requestAnimationFrame', (f: (t: number) => void) =>
    setTimeout(() => f(Date.now()), 16)
  );
  return animerPage();
}

// Compteur de l'accueil tel que la page le sert : valeur finale déjà écrite.
const compteur = (valeur: number, haut: number): FauxElement =>
  new FauxElement(
    { 'data-compteur': String(valeur), 'data-locale': 'fr-MA' },
    haut,
    String(valeur)
  );

beforeEach(() => {
  observateurs = [];
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('compteurs de l’accueil', () => {
  it('un compteur visible au montage garde la valeur servie : aucun « 0 » écrit', () => {
    const chiffres = [120, 5, 30, 3].map((v) => compteur(v, 600));
    // Balisage servi en production jusqu'à eac6490 : délai d'ouverture en ms.
    chiffres.push(
      ...[120, 5, 30, 3].map((v, i) => {
        const el = compteur(v, 600);
        el.dataset.ouverture = String(1000 + i * 90);
        return el;
      })
    );
    monter(chiffres);
    vi.advanceTimersByTime(5000);
    for (const el of chiffres) {
      expect(el.ecritures).toEqual([]);
      expect(el.textContent).toBe(el.dataset.compteur);
    }
  });

  it('un compteur hors écran part de 0 et finit exactement à sa valeur en entrant dans l’écran', () => {
    const el = compteur(120, 2000);
    monter([el]);
    expect(el.textContent).toBe('0');
    expect(el.hasAttribute('data-pret')).toBe(true);
    entrerDansLEcran(el);
    vi.advanceTimersByTime(2000);
    expect(el.textContent).toBe('120');
    expect(el.hasAttribute('data-vu')).toBe(true);
    expect(el.hasAttribute('data-pret')).toBe(false);
  });

  it('une navigation avant l’entrée dans l’écran rend la valeur finale au compteur hors écran', () => {
    const el = compteur(120, 2000);
    const nettoyer = monter([el]);
    expect(el.textContent).toBe('0');
    nettoyer();
    expect(el.textContent).toBe('120');
    expect(el.hasAttribute('data-pret')).toBe(false);
  });

  it('sous « réduire les animations », aucun compteur n’est touché', () => {
    const chiffres = [compteur(120, 600), compteur(30, 2000)];
    monter(chiffres, { reduit: true });
    vi.advanceTimersByTime(5000);
    for (const el of chiffres) expect(el.ecritures).toEqual([]);
  });
});
