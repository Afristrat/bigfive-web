import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { getItems } from '@bigfive-org/questions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Parcours anonyme fermé : les actions serveur du parcours public refusent
// elles-mêmes, sans toucher MongoDB, pour qu'un appel direct ne contourne pas
// la fermeture des pages.
const appels = vi.hoisted(() => ({ base: 0, plafond: 0 }));
vi.mock('@/db', () => ({
  connectToDatabase: async () => {
    appels.base += 1;
    throw new Error('MongoDB ne doit pas être appelé');
  }
}));
vi.mock('@/lib/rate-limit', () => ({
  isRateLimited: async () => {
    appels.plafond += 1;
    return false;
  },
  limits: { getResult: {}, saveTest: {} }
}));

import { getTestResult, savePublicTest, saveTest } from '@/actions';
import { PARCOURS_ANONYME_OUVERT } from '@/config/site';
import { testSchema } from '@/schemas';
import type { DbResult } from '@/types';

// Résultat complet et valide : le refus ne vient pas de la validation.
const RESULTAT: DbResult = {
  testId: 'b5-120',
  lang: 'fr',
  invalid: false,
  timeElapsed: 600,
  dateStamp: new Date(),
  answers: getItems('en').map((item) => ({
    id: item.id,
    score: 3,
    domain: item.domain,
    facet: Number(item.facet)
  }))
};
const ID = '0123456789abcdef01234567';

beforeEach(() => {
  appels.base = 0;
  appels.plafond = 0;
});

describe('actions du parcours public, interrupteur fermé', () => {
  it('l’interrupteur est fermé', () => {
    expect(PARCOURS_ANONYME_OUVERT).toBe(false);
  });

  it('savePublicTest renvoie un refus, sans plafond ni appel MongoDB', async () => {
    await expect(savePublicTest(RESULTAT)).resolves.toEqual({
      error: 'closed'
    });
    expect(appels.base).toBe(0);
    expect(appels.plafond).toBe(0);
  });

  it('saveTest, appelé directement, refuse sans appel MongoDB', async () => {
    expect(testSchema.safeParse(RESULTAT).success).toBe(true);
    await expect(saveTest(RESULTAT)).rejects.toMatchObject({
      name: 'SavingError'
    });
    expect(appels.base).toBe(0);
    expect(appels.plafond).toBe(0);
  });

  it('getTestResult, appelé directement, ne lit pas MongoDB', async () => {
    await expect(getTestResult(ID)).rejects.toMatchObject({
      name: 'NotFoundError'
    });
    expect(appels.base).toBe(0);
    expect(appels.plafond).toBe(0);
  });
});

// Lecture du code : savePublicTest n'est branché que par la page /test, dont la
// branche fermée ne rend plus le formulaire (parcours-anonyme-ferme.test.ts).
describe('aucune autre page ne branche savePublicTest', () => {
  const racine = resolve(__dirname, '../../src');
  const fichiers = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((nom) => {
      const chemin = join(dossier, nom);
      return statSync(chemin).isDirectory()
        ? fichiers(chemin)
        : /\.(ts|tsx)$/.test(nom)
          ? [chemin]
          : [];
    });

  it('seuls l’action et la page /test le mentionnent', () => {
    const mentions = fichiers(racine)
      .filter((f) => readFileSync(f, 'utf8').includes('savePublicTest'))
      .map((f) => relative(racine, f).split('\\').join('/'))
      .sort();
    expect(mentions).toEqual([
      'actions/index.ts',
      'app/[locale]/test/page.tsx'
    ]);
  });
});
