import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { appelSansRejet } from '@/lib/appel-sans-rejet';

// Un appel d'action serveur depuis le navigateur peut être rejeté (coupure
// réseau, action introuvable après un déploiement). Non intercepté, le rejet
// remonte à la frontière d'erreur de la page et efface toute saisie en cours.
// Les écrans traduisent donc ce rejet en statut d'erreur affiché.

type Etat = { status: 'ok' | 'erreur' };

describe('appelSansRejet', () => {
  it('rend le résultat de l’action quand elle aboutit', async () => {
    await expect(
      appelSansRejet<Etat>(async () => ({ status: 'ok' }), { status: 'erreur' })
    ).resolves.toEqual({ status: 'ok' });
  });

  it('rejet (réseau coupé) : rend le statut de repli, ne lève jamais', async () => {
    await expect(
      appelSansRejet<Etat>(
        () => Promise.reject(new TypeError('Failed to fetch')),
        {
          status: 'erreur'
        }
      )
    ).resolves.toEqual({ status: 'erreur' });
  });

  it('exception levée avant toute promesse : même repli', async () => {
    await expect(
      appelSansRejet<Etat>(
        () => {
          throw new Error('Server action not found');
        },
        { status: 'erreur' }
      )
    ).resolves.toEqual({ status: 'erreur' });
  });
});

// Les composants clients n'ont pas de DOM en test : on vérifie dans leur
// source que chaque appel d'action passe par le garde.
const source = (chemin: string): string =>
  readFileSync(resolve(__dirname, '../../src', chemin), 'utf8');

describe('les écrans gardent la saisie quand l’appel est rejeté', () => {
  it('relevé du réseau : l’action passe par le garde, repli « failed »', () => {
    const ecran = source('components/reseau/ecran-reseau.tsx');
    expect(ecran).toMatch(
      /appelSansRejet\(action, \{\s*status: 'failed'\s*\}\)/
    );
    expect(ecran).not.toMatch(/await action\(\)/);
  });

  it('verdict : l’action passe par le garde, repli « erreur »', () => {
    const verdict = source('components/relecture/verdict-form.tsx');
    expect(verdict).toMatch(
      /appelSansRejet\(\s*\(\) => relireBloc\(state, data\),\s*\{\s*status: 'erreur'\s*\}\s*\)/
    );
  });

  it('relecteurs : désignation et retrait passent par le garde, repli « erreur »', () => {
    const panneau = source('components/relecture/relecteurs-panel.tsx');
    expect(panneau).toMatch(
      /appelSansRejet\(\s*\(\) => designerRelecteur\(avant, data\),\s*\{\s*status: 'erreur'\s*\}\s*\)/
    );
    expect(panneau).toMatch(
      /appelSansRejet\(\s*\(\) => retirerRelecteur\(avant, data\),\s*\{\s*status: 'erreur'\s*\}\s*\)/
    );
    expect(panneau).not.toMatch(
      /useActionState\(\s*(designer|retirer)Relecteur,/
    );
  });
});

describe('relevé du réseau : brouillon et rafraîchissement', () => {
  const ecran = source('components/reseau/ecran-reseau.tsx');

  it('le brouillon n’est jamais remis à zéro dans un effet : il vit sous la section à clé d’étape', () => {
    expect(ecran).not.toMatch(/setBrouillon\(brouillonDepuis/);
    expect(ecran).toMatch(/<section\s+key=\{vue\}/);
    // L'état du brouillon appartient à la liste fermée, montée dans la section.
    const liste = ecran.slice(ecran.indexOf('function ListeFermee('));
    expect(liste).toMatch(/useState<Brouillon>\(/);
    const ecranPrincipal = ecran.slice(
      0,
      ecran.indexOf('function ListeFermee(')
    );
    expect(ecranPrincipal).not.toMatch(/useState<Brouillon>\(/);
  });

  it('aucun router.refresh : l’action serveur revalide la page et en rend le nouvel état', () => {
    expect(ecran).not.toMatch(/router\.refresh\(\)/);
    expect(ecran).not.toMatch(/useRouter/);
  });

  it('un seul déplacement du focus vers le titre : plus d’effet de changement d’étape', () => {
    expect(ecran).not.toMatch(/etapeAffichee/);
    expect(ecran.match(/titre\.current\?*\.focus\(\)/g) ?? []).toHaveLength(0);
  });
});
