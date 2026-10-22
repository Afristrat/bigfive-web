'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@nextui-org/button';
import { useRouter } from '@/navigation';

import { CloseIcon } from '@/components/icons';
import { Notice } from '@/components/notice';
import { ProgressHeader } from '@/components/questionnaire/progress-header';
import { QuestionBlock } from '@/components/questionnaire/question-block';
import { SurveyNav } from '@/components/questionnaire/survey-nav';
import { type Question } from '@bigfive-org/questions';
import { isDev } from '@/lib/helpers';
import { formatNombre } from '@/lib/format';
import { scoreForKey } from '@/lib/questionnaire-keys';
import useTimer from '@/hooks/useTimer';
import { type Answer, type DbResult } from '@/types';

export type SurveyLabels = {
  next: string;
  prev: string;
  results: string;
  progress: string; // gabarit « Question {current} sur {total} »
  saving: string;
  dismiss: string;
  instructions: string;
  halfway: string; // gabarit « {half} affirmations sur {total} »
  noTimeLimit: string;
  progressBar: string;
  statement: string; // gabarit « Affirmation {number} »
  prompt: string;
  restored: string;
  newTest: string;
  saveFailedTitle: string;
  saveFailedText: string;
  reload: string;
  nextHelp: string;
  // Textes propres au parcours connecté ; à défaut, saveFailedText.
  // conflictReloaded : conflit résolu en reprenant la version du serveur.
  errorTexts?: Partial<
    Record<'closed' | 'already' | 'conflict' | 'conflictReloaded', string>
  >;
  /** Parcours connecté : message affiché quand le serveur a fourni la reprise. */
  resumed?: string;
};

export type SurveyError = 'closed' | 'already' | 'conflict' | 'failed';
export type SurveyResultat = { href: string } | { error: SurveyError };
/** État du questionnaire tel que le serveur l'a conservé. */
export type Reprise = { answers: Answer[]; index: number; revision: number };
/** Événement que la file de progression signale à l'écran. */
export type ProgressNotice = { error: SurveyError; reprise?: Reprise };
/** Sortie d'une sauvegarde : un conflit peut porter la tentative du serveur. */
export type ProgressSortie = { revision: number } | ProgressNotice;
export type SurveyProgression = {
  answers: Answer[];
  currentQuestionIndex: number;
};
export type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type SurveyProps = {
  questions: Question[];
  labels: SurveyLabels;
  locale: string;
  /** « b5 » pour le parcours public, « b5:<participation> » pour le parcours connecté. */
  storageKey: string;
  onSubmit: (result: DbResult) => Promise<SurveyResultat>;
  /** Reprise depuis le serveur : prime sur le stockage local. */
  initial?: Reprise;
  /**
   * Sauvegarde sur le serveur à chaque changement d'écran (parcours connecté
   * seulement : absent, aucune sauvegarde n'est tentée). Le stockage local ne
   * sert alors que de tampon hors ligne.
   */
  onProgress?: (
    answers: readonly Answer[],
    revision: number
  ) => Promise<ProgressSortie>;
};

export type FileProgression = {
  pousser: (answers: readonly Answer[]) => void;
  arreter: () => void;
};

/**
 * File des sauvegardes serveur : au plus une requête en vol, et une seule
 * écriture en attente (la plus récente). Un conflit adopte la révision du
 * serveur ; une campagne close arrête tout. Un échec ordinaire est silencieux
 * (le tampon local garde les réponses) et la sauvegarde suivante réessaie.
 * `null` sans onProgress : le parcours public ne sauvegarde jamais.
 */
export function creerFileProgression(
  onProgress: SurveyProps['onProgress'],
  revisionInitiale: number,
  notifier: (notice: ProgressNotice) => void
): FileProgression | null {
  if (!onProgress) return null;
  const sauvegarder = onProgress;
  let revision = revisionInitiale;
  let enVol = false;
  let arrete = false;
  let attente: readonly Answer[] | null = null;

  async function appeler(
    answers: readonly Answer[]
  ): Promise<ProgressSortie | null> {
    try {
      return await sauvegarder(answers, revision);
    } catch {
      return null;
    }
  }

  async function envoyer(answers: readonly Answer[]): Promise<void> {
    enVol = true;
    const sortie = await appeler(answers);
    enVol = false;
    if (arrete) return;
    if (sortie && 'revision' in sortie) {
      revision = sortie.revision;
    } else if (sortie?.error === 'closed') {
      arrete = true;
      attente = null;
      notifier({ error: 'closed' });
    } else if (sortie?.error === 'conflict') {
      const { reprise } = sortie;
      if (!reprise) {
        arrete = true;
        attente = null;
        notifier({ error: 'conflict' });
      } else if (reprise.answers.length === 0) {
        // Plus de sauvegarde côté serveur : on repart de sa révision avec les
        // réponses locales, sans alerter.
        revision = reprise.revision;
        attente ??= answers;
      } else {
        // L'écriture en attente reposait sur une révision périmée.
        revision = reprise.revision;
        attente = null;
        notifier({ error: 'conflict', reprise });
      }
    }
    if (attente) {
      const suite = attente;
      attente = null;
      await envoyer(suite);
    }
  }

  return {
    pousser(answers) {
      if (arrete || answers.length === 0) return;
      if (enVol) {
        attente = answers;
        return;
      }
      void envoyer(answers);
    },
    arreter() {
      arrete = true;
      attente = null;
    }
  };
}

