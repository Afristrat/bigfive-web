'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
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
import useWindowDimensions from '@/hooks/useWindowDimensions';
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
  noTimeLimit: string;
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
  const [questionsPerPage, setQuestionsPerPage] = useState(1);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [restored, setRestored] = useState(false);
  const { width } = useWindowDimensions();
  const seconds = useTimer();
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Vrai uniquement après un clic sur Suivant ou Précédent : ni la restauration
  // d'une sauvegarde ni le premier rendu ne déplacent le focus.
  const shouldFocusHeading = useRef(false);

  useEffect(() => {
    const handleResize = () => {
      setQuestionsPerPage(window.innerWidth > 768 ? 3 : 1);
    };
    handleResize();
  }, [width]);

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

  const currentQuestions = useMemo(
    () =>
      questions.slice(
        currentQuestionIndex,
        currentQuestionIndex + questionsPerPage
      ),
    [currentQuestionIndex, questions, questionsPerPage]
  );

  const isTestDone = questions.length === answers.length;
  const isLastPage =
    currentQuestionIndex + questionsPerPage >= questions.length;

  const nextButtonDisabled =
    currentQuestionIndex + questionsPerPage > answers.length ||
    (isTestDone &&
      currentQuestionIndex === questions.length - questionsPerPage) ||
    loading;

  const backButtonDisabled = currentQuestionIndex === 0 || loading;

  const total = questions.length;
  const current = Math.min(currentQuestionIndex + 1, total);
  const progressLabel = labels.progress
    .replace('{current}', formatNombre(current, language))
    .replace('{total}', formatNombre(total, language));

  function handleAnswer(id: string, value: string) {
    const question = questions.find((question) => question.id === id);
    if (!question) return;

    const newAnswer: Answer = {
      id,
      score: Number(value),
      domain: question.domain,
      facet: question.facet
    };

    setAnswers((prevAnswers) => [
      ...prevAnswers.filter((a) => a.id !== id),
      newAnswer
    ]);
  }

  function handlePreviousQuestions() {
    shouldFocusHeading.current = true;
    setCurrentQuestionIndex((prev) => prev - questionsPerPage);
  }

  function handleNextQuestions() {
    shouldFocusHeading.current = true;
    setCurrentQuestionIndex((prev) => prev + questionsPerPage);
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
        answered={answers.length}
        total={total}
        current={current}
        label={progressLabel}
      />
      {currentQuestionIndex === 0 && (
        <div className='mt-6'>
          <p className='mb-2 text-petit text-texte-2'>{labels.instructions}</p>
          <p className='text-petit text-texte-3'>{labels.noTimeLimit}</p>
        </div>
      )}
      {restored && (
        <Notice ton='avis' className='mt-6'>
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
      {currentQuestions.map((question, index) => (
        <QuestionBlock
          key={question.id}
          question={question}
          number={currentQuestionIndex + index + 1}
          value={answers
            .find((answer) => answer.id === question.id)
            ?.score.toString()}
          onChange={(value) => handleAnswer(question.id, value)}
          headingRef={index === 0 ? headingRef : undefined}
        />
      ))}
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
      <SurveyNav
        onPrev={handlePreviousQuestions}
        onNext={handleNextQuestions}
        onSubmit={submitTest}
        prevDisabled={backButtonDisabled}
        nextDisabled={isLastPage ? !isTestDone || loading : nextButtonDisabled}
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
      {isDev && !isTestDone && (
        <Button variant='flat' className='mt-4' onPress={skipToEnd}>
          Skip to end (dev)
        </Button>
      )}
    </div>
  );
};
