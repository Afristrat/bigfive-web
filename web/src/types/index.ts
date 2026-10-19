import { SVGProps } from 'react';

export type IconSvgProps = SVGProps<SVGSVGElement> & {
  size?: number;
};

export type BaseAnswer = {
  score: number;
  domain: string;
  facet: number;
};

export type Answer = BaseAnswer & { id: string };

export type DbResult = {
  testId: string;
  lang: string;
  invalid: boolean;
  timeElapsed: number;
  dateStamp: Date;
  answers: Answer[];
};

// getTemplate() est typé `any` par @bigfive-org/results : on fixe ici la forme réelle.
export type ResultTemplateDomain = {
  domain: string;
  title: string;
  shortDescription: string;
  description: string;
  results: { score: string; text: string }[];
  facets: { facet: number; title: string; text: string }[];
};

export type Feedback = {
  name: string;
  email: string;
  message: string;
};

type ErrorName = 'NotFoundError' | 'SavingError' | 'RateLimitError';

class ErrorBase<T extends string> extends Error {
  name: T;
  message: string;
  cause: unknown;

  constructor({
    name,
    message,
    cause
  }: {
    name: T;
    message: string;
    cause?: unknown;
  }) {
    super();
    this.name = name;
    this.message = message;
    this.cause = cause;
  }
}

export class B5Error extends ErrorBase<ErrorName> {}