export const PUBLIC_STORAGE_KEY = 'b5';
// Anciennes clés du parcours public, relues une seule fois puis migrées vers « b5 ».
const LEGACY_FLAG = 'inProgress';
const LEGACY_DATA = 'b5data';
const RESULT_ID_KEY = 'resultId';
const PUBLIC_RESULT_HREF = /^\/result\/([0-9a-f]{24})$/;

const isProgression = (value: unknown): value is SurveyProgression =>
  typeof value === 'object' &&
  value !== null &&
  'answers' in value &&
  Array.isArray(value.answers) &&
  'currentQuestionIndex' in value &&
  typeof value.currentQuestionIndex === 'number';

function parseProgression(raw: string | null): SurveyProgression | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    return isProgression(value) ? value : null;
  } catch {
    return null;
  }
}

export function ecrireProgression(
  storage: StorageLike,
  key: string,
  progression: SurveyProgression
): void {
  storage.setItem(key, JSON.stringify(progression));
}

export function effacerProgression(storage: StorageLike, key: string): void {
  storage.removeItem(key);
  if (key === PUBLIC_STORAGE_KEY) {
    storage.removeItem(LEGACY_FLAG);
    storage.removeItem(LEGACY_DATA);
  }
}

export function lireProgression(
  storage: StorageLike,
  key: string
): SurveyProgression | null {
  const courante = parseProgression(storage.getItem(key));
  if (courante || key !== PUBLIC_STORAGE_KEY) return courante;
  // Migration douce, une seule fois : l'ancienne progression publique passe sous « b5 ».
  const ancienne = storage.getItem(LEGACY_FLAG)
    ? parseProgression(storage.getItem(LEGACY_DATA))
    : null;
  storage.removeItem(LEGACY_FLAG);
  storage.removeItem(LEGACY_DATA);
  if (ancienne) ecrireProgression(storage, key, ancienne);
  return ancienne;
}

/**
 * Envoie le résultat. La progression locale n'est effacée qu'en cas de succès :
 * toute erreur, y compris une action qui lève, la conserve pour un nouvel essai.
 */
export async function envoyerResultat(
  onSubmit: SurveyProps['onSubmit'],
  result: DbResult,
  storage: StorageLike,
  key: string
): Promise<SurveyResultat> {
  let sortie: SurveyResultat;
  try {
    sortie = await onSubmit(result);
  } catch (error) {
    console.error('Could not save the test', error);
    return { error: 'failed' };
  }
  if ('error' in sortie) return sortie;
  effacerProgression(storage, key);
  const publicId = PUBLIC_RESULT_HREF.exec(sortie.href)?.[1];
  if (publicId) storage.setItem(RESULT_ID_KEY, publicId);
  return sortie;
}

