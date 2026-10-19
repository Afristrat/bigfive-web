'use server';

import { connectToDatabase } from '@/db';
import { ObjectId } from 'mongodb';
import { B5Error, DbResult, ResultTemplateDomain } from '@/types';
import calculateScore from '@bigfive-org/score';
import generateResult, {
  getInfo,
  Language,
  Domain,
  getTemplate
} from '@bigfive-org/results';
import { getItems, getChoices } from '@bigfive-org/questions';
import {
  feedbackSchema,
  sendEmailSchema,
  resultTranslationSchema,
  surveyTranslationSchema,
  testId,
  testSchema
} from '@/schemas';
import { isRateLimited, limits } from '@/lib/rate-limit';
import { basePath } from '@/config/site';
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

export type FeebackState = {
  message: string;
  type: 'error' | 'success';
};

export async function saveFeedback(
  _: FeebackState,
  formData: FormData
): Promise<FeebackState> {
  const parsed = feedbackSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message')
  });
  if (
    !parsed.success ||
    (await isRateLimited('saveFeedback', limits.saveFeedback))
  ) {
    return {
      message: 'Error sending feedback!',
      type: 'error'
    };
  }
  try {
    const db = await connectToDatabase();
    const collection = db.collection('feedback');
    await collection.insertOne({ feedback: parsed.data });
    return {
      message: 'Sent successfully!',
      type: 'success'
    };
  } catch (error) {
    console.error(error);
    return {
      message: 'Error sending feedback!',
      type: 'error'
    };
  }
}

export type EmailState = {
  message: string;
  type: 'error' | 'success';
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const emailFailed: EmailState = {
  message: 'Error sending email!',
  type: 'error'
};

const RESEND_TIMEOUT_MS = 8000;

// Adresse ramenée à sa forme canonique pour le plafond par destinataire, afin
// que les alias (« a+1@ », points Gmail) ne le contournent pas.
const canonicalRecipient = (address: string): string => {
  const [local, domain] = address.toLowerCase().split('@');
  const base = local.split('+')[0];
  const isGmail = domain === 'gmail.com' || domain === 'googlemail.com';
  return `${isGmail ? base.replace(/\./g, '') : base}@${domain}`;
};

/**
 * Envoie le lien d'un résultat par e-mail via l'API Resend. Le client ne
 * fournit que `to` et `resultId` : sujet, texte et HTML sont construits ici.
 */
export async function sendEmail(
  _: EmailState,
  formData: FormData
): Promise<EmailState> {
  const apiKey = process.env.RESEND_API_KEY;
  const parsed = sendEmailSchema.safeParse({
    to: formData.get('to'),
    resultId: formData.get('resultId')
  });
  if (!apiKey || !parsed.success) return emailFailed;

  const { to, resultId } = parsed.data;
  if (
    (await isRateLimited('sendEmail', limits.sendEmailPerIp)) ||
    (await isRateLimited(
      'sendEmailTo',
      limits.sendEmailPerRecipient,
      canonicalRecipient(to)
    )) ||
    (await isRateLimited('sendEmailAll', limits.sendEmailGlobal, 'all'))
  ) {
    return emailFailed;
  }

  try {
    const db = await connectToDatabase();
    const exists = await db
      .collection(collectionName)
      .findOne({ _id: new ObjectId(resultId) }, { projection: { _id: 1 } });
    if (!exists) return emailFailed;

    const link = `${basePath}/result/${resultId}`;
    const subject = 'Your Big Five personality test result';
    const text = `Here is the link to your Big Five personality test result: ${link}`;
    const html = `<p>Here is the link to your Big Five personality test result:</p><p><a href="${escapeHtml(link)}">${escapeHtml(link)}</a></p>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'Tenga <noreply@ai-mpower.com>',
        to: [to],
        subject,
        html,
        text
      })
    });
    if (!res.ok) {
      console.error(`Resend responded with HTTP ${res.status}`);
      return emailFailed;
    }
    return { message: 'Sent successfully!', type: 'success' };
  } catch (error) {
    console.error(error);
    return emailFailed;
  }
}

export type TranslationState = {
  message: string;
  type: 'error' | 'success';
};

const translationSaved: TranslationState = {
  message: 'Thanks <3 Saved successfully!',
  type: 'success'
};

const translationFailed: TranslationState = {
  message: 'Error saving',
  type: 'error'
};

export const generateResultTextTranslation = async (
  _: TranslationState,
  formData: FormData
): Promise<TranslationState> => {
  const template: ResultTemplateDomain[] = getTemplate('en');
  const parsed = resultTranslationSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    results: template.map((domain) => ({
      title: formData.get(`${domain.domain}.title`),
      shortDescription: formData.get(`${domain.domain}.shortDescription`),
      description: formData.get(`${domain.domain}.description`),
      results: domain.results.map((_result, i) => ({
        text: formData.get(`${domain.domain}.results[${i}].text`)
      })),
      facets: domain.facets.map((_facet, i) => ({
        title: formData.get(`${domain.domain}.facets[${i}].title`),
        text: formData.get(`${domain.domain}.facets[${i}].text`)
      }))
    }))
  });
  if (
    !parsed.success ||
    (await isRateLimited('translation', limits.translation))
  ) {
    return translationFailed;
  }

  const { name, email, notes, results } = parsed.data;
  const translatedResultText = template.map((domain, d) => ({
    ...domain,
    title: results[d].title,
    shortDescription: results[d].shortDescription,
    description: results[d].description,
    results: domain.results.map((result, i) => ({
      ...result,
      text: results[d].results[i].text
    })),
    facets: domain.facets.map((facet, i) => ({
      ...facet,
      title: results[d].facets[i].title,
      text: results[d].facets[i].text
    }))
  }));

  try {
    const db = await connectToDatabase();
    const collection = db.collection('translations');
    await collection.insertOne({
      name,
      email,
      notes,
      results: translatedResultText
    });
    return translationSaved;
  } catch (error) {
    console.error(error);
    return translationFailed;
  }
};

export const generateSurveyTranslation = async (
  _: TranslationState,
  formData: FormData
): Promise<TranslationState> => {
  const choices = getChoices('en');
  const items = getItems('en');
  const parsed = surveyTranslationSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    notes: formData.get('notes'),
    choices: Object.fromEntries(
      choices.plus.map((choice) => [
        choice.score,
        formData.get(choice.score.toString())
      ])
    ),
    questions: Object.fromEntries(
      items.map((item) => [item.id, formData.get(item.id)])
    )
  });
  if (
    !parsed.success ||
    (await isRateLimited('translation', limits.translation))
  ) {
    return translationFailed;
  }

  const { name, email, notes, choices: choiceTexts, questions } = parsed.data;
  const translatedChoices = {
    plus: choices.plus.map((choice) => ({
      ...choice,
      text: choiceTexts[choice.score]
    })),
    minus: choices.minus.map((choice) => ({
      ...choice,
      text: choiceTexts[choice.score]
    }))
  };

  const translatedItems = items.map(({ choices: _choices, ...rest }) => ({
    ...rest,
    text: questions[rest.id]
  }));

  try {
    const db = await connectToDatabase();
    const collection = db.collection('translations');
    await collection.insertOne({
      name,
      email,
      notes,
      choices: translatedChoices,
      questions: translatedItems
    });
    return translationSaved;
  } catch (error) {
    console.error(error);
    return translationFailed;
  }
};
