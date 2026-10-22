import { getItems } from '@bigfive-org/questions';
import { describe, expect, it, vi } from 'vitest';
import {
  construireResultat,
  fusionnerReponses,
  libellesSurvey,
  restaurerReprise
} from '@/components/questionnaire/reprise-locale';
import { fusionnerReprise } from '@/lib/reprise';
import {
  soumettreQuestionnaire,
  type StorageLike
} from '@/app/[locale]/test/survey';
import type { Answer } from '@/types';

const ITEMS = getItems('en');

const reponse = (index: number, score = 3): Answer => ({
  id: ITEMS[index].id,
  score,
  domain: ITEMS[index].domain,
  facet: ITEMS[index].facet
});

describe('fusionnerReprise (union, le serveur prime)', () => {
  it('ajoute les réponses locales absentes du serveur', () => {
    expect(fusionnerReprise({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('sur une clé commune, la valeur du serveur l’emporte', () => {
    expect(fusionnerReprise({ a: 1 }, { a: 5, b: 2 })).toEqual({ a: 1, b: 2 });
  });

  it('serveur vide : les réponses locales ; locales vides : le serveur', () => {
    expect(fusionnerReprise({}, { a: 4 })).toEqual({ a: 4 });
    expect(fusionnerReprise({ a: 4 }, {})).toEqual({ a: 4 });
  });

  it('ne modifie aucune des deux entrées', () => {
    const serveur = { a: 1 };
    const local = { b: 2 };
    fusionnerReprise(serveur, local);
    expect(serveur).toEqual({ a: 1 });
    expect(local).toEqual({ b: 2 });
  });
});

describe('fusionnerReponses', () => {
  it('garde domaine et facette, le serveur prime, le local s’ajoute', () => {
    const fusion = fusionnerReponses(
      [reponse(0, 4)],
      [reponse(0, 1), reponse(1, 2)]
    );
    expect(fusion).toHaveLength(2);
    expect(fusion.find((a) => a.id === ITEMS[0].id)).toEqual(reponse(0, 4));
    expect(fusion.find((a) => a.id === ITEMS[1].id)).toEqual(reponse(1, 2));
  });

  it('serveur vide : tout le local', () => {
    expect(fusionnerReponses([], [reponse(2, 5)])).toEqual([reponse(2, 5)]);
  });
});

describe('restaurerReprise (tampon local et sauvegarde du serveur)', () => {
  const saved = (answers: Answer[], currentQuestionIndex: number) => ({
    answers,
    currentQuestionIndex
  });

  it('sans reprise ni tampon : rien', () => {
    expect(restaurerReprise(undefined, null)).toBeNull();
  });

  it('parcours public : le tampon est restauré et signalé', () => {
    expect(restaurerReprise(undefined, saved([reponse(0)], 4))).toEqual({
      answers: [reponse(0)],
      index: 4,
      restored: true
    });
  });

  it('reprise du serveur sans tampon : rien à restaurer', () => {
    expect(
      restaurerReprise({ answers: [reponse(0)], index: 1, revision: 2 }, null)
    ).toBeNull();
  });

  it('le tampon n’apporte rien au serveur : aucun signalement', () => {
    expect(
      restaurerReprise(
        { answers: [reponse(0, 4), reponse(1)], index: 2, revision: 2 },
        saved([reponse(0, 1)], 1)
      )
    ).toBeNull();
  });

  it('le tampon porte des réponses plus récentes : fusion, écran le plus avancé, signalement', () => {
    const sortie = restaurerReprise(
      { answers: [reponse(0, 4)], index: 1, revision: 2 },
      saved([reponse(0, 1), reponse(1, 2), reponse(2, 3)], 3)
    );
    expect(sortie?.restored).toBe(true);
    expect(sortie?.index).toBe(3);
    expect(sortie?.answers).toHaveLength(3);
    // Le serveur prime sur la question commune.
    expect(sortie?.answers.find((a) => a.id === ITEMS[0].id)?.score).toBe(4);
  });

  it('reprise du serveur plus avancée que le tampon : on garde son écran', () => {
    const sortie = restaurerReprise(
      { answers: [reponse(0)], index: 9, revision: 2 },
      saved([reponse(5)], 2)
    );
    expect(sortie?.index).toBe(9);
    expect(sortie?.answers).toHaveLength(2);
  });
});

describe('construireResultat', () => {
  const base = {
    language: 'fr',
    seconds: 321,
    answers: [reponse(0)],
    dateStamp: new Date('2026-10-22T10:00:00Z')
  };

  it('passation neuve : la durée mesurée', () => {
    expect(construireResultat({ ...base, reprise: false }).timeElapsed).toBe(
      321
    );
  });

  it('passation reprise : durée 0 (le temps d’une session ne vaut pas la durée totale)', () => {
    expect(construireResultat({ ...base, reprise: true }).timeElapsed).toBe(0);
  });

  it('forme attendue par le serveur', () => {
    expect(construireResultat({ ...base, reprise: false })).toEqual({
      testId: 'b5-120',
      lang: 'fr',
      invalid: false,
      timeElapsed: 321,
      dateStamp: base.dateStamp,
      answers: base.answers
    });
  });
});

describe('soumettreQuestionnaire', () => {
  const stockage = (): StorageLike & { data: Map<string, string> } => {
    const data = new Map<string, string>([['b5:x', '{}']]);
    return {
      data,
      getItem: (k) => data.get(k) ?? null,
      setItem: (k, v) => void data.set(k, v),
      removeItem: (k) => void data.delete(k)
    };
  };
  const resultat = construireResultat({
    language: 'fr',
    seconds: 1,
    answers: [],
    dateStamp: new Date(),
    reprise: false
  });
  const lancer = (
    sortie: Awaited<
      ReturnType<Parameters<typeof soumettreQuestionnaire>[0]['onSubmit']>
    >
  ) => {
    const file = { pousser: vi.fn(), arreter: vi.fn() };
    const s = stockage();
    const promesse = soumettreQuestionnaire({
      onSubmit: async () => sortie,
      result: resultat,
      storage: s,
      key: 'b5:x',
      file,
      alreadyHref: '/mes-resultats/p1'
    });
    return { file, s, promesse };
  };

  it('succès : la file est arrêtée seulement après, et on va à l’adresse rendue', async () => {
    const { file, promesse } = lancer({ href: '/mes-resultats/p1' });
    expect(file.arreter).not.toHaveBeenCalled();
    expect(await promesse).toEqual({ aller: '/mes-resultats/p1' });
    expect(file.arreter).toHaveBeenCalledTimes(1);
  });

  it.each(['failed', 'conflict', 'closed'] as const)(
    'erreur %s : la file continue de sauvegarder',
    async (error) => {
      const { file, promesse } = lancer({ error });
      expect(await promesse).toEqual({ erreur: error });
      expect(file.arreter).not.toHaveBeenCalled();
    }
  );

  it('déjà envoyé : file arrêtée, tampon effacé, redirection vers le résultat', async () => {
    const { file, s, promesse } = lancer({ error: 'already' });
    expect(await promesse).toEqual({ aller: '/mes-resultats/p1' });
    expect(file.arreter).toHaveBeenCalledTimes(1);
    expect(s.data.has('b5:x')).toBe(false);
  });

  it('déjà envoyé sans adresse de repli : erreur affichée, tampon conservé', async () => {
    const file = { pousser: vi.fn(), arreter: vi.fn() };
    const s = stockage();
    const sortie = await soumettreQuestionnaire({
      onSubmit: async () => ({ error: 'already' }),
      result: resultat,
      storage: s,
      key: 'b5:x',
      file
    });
    expect(sortie).toEqual({ erreur: 'already' });
    expect(s.data.has('b5:x')).toBe(true);
  });

  it('sans file (parcours public) : aucun plantage', async () => {
    const sortie = await soumettreQuestionnaire({
      onSubmit: async () => ({ href: '/result/0123456789abcdef01234567' }),
      result: resultat,
      storage: stockage(),
      key: 'b5:x',
      file: null
    });
    expect(sortie).toEqual({ aller: '/result/0123456789abcdef01234567' });
  });
});

describe('libellesSurvey (bloc de libellés partagé)', () => {
  const t = Object.assign(
    (key: string, values?: Record<string, string>): string =>
      values ? `${key}:${JSON.stringify(values)}` : key,
    { raw: (key: string): string => `raw:${key}` }
  );

  it('lit les gabarits bruts et injecte le nombre de questions', () => {
    const l = libellesSurvey(t, 'fr', 120);
    expect(l.progress).toBe('raw:progress');
    expect(l.halfway).toBe('raw:halfway');
    expect(l.statement).toBe('raw:statement');
    expect(l.instructions).toBe('instructions:{"total":"120"}');
    expect(l.next).toBe('next');
    expect(l.prev).toBe('back');
    expect(l.results).toBe('seeResults');
    expect(l.nextHelp).toBe('nextHelp');
    expect(l.errorTexts).toBeUndefined();
  });

  it('formate le nombre selon la langue, chiffres latins en arabe', () => {
    expect(libellesSurvey(t, 'ar', 1200).instructions).toMatch(/1\D?200/);
  });
});