export const Survey = ({
  questions,
  labels,
  onSubmit,
  locale: language,
  storageKey,
  initial,
  onProgress
}: SurveyProps) => {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(
    initial?.index ?? 0
  );
  const [answers, setAnswers] = useState<Answer[]>(initial?.answers ?? []);
  const [loading, setLoading] = useState(false);
  const [saveError, setSaveError] = useState<SurveyError | null>(null);
  const [restored, setRestored] = useState(false);
  const [resumed, setResumed] = useState(
    Boolean(initial && initial.answers.length > 0)
  );
  const [conflictReloaded, setConflictReloaded] = useState(false);
  const file = useRef<FileProgression | null | undefined>(undefined);
  const seconds = useTimer();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Vrai uniquement après un clic sur Suivant ou Précédent : ni la restauration
  // d'une sauvegarde ni le premier rendu ne déplacent le focus.
  const shouldFocusHeading = useRef(false);

  // Sauvegarde locale après chaque changement d'état, pour que la dernière
  // réponse donnée soit toujours incluse. Rien n'est écrit tant qu'aucune
  // réponse n'existe, afin de ne pas écraser une progression à restaurer.
  useEffect(() => {
    if (answers.length === 0) return;
    ecrireProgression(localStorage, storageKey, {
      answers,
      currentQuestionIndex
    });
  }, [answers, currentQuestionIndex, storageKey]);

  useEffect(() => {
    if (initial) return;
    const saved = lireProgression(localStorage, storageKey);
    if (!saved) return;
    setAnswers(saved.answers);
    setCurrentQuestionIndex(saved.currentQuestionIndex);
    setRestored(true);
    // Lecture unique au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => () => file.current?.arreter(), []);

  // La file n'existe que pour le parcours connecté (onProgress fourni).
  function sauvegarderSurServeur() {
    if (file.current === undefined) {
      file.current = creerFileProgression(
        onProgress,
        initial?.revision ?? 0,
        ({ error, reprise }) => {
          if (error === 'conflict' && reprise) {
            // Version du serveur reprise sur place, puis dite à la personne.
            setAnswers(reprise.answers);
            setCurrentQuestionIndex(reprise.index);
            setConflictReloaded(true);
            setSaveError(null);
          } else {
            setSaveError(error);
          }
        }
      );
    }
    file.current?.pousser(answers);
  }

  // Navigation par Suivant ou Précédent : le focus va au titre de la première
  // nouvelle question, puis la page défile jusqu'à elle (sans animation si le
  // mouvement est réduit).
  useEffect(() => {
    if (!shouldFocusHeading.current) return;
    shouldFocusHeading.current = false;
    const heading = headingRef.current;
    if (!heading) return;
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({
      block: 'start',
      behavior: matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth'
    });
  }, [currentQuestionIndex]);

  // Une question par écran : « Question n sur 120 » et les touches 1 à 5
  // désignent sans ambiguïté la question affichée.
  const question: Question | undefined = questions[currentQuestionIndex];
  const currentAnswer = question
    ? answers.find((answer) => answer.id === question.id)
    : undefined;

  const isTestDone = questions.length === answers.length;
  const isLastPage = currentQuestionIndex + 1 >= questions.length;

  const nextButtonDisabled = !currentAnswer || loading;

  const backButtonDisabled = currentQuestionIndex === 0 || loading;

  const total = questions.length;
  const current = Math.min(currentQuestionIndex + 1, total);
  const progressLabel = labels.progress
    .replace('{current}', formatNombre(current, language))
    .replace('{total}', formatNombre(total, language));
  // Message de mi-parcours : affiché sur la première question après la moitié.
  const half = Math.floor(total / 2);
  const halfwayLabel = labels.halfway
    .replace('{half}', formatNombre(half, language))
    .replace('{total}', formatNombre(total, language));

  function handleAnswer(id: string, value: string) {
    const target = questions.find((item) => item.id === id);
    if (!target) return;

    const newAnswer: Answer = {
      id,
      score: Number(value),
      domain: target.domain,
      facet: target.facet
    };

    setAnswers((prevAnswers) => [
      ...prevAnswers.filter((a) => a.id !== id),
      newAnswer
    ]);
  }

  // Touches 1 à 5 : choisissent la réponse sans avancer ni déplacer le focus.
  // Les flèches sont celles, natives, du groupe de boutons radio.
  useEffect(() => {
    if (!question || loading) return;
    const scores = question.choices.map((choice) => choice.score);
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target instanceof HTMLElement ? event.target : null;
      const score = scoreForKey(event.key, scores, target, event);
      if (score === null) return;
      event.preventDefault();
      handleAnswer(question.id, score.toString());
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // handleAnswer ne dépend que de questions, stable pour la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question, loading]);

  function handlePreviousQuestions() {
    shouldFocusHeading.current = true;
    sauvegarderSurServeur();
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNextQuestions() {
    shouldFocusHeading.current = true;
    sauvegarderSurServeur();
    setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1));
    if (restored) setRestored(false);
  }

  function skipToEnd() {
    const randomAnswers = questions
      .map((question) => ({
        id: question.id,
        score: Math.floor(Math.random() * 5) + 1,
        domain: question.domain,
        facet: question.facet
      }))
      .slice(0, questions.length - 1);

    setAnswers([...randomAnswers]);
    setCurrentQuestionIndex(questions.length - 1);
  }

  async function submitTest() {
    setLoading(true);
    setSaveError(null);
    // La soumission remplace la tentative : plus aucune sauvegarde de progression.
    file.current?.arreter();
    const sortie = await envoyerResultat(
      onSubmit,
      {
        testId: 'b5-120',
        lang: language,
        invalid: false,
        timeElapsed: seconds,
        dateStamp: new Date(),
        answers
      },
      localStorage,
      storageKey
    );
    if ('error' in sortie) {
      // La progression locale est conservée pour permettre un nouvel essai.
      setSaveError(sortie.error);
      setLoading(false);
      return;
    }
    router.push(sortie.href);
  }

  function clearDataInLocalStorage() {
    effacerProgression(localStorage, storageKey);
    location.reload();
  }

  return (
    <div>
      <ProgressHeader
        total={total}
        current={current}
        label={progressLabel}
        noTimeLimit={labels.noTimeLimit}
        barLabel={labels.progressBar}
      />
      {currentQuestionIndex === 0 && (
        <p className='mt-6 flex max-w-[44rem] items-start gap-3 rounded-controle border-s-2 border-accent bg-accent-doux px-4 py-3 text-petit text-encre'>
          <svg
            aria-hidden='true'
            focusable='false'
            width='20'
            height='20'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='1.75'
            strokeLinecap='round'
            className='mt-px flex-none text-accent'
          >
            <circle cx='12' cy='12' r='9.5' />
            <path d='M12 11v5.5M12 7.6v.1' />
          </svg>
          <span>{labels.instructions}</span>
        </p>
      )}
      {currentQuestionIndex === half && (
        <Notice ton='info' className='mt-5'>
          <p>{halfwayLabel}</p>
        </Notice>
      )}
      {resumed && labels.resumed && (
        <Notice ton='info' className='mt-5'>
          <p className='min-w-0 flex-1'>{labels.resumed}</p>
          <Button
            isIconOnly
            variant='light'
            size='md'
            aria-label={labels.dismiss}
            onPress={() => setResumed(false)}
          >
            <CloseIcon />
          </Button>
        </Notice>
      )}
      {conflictReloaded && labels.errorTexts?.conflictReloaded && (
        <Notice ton='avis' className='mt-5'>
          <p className='min-w-0 flex-1'>{labels.errorTexts.conflictReloaded}</p>
          <Button
            isIconOnly
            variant='light'
            size='md'
            aria-label={labels.dismiss}
            className='text-avis'
            onPress={() => setConflictReloaded(false)}
          >
            <CloseIcon />
          </Button>
        </Notice>
      )}
      {restored && (
        <Notice ton='avis' className='mt-5'>
          <p className='min-w-0 flex-1'>
            {labels.restored}{' '}
            <Button
              variant='light'
              size='sm'
              className='h-auto min-w-0 px-1 py-0 align-baseline text-petit text-accent underline'
              onPress={clearDataInLocalStorage}
            >
              {labels.newTest}
            </Button>
          </p>
          <Button
            isIconOnly
            variant='light'
            size='md'
            aria-label={labels.dismiss}
            className='text-avis'
            onPress={() => setRestored(false)}
          >
            <CloseIcon />
          </Button>
        </Notice>
      )}
      <form onSubmit={(event) => event.preventDefault()} className='carte mt-6'>
        {question && (
          <QuestionBlock
            key={question.id}
            question={question}
            number={currentQuestionIndex + 1}
            statementLabel={labels.statement}
            prompt={labels.prompt}
            locale={language}
            value={currentAnswer?.score.toString()}
            onChange={(value) => handleAnswer(question.id, value)}
            headingRef={headingRef}
          />
        )}
        <SurveyNav
          onPrev={handlePreviousQuestions}
          onNext={handleNextQuestions}
          onSubmit={submitTest}
          prevDisabled={backButtonDisabled}
          nextDisabled={
            isLastPage ? !isTestDone || loading : nextButtonDisabled
          }
          isLast={isLastPage}
          isLoading={loading}
          labels={{
            prev: labels.prev,
            next: labels.next,
            submit: labels.results,
            saving: labels.saving,
            nextHelp: labels.nextHelp
          }}
        />
      </form>
      {saveError && (
        <Notice ton='erreur' titre={labels.saveFailedTitle} className='mt-6'>
          <p>
            {(saveError !== 'failed' && labels.errorTexts?.[saveError]) ||
              labels.saveFailedText}
          </p>
          {(saveError === 'failed' || saveError === 'conflict') && (
            <Button
              variant='bordered'
              className='h-auto min-h-11 border-trait-fort py-2 text-encre data-[hover=true]:bg-creux'
              onPress={() => location.reload()}
            >
              {labels.reload}
            </Button>
          )}
        </Notice>
      )}
      {isDev && !isTestDone && (
        <Button variant='flat' className='mt-4' onPress={skipToEnd}>
          Skip to end (dev)
        </Button>
      )}
    </div>
  );
};
