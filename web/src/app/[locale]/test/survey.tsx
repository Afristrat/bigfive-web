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
};

interface SurveyProps {
  questions: Question[];
  labels: SurveyLabels;
  saveTest: (result: DbResult) => Promise<{ id: string }>;
  locale: string;
}

export const Survey = ({
  questions,
  labels,
  saveTest,
  locale: language
}: SurveyProps) => {
  const router = useRouter();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [restored, setRestored] = useState(false);
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
    localStorage.setItem('inProgress', 'true');
    localStorage.setItem(
      'b5data',
      JSON.stringify({ answers, currentQuestionIndex })
    );
  }, [answers, currentQuestionIndex]);

  useEffect(() => {
    if (dataInLocalStorage()) restoreDataFromLocalStorage();
  }, []);

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
    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNextQuestions() {
    shouldFocusHeading.current = true;
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
    setSaveFailed(false);
    try {
      const result = await saveTest({
        testId: 'b5-120',
        lang: language,
        invalid: false,
        timeElapsed: seconds,
        dateStamp: new Date(),
        answers
      });
      localStorage.removeItem('inProgress');
      localStorage.removeItem('b5data');
      localStorage.setItem('resultId', result.id);
      router.push(`/result/${result.id}`);
    } catch (error) {
      // La progression locale est conservée pour permettre un nouvel essai.
      console.error('Could not save the test', error);
      setSaveFailed(true);
      setLoading(false);
    }
  }

  function dataInLocalStorage() {
    return !!localStorage.getItem('inProgress');
  }

  function restoreDataFromLocalStorage() {
    const data = localStorage.getItem('b5data');
    if (data) {
      const { answers, currentQuestionIndex } = JSON.parse(data);
      setAnswers(answers);
      setCurrentQuestionIndex(currentQuestionIndex);
      setRestored(true);
    }
  }

  function clearDataInLocalStorage() {
    localStorage.removeItem('inProgress');
    localStorage.removeItem('b5data');
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
      {saveFailed && (
        <Notice ton='erreur' titre={labels.saveFailedTitle} className='mt-6'>
          <p>{labels.saveFailedText}</p>
          <Button
            variant='bordered'
            className='h-auto min-h-11 border-trait-fort py-2 text-encre data-[hover=true]:bg-creux'
            onPress={() => location.reload()}
          >
            {labels.reload}
          </Button>
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
