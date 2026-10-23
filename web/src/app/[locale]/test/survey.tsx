'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@nextui-org/button';
import { useRouter } from '@/navigation';

import { CloseIcon } from '@/components/icons';
import { Notice } from '@/components/notice';
import { ProgressHeader } from '@/components/questionnaire/progress-header';
import { QuestionBlock } from '@/components/questionnaire/question-block';
import { SurveyNav } from '@/components/questionnaire/survey-nav';
import {
  construireResultat,
  fusionnerReponses,
  restaurerReprise
} from '@/components/questionnaire/reprise-locale';
import { type Question } from '@bigfive-org/questions';
import { isDev } from '@/lib/helpers';
import { formatNombre } from '@/lib/format';
import { domainCodes } from '@/lib/domain-labels';
import {
  progressByDomain,
  progressQuarter,
  scoreForKey
} from '@/lib/questionnaire-keys';
import styles from '@/components/questionnaire/flow.module.css';
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
  /** Reprise depuis le serveur : prime sur le stockage local, qui lui est fusionné. */
  initial?: Reprise;
  /** Où aller quand le serveur répond « déjà envoyé » (le résultat de la personne). */
  alreadyHref?: string;
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

/** Échecs de sauvegarde consécutifs avant d'alerter la personne. */
export const ECHECS_AVANT_ALERTE = 3;

/**
 * File des sauvegardes serveur : au plus une requête en vol, et une seule
 * écriture en attente (la plus récente). Un conflit adopte la révision du
 * serveur ; une campagne close arrête tout. Un échec ordinaire est silencieux
 * (le tampon local garde les réponses) et la sauvegarde suivante réessaie,
 * jusqu'à ECHECS_AVANT_ALERTE échecs d'affilée où la personne est prévenue
 * (`retablie` la prévient du retour à la normale). Un conflit dont le serveur n'a
 * aucune réponse n'est rejoué qu'une fois de suite : le second est notifié.
 * `null` sans onProgress : le parcours public ne sauvegarde jamais.
 */
