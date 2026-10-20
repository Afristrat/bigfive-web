'use server';

import { connectToDatabase } from '@/db';
import { ObjectId } from 'mongodb';
import { B5Error, DbResult } from '@/types';
import calculateScore from '@bigfive-org/score';
import generateResult, {
  getInfo,
  Language,
  Domain
} from '@bigfive-org/results';
import { getItems } from '@bigfive-org/questions';
import { testId, testSchema } from '@/schemas';
import { isRateLimited, limits } from '@/lib/rate-limit';
import { QUESTIONNAIRE_VERSION } from '@/lib/question-overrides';

const collectionName = process.env.DB_COLLECTION || 'results';
const resultLanguages = getInfo().languages;
const resultLanguageIds = new Set(resultLanguages.map((l) => l.id));
// Domaine et facette de chaque question font foi côté serveur, jamais ceux du client.
const itemsById = new Map(getItems('en').map((item) => [item.id, item]));

const notFound = (id: string): B5Error =>
  new B5Error({
    name: 'NotFoundError',
    message: `The test results with id ${id} is not found in the database!`
  });

export type Report = {
  id: string;
  timestamp: number;
  availableLanguages: Language[];
  language: string;
  results: Domain[];
};

export async function getTestResult(
  id: string,
  language?: string
): Promise<Report | undefined> {
  const parsedId = testId.safeParse({ id });
  if (!parsedId.success) throw notFound(id);
  if (await isRateLimited('getResult', limits.getResult)) {
    throw new B5Error({
      name: 'RateLimitError',
      message: 'Too many requests, please try again later.'
    });
  }
  try {
    const query = { _id: new ObjectId(parsedId.data.id) };
    const db = await connectToDatabase();
    const collection = db.collection(collectionName);
    const report = await collection.findOne(query);
    if (!report) {
      console.error(`The test results with id ${id} are not found!`);
      throw notFound(id);
    }
    // La langue sert de chemin de module dans @bigfive-org/results : seule une
    // langue de la liste fermée est acceptée.
    const selectedLanguage =
      language && resultLanguageIds.has(language)
        ? language
        : resultLanguageIds.has(report.lang)
          ? report.lang
          : 'en';
    const scores = calculateScore({ answers: report.answers });
    const results = generateResult({ lang: selectedLanguage, scores });
    return {
      id: report._id.toString(),
      timestamp: report.dateStamp,
      availableLanguages: resultLanguages,
      language: selectedLanguage,
      results
    };
  } catch (error) {
    if (error instanceof B5Error) {
      throw error;
    }
    throw new Error('Something wrong happend. Failed to get test result!');
  }
}

export async function saveTest(testResult: DbResult) {
  const parsed = testSchema.safeParse(testResult);
  if (!parsed.success || (await isRateLimited('saveTest', limits.saveTest))) {
    throw new B5Error({
      name: 'SavingError',
      message: 'Failed to save test result!'
    });
  }
  try {
    const db = await connectToDatabase();
    const collection = db.collection(collectionName);
    const answers = parsed.data.answers.map((answer) => {
      const item = itemsById.get(answer.id);
      return item
        ? { ...answer, domain: item.domain, facet: item.facet }
        : answer;
    });
    const result = await collection.insertOne({
      ...parsed.data,
      answers,
      questionnaireVersion: QUESTIONNAIRE_VERSION,
      dateStamp: new Date()
    });
    return { id: result.insertedId.toString() };
  } catch (error) {
    console.error(error);
    throw new B5Error({
      name: 'SavingError',
      message: 'Failed to save test result!'
    });
  }
}
