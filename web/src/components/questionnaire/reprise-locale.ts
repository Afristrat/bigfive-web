import type {
  Reprise,
  SurveyLabels,
  SurveyProgression
} from '@/app/[locale]/test/survey';
import { formatNombre } from '@/lib/format';
import { fusionnerReprise } from '@/lib/reprise';
import type { Answer, DbResult } from '@/types';

// Logique pure du questionnaire, sans état React : fusion du tampon local et de
// la sauvegarde du serveur, résultat à soumettre, libellés.
// Ce module reste côté client : il n'importe rien du serveur (passation-data lit
// la base) ; la fusion vient de `@/lib/reprise`, module pur.

const enRecord = (answers: readonly Answer[]): Record<string, number> =>
  Object.fromEntries(answers.map((answer) => [answer.id, answer.score]));

/** Même fusion sur des réponses complètes (domaine et facette conservés). */
export function fusionnerReponses(
  serveur: readonly Answer[],
  local: readonly Answer[]
): Answer[] {
  const fusion = fusionnerReprise(enRecord(serveur), enRecord(local));
  const modeles = new Map(
    [...local, ...serveur].map((answer) => [answer.id, answer])
  );
  return Object.entries(fusion).flatMap(([id, score]) => {
    const modele = modeles.get(id);
    return modele ? [{ ...modele, score }] : [];
  });
}

export type Restauration = {
  answers: Answer[];
  index: number;
  restored: true;
};

/**
 * État à reprendre au montage. Sans reprise du serveur, le tampon local est
 * restauré tel quel. Avec une reprise, le tampon est fusionné (le serveur
 * prime) ; il n'est signalé que s'il apporte des réponses que le serveur n'a
 * pas, sinon `null` : l'état du serveur reste celui de l'écran.
 */
export function restaurerReprise(
  initial: Reprise | undefined,
  saved: SurveyProgression | null
): Restauration | null {
  if (!saved) return null;
  if (!initial) {
    return {
      answers: saved.answers,
      index: saved.currentQuestionIndex,
      restored: true
    };
  }
  const connues = new Set(initial.answers.map((answer) => answer.id));
  if (saved.answers.every((answer) => connues.has(answer.id))) return null;
  return {
    answers: fusionnerReponses(initial.answers, saved.answers),
    index: Math.max(initial.index, saved.currentQuestionIndex),
    restored: true
  };
}

/**
 * Résultat envoyé au serveur. Une passation reprise est faite en plusieurs
 * séances : le chronomètre d'une seule ne dit rien de sa durée, on envoie 0.
 */
export function construireResultat(entree: {
  language: string;
  seconds: number;
  answers: Answer[];
  dateStamp: Date;
  reprise: boolean;
}): DbResult {
  return {
    testId: 'b5-120',
    lang: entree.language,
    invalid: false,
    timeElapsed: entree.reprise ? 0 : entree.seconds,
    dateStamp: entree.dateStamp,
    answers: entree.answers
  };
}

type Traducteur = {
  (key: string, values?: Record<string, string>): string;
  raw: (key: string) => unknown;
};

/**
 * Libellés du questionnaire, lus dans l'espace « test ». Partagés par le
 * parcours public et la passation connectée, qui y ajoutent leurs textes propres.
 */
export function libellesSurvey(
  t: Traducteur,
  locale: string,
  total: number
): SurveyLabels {
  return {
    next: t('next'),
    prev: t('back'),
    results: t('seeResults'),
    progress: String(t.raw('progress')),
    saving: t('saving'),
    dismiss: t('dismiss'),
    instructions: t('instructions', { total: formatNombre(total, locale) }),
    halfway: String(t.raw('halfway')),
    noTimeLimit: t('noTimeLimit'),
    progressBar: t('progressBar'),
    statement: String(t.raw('statement')),
    prompt: t('prompt'),
    restored: t('restored'),
    newTest: t('newTest'),
    saveFailedTitle: t('saveFailedTitle'),
    saveFailedText: t('saveFailedText'),
    reload: t('reload'),
    nextHelp: t('nextHelp')
  };
}