export function creerFileProgression(
  onProgress: SurveyProps['onProgress'],
  revisionInitiale: number,
  notifier: (notice: ProgressNotice) => void,
  retablie?: () => void
): FileProgression | null {
  if (!onProgress) return null;
  const sauvegarder = onProgress;
  let revision = revisionInitiale;
  let enVol = false;
  let arrete = false;
  let attente: readonly Answer[] | null = null;
  let renvoiApresRepriseVide = false;
  let echecs = 0;

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
      renvoiApresRepriseVide = false;
      if (echecs >= ECHECS_AVANT_ALERTE) retablie?.();
      echecs = 0;
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
      } else if (reprise.answers.length === 0 && !renvoiApresRepriseVide) {
        // Plus de sauvegarde côté serveur : on repart de sa révision avec les
        // réponses locales, sans alerter, une seule fois (sinon la requête
        // reviendrait en boucle).
        renvoiApresRepriseVide = true;
        revision = reprise.revision;
        attente ??= answers;
      } else if (reprise.answers.length === 0) {
        arrete = true;
        attente = null;
        notifier({ error: 'conflict' });
      } else {
        // L'écriture en attente reposait sur une révision périmée.
        revision = reprise.revision;
        attente = null;
        notifier({ error: 'conflict', reprise });
      }
    } else {
      // Échec ordinaire (« failed », ou action qui lève).
      echecs += 1;
      if (echecs === ECHECS_AVANT_ALERTE) notifier({ error: 'failed' });
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

export type IssueSoumission = { aller: string } | { erreur: SurveyError };

/**
 * Soumet le questionnaire. La file de sauvegarde n'est arrêtée qu'après un
 * succès (ou un « déjà envoyé » qui renvoie vers le résultat) : sur toute autre
 * erreur elle continue, la personne peut réessayer sans perdre ses réponses.
 */
export async function soumettreQuestionnaire(entree: {
  onSubmit: SurveyProps['onSubmit'];
  result: DbResult;
  storage: StorageLike;
  key: string;
  file: FileProgression | null;
  alreadyHref?: string;
}): Promise<IssueSoumission> {
  const sortie = await envoyerResultat(
    entree.onSubmit,
    entree.result,
    entree.storage,
    entree.key
  );
  if (!('error' in sortie)) {
    entree.file?.arreter();
    return { aller: sortie.href };
  }
  if (sortie.error === 'already' && entree.alreadyHref) {
    entree.file?.arreter();
    effacerProgression(entree.storage, entree.key);
    return { aller: entree.alreadyHref };
  }
  return { erreur: sortie.error };
}

export const Survey = ({
  questions,
  labels,
  onSubmit,
  locale: language,
  storageKey,
  initial,
  alreadyHref,
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
  // Sens de la dernière navigation : la question suivante arrive du bord de
  // fin de ligne, la précédente revient du bord de début.
  const [sens, setSens] = useState<'avant' | 'arriere'>('avant');
  const seconds = useTimer();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Vrai uniquement après un clic sur Suivant ou Précédent : ni la restauration
  // d'une sauvegarde ni le premier rendu ne déplacent le focus.
  const shouldFocusHeading = useRef(false);

  // Au montage : le tampon local est fusionné à la reprise du serveur (le
  // serveur prime) ou, sans reprise, restauré tel quel. Cet effet précède
  // l'écriture ci-dessous : à la première passe, celle-ci écraserait sinon le
  // tampon avant qu'il ne soit lu.
  useEffect(() => {
    const restauration = restaurerReprise(
      initial,
      lireProgression(localStorage, storageKey)
    );
    if (!restauration) return;
    setAnswers(restauration.answers);
    setCurrentQuestionIndex(restauration.index);
    setRestored(true);
    setResumed(false);
    // Lecture unique au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  useEffect(() => () => file.current?.arreter(), []);

  // La file n'existe que pour le parcours connecté (onProgress fourni).
  function sauvegarderSurServeur() {
    if (file.current === undefined) {
      file.current = creerFileProgression(
        onProgress,
        initial?.revision ?? 0,
        ({ error, reprise }) => {
          if (error === 'conflict' && reprise) {
            // Réponses du serveur fusionnées aux réponses locales (le serveur
            // prime sur une question commune, rien de plus récent n'est perdu),
            // puis dites à la personne. L'écran courant ne bouge pas.
            setAnswers((locales) =>
              fusionnerReponses(reprise.answers, locales)
            );
            setConflictReloaded(true);
            setSaveError(null);
          } else {
            setSaveError(error);
          }
        },
        () =>
          setSaveError((courante) => (courante === 'failed' ? null : courante))
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
  const parFacteur = useMemo(
    () => progressByDomain(questions, answers, domainCodes),
    [questions, answers]
  );
  const palier = progressQuarter(answers.length, total);
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
    setSens('arriere');
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNextQuestions() {
    shouldFocusHeading.current = true;
    sauvegarderSurServeur();
    setSens('avant');
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
    // La file de sauvegarde ne s'arrête qu'une fois la soumission réussie : sur
    // une erreur, la personne retente et ses réponses continuent d'être gardées.
    const issue = await soumettreQuestionnaire({
      onSubmit,
      result: construireResultat({
        language,
        seconds,
        answers,
        dateStamp: new Date(),
        reprise: Boolean(initial)
      }),
      storage: localStorage,
      key: storageKey,
      file: file.current ?? null,
      alreadyHref
    });
    if ('erreur' in issue) {
      // La progression locale est conservée pour permettre un nouvel essai.
      setSaveError(issue.erreur);
      setLoading(false);
      return;
    }
    router.push(issue.aller);
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
        parFacteur={parFacteur}
        facteurCourant={question?.domain}
        palier={palier}
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
        <Notice ton='info' className={`mt-5 ${styles.felicitation}`}>
          <p className='flex items-start gap-2'>
            <svg
              aria-hidden='true'
              focusable='false'
              width='20'
              height='20'
              viewBox='0 0 24 24'
              fill='none'
              stroke='currentColor'
              strokeWidth='2'
              strokeLinecap='round'
              strokeLinejoin='round'
              className='mt-px flex-none text-accent'
            >
              <path
                className={styles['coche-trait']}
                pathLength={1}
                d='M4.5 12.5l4.8 4.8L19.5 7'
              />
            </svg>
            <span>{halfwayLabel}</span>
          </p>
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
      {/* Zone vive présente avant le message : un message inséré seul n'est pas
          toujours annoncé par les lecteurs d'écran. */}
      <div aria-live='polite'>
        {conflictReloaded && labels.errorTexts?.conflictReloaded && (
          <Notice ton='avis' className='mt-5'>
            <p className='min-w-0 flex-1'>
              {labels.errorTexts.conflictReloaded}
            </p>
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
      </div>
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
            sens={sens}
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
