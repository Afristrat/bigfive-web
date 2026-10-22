import { getItems } from '@bigfive-org/questions';
import { createElement, isValidElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import fr from '@/messages/fr.js';

// next-intl/server lit le catalogue français réel : une clé absente lève, ce qui
// attrape les fautes de frappe dans les noms de messages.
type Tree = { [key: string]: string | Tree };
vi.mock('next-intl/server', () => {
  const lookup = (namespace: string, key: string): string => {
    let node: string | Tree | undefined = (fr as Tree)[namespace];
    for (const part of key.split('.')) {
      node = typeof node === 'object' ? node[part] : undefined;
    }
    if (typeof node !== 'string')
      throw new Error(`Message absent ${namespace}.${key}`);
    return node;
  };
  const translator =
    (namespace: string) => (key: string, values?: Record<string, string>) =>
      lookup(namespace, key).replace(
        /\{(\w+)\}/g,
        (whole, name: string) => values?.[name] ?? whole
      );
  return {
    setRequestLocale: () => undefined,
    getTranslations: async (arg: string | { namespace: string }) => {
      const namespace = typeof arg === 'string' ? arg : arg.namespace;
      const t = translator(namespace) as ((
        key: string,
        values?: Record<string, string>
      ) => string) & { raw: (key: string) => string };
      t.raw = (key: string) => lookup(namespace, key);
      return t;
    }
  };
});

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
  redirect: (url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }
}));

vi.mock('@/navigation', () => ({
  Link: (props: { href: string; children?: unknown; className?: string }) =>
    createElement(
      'a',
      { href: props.href, className: props.className },
      props.children as never
    ),
  useRouter: () => ({ push: () => undefined })
}));

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const ID = '22222222-2222-4222-8222-222222222222';
const ID2 = '55555555-5555-4555-8555-555555555555';

const currentViewer = vi.fn();
const requireViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer(),
  requireViewer: (locale: string, path: string) => requireViewer(locale, path)
}));

const loadParticipationOuverte = vi.fn();
const loadParticipationsAPasser = vi.fn();
const loadTentative = vi.fn();
vi.mock('@/lib/passation-data', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/passation-data')>()),
  loadTentative: (viewer: unknown, id: string) => loadTentative(viewer, id),
  loadParticipationOuverte: (viewer: unknown, id: string) =>
    loadParticipationOuverte(viewer, id),
  loadParticipationsAPasser: (viewer: unknown) =>
    loadParticipationsAPasser(viewer)
}));

const submitParticipation = vi.fn();
const saveProgress = vi.fn();
vi.mock('@/actions/passation', () => ({
  submitParticipation: (id: string, result: unknown) =>
    submitParticipation(id, result),
  saveProgress: (id: string, revision: number, answers: unknown) =>
    saveProgress(id, revision, answers)
}));

const savePublicTest = vi.fn();
vi.mock('@/actions', () => ({
  savePublicTest: (result: unknown) => savePublicTest(result)
}));

// Le composant client est remplacé par un témoin : on lit ses props.
vi.mock('@/app/[locale]/test/survey', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/[locale]/test/survey')>()),
  Survey: function SurveyTemoin() {
    return null;
  }
}));

import PassationPage from '@/app/[locale]/mes-resultats/[participation]/questionnaire/page';
import TestPage from '@/app/[locale]/test/page';
import {
  Survey,
  effacerProgression,
  ecrireProgression,
  envoyerResultat,
  lireProgression,
  type StorageLike
} from '@/app/[locale]/test/survey';
import type { DbResult } from '@/types';

// --- Stockage factice -------------------------------------------------------
const stockage = (
  initial: Record<string, string> = {}
): StorageLike & { data: Map<string, string> } => {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k)
  };
};

const PROGRESSION = {
  answers: [{ id: 'q1', score: 3, domain: 'N', facet: 1 }],
  currentQuestionIndex: 1
};

describe('stockage local de la progression', () => {
  it('une clé connectée n’écrit jamais dans b5data ni dans inProgress', () => {
    const s = stockage();
    ecrireProgression(s, `b5:${ID}`, PROGRESSION);
    expect([...s.data.keys()]).toEqual([`b5:${ID}`]);
    expect(lireProgression(s, `b5:${ID}`)).toEqual(PROGRESSION);
  });

  it('la clé connectée ne lit pas l’ancienne progression publique', () => {
    const s = stockage({
      inProgress: 'true',
      b5data: JSON.stringify(PROGRESSION)
    });
    expect(lireProgression(s, `b5:${ID}`)).toBeNull();
    expect(s.data.has('b5data')).toBe(true);
  });

  it('la clé publique b5 relit une seule fois les anciennes clés puis les migre', () => {
    const s = stockage({
      inProgress: 'true',
      b5data: JSON.stringify(PROGRESSION)
    });
    expect(lireProgression(s, 'b5')).toEqual(PROGRESSION);
    expect(s.data.has('b5data')).toBe(false);
    expect(s.data.has('inProgress')).toBe(false);
    expect(lireProgression(s, 'b5')).toEqual(PROGRESSION);
  });

  it('ignore un contenu illisible ou de mauvaise forme', () => {
    expect(lireProgression(stockage({ b5: '{pas du json' }), 'b5')).toBeNull();
    expect(
      lireProgression(stockage({ b5: JSON.stringify({ answers: 3 }) }), 'b5')
    ).toBeNull();
    expect(lireProgression(stockage(), 'b5')).toBeNull();
  });

  it('effacerProgression ne vide que la clé demandée', () => {
    const s = stockage({ b5: '1', [`b5:${ID}`]: '2' });
    effacerProgression(s, `b5:${ID}`);
    expect([...s.data.keys()]).toEqual(['b5']);
  });
});

describe('envoi du questionnaire', () => {
  const result: DbResult = {
    testId: 'b5-120',
    lang: 'fr',
    invalid: false,
    timeElapsed: 10,
    dateStamp: new Date(),
    answers: []
  };

  it('en succès : vide la progression et renvoie l’adresse', async () => {
    const s = stockage({ [`b5:${ID}`]: JSON.stringify(PROGRESSION) });
    const sortie = await envoyerResultat(
      async () => ({ href: `/mes-resultats/${ID}` }),
      result,
      s,
      `b5:${ID}`
    );
    expect(sortie).toEqual({ href: `/mes-resultats/${ID}` });
    expect(s.data.size).toBe(0);
  });

  it('en succès public : retient l’identifiant du résultat', async () => {
    const s = stockage({ b5: JSON.stringify(PROGRESSION) });
    await envoyerResultat(
      async () => ({ href: '/result/0123456789abcdef01234567' }),
      result,
      s,
      'b5'
    );
    expect(s.data.get('resultId')).toBe('0123456789abcdef01234567');
    expect(s.data.has('b5')).toBe(false);
  });

  it('en succès connecté : ne pose pas resultId', async () => {
    const s = stockage();
    await envoyerResultat(
      async () => ({ href: `/mes-resultats/${ID}` }),
      result,
      s,
      `b5:${ID}`
    );
    expect(s.data.has('resultId')).toBe(false);
  });

  it.each(['closed', 'already', 'conflict', 'failed'] as const)(
    'erreur %s : la progression locale est conservée',
    async (error) => {
      const s = stockage({ [`b5:${ID}`]: JSON.stringify(PROGRESSION) });
      const sortie = await envoyerResultat(
        async () => ({ error }),
        result,
        s,
        `b5:${ID}`
      );
      expect(sortie).toEqual({ error });
      expect(s.data.has(`b5:${ID}`)).toBe(true);
    }
  );

  it('une action qui lève donne failed et conserve la progression', async () => {
    const s = stockage({ b5: JSON.stringify(PROGRESSION) });
    const sortie = await envoyerResultat(
      async () => {
        throw new Error('réseau');
      },
      result,
      s,
      'b5'
    );
    expect(sortie).toEqual({ error: 'failed' });
    expect(s.data.has('b5')).toBe(true);
  });
});

// --- Pages -------------------------------------------------------------------
const trouver = (noeud: unknown, type: unknown): ReactElement | null => {
  if (Array.isArray(noeud)) {
    for (const enfant of noeud) {
      const trouve = trouver(enfant, type);
      if (trouve) return trouve;
    }
    return null;
  }
  if (!isValidElement(noeud)) return null;
  if (noeud.type === type) return noeud;
  const props = noeud.props as { children?: unknown };
  return trouver(props.children, type);
};

const html = (element: unknown): string =>
  renderToStaticMarkup(element as ReactElement);

const participation = (over: Record<string, unknown> = {}) => ({
  participationId: ID,
  campagneId: '44444444-4444-4444-8444-444444444444',
  campagneTitre: 'Équipe commerciale',
  campagneStatut: 'ouverte',
  organisationNom: 'Acme',
  organisationSlug: 'acme',
  statut: 'ouverte',
  ...over
});

beforeEach(() => {
  currentViewer.mockReset().mockResolvedValue({ status: 'anonymous' });
  requireViewer.mockReset().mockResolvedValue(VIEWER);
  loadParticipationOuverte.mockReset().mockResolvedValue(participation());
  loadParticipationsAPasser.mockReset().mockResolvedValue([]);
  submitParticipation.mockReset();
  saveProgress.mockReset();
  loadTentative.mockReset().mockResolvedValue(null);
  savePublicTest.mockReset();
});

describe('page /test (parcours public)', () => {
  const rendre = async () =>
    TestPage({ params: Promise.resolve({ locale: 'fr' }) });

  it('reste publique : savePublicTest et la clé b5, aucun encart', async () => {
    const page = await rendre();
    const survey = trouver(page, Survey);
    expect(survey).not.toBeNull();
    const props = survey?.props as {
      storageKey: string;
      onSubmit: unknown;
    };
    expect(props.storageKey).toBe('b5');
    props.onSubmit && (await (props.onSubmit as (r: unknown) => unknown)({}));
    expect(savePublicTest).toHaveBeenCalledTimes(1);
    expect(loadParticipationsAPasser).not.toHaveBeenCalled();
    expect(html(page)).not.toContain('questionnaire à passer');
  });

  it('personne connectée avec une participation ouverte : encart vers sa passation', async () => {
    currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
    loadParticipationsAPasser.mockResolvedValue([
      participation(),
      participation({ participationId: ID2, organisationNom: 'Beta' })
    ]);
    const sortie = html(await rendre());
    expect(sortie).toContain('Vous avez un questionnaire à passer pour Acme');
    expect(sortie).toContain('Vous avez un questionnaire à passer pour Beta');
    expect(sortie).toContain(`href="/mes-resultats/${ID}/questionnaire"`);
    expect(sortie).toContain(`href="/mes-resultats/${ID2}/questionnaire"`);
    expect(loadParticipationsAPasser).toHaveBeenCalledWith(VIEWER);
  });

  it('connectée sans participation à passer : pas d’encart', async () => {
    currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
    expect(html(await rendre())).not.toContain('questionnaire à passer');
  });

  it('une panne de lecture ne casse jamais la page publique', async () => {
    currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
    loadParticipationsAPasser.mockRejectedValue(new Error('passerelle'));
    const page = await rendre();
    expect(trouver(page, Survey)).not.toBeNull();
    expect(html(page)).not.toContain('questionnaire à passer');
    currentViewer.mockRejectedValue(new Error('passerelle'));
    expect(trouver(await rendre(), Survey)).not.toBeNull();
  });

  it('session à renouveler : traitée comme anonyme, aucun encart', async () => {
    currentViewer.mockResolvedValue({ status: 'refresh' });
    await rendre();
    expect(loadParticipationsAPasser).not.toHaveBeenCalled();
  });
});

describe('page de passation connectée', () => {
  const rendre = async (participationId = ID) =>
    PassationPage({
      params: Promise.resolve({ locale: 'fr', participation: participationId })
    });

  it('participation d’un autre compte (absente de mes_resultats) : 404', async () => {
    loadParticipationOuverte.mockResolvedValue(null);
    await expect(rendre()).rejects.toThrow('NOT_FOUND');
  });

  it('identifiant qui n’est pas un uuid : 404 sans lecture en base', async () => {
    await expect(rendre('../etc')).rejects.toThrow('NOT_FOUND');
    expect(loadParticipationOuverte).not.toHaveBeenCalled();
  });

  it('sans connexion, passe par requireViewer avec le chemin sans langue', async () => {
    await rendre();
    expect(requireViewer).toHaveBeenCalledWith(
      'fr',
      `/mes-resultats/${ID}/questionnaire`
    );
  });

  it('participation terminée : redirection vers /mes-resultats/<id>', async () => {
    loadParticipationOuverte.mockResolvedValue(
      participation({ statut: 'terminee' })
    );
    await expect(rendre()).rejects.toThrow(`REDIRECT:/fr/mes-resultats/${ID}`);
  });

  it.each(['close', 'brouillon'])(
    'campagne %s : message, pas de questionnaire',
    async (campagneStatut) => {
      loadParticipationOuverte.mockResolvedValue(
        participation({ campagneStatut })
      );
      const page = await rendre();
      expect(trouver(page, Survey)).toBeNull();
      expect(html(page)).toContain('n’est plus ouverte');
    }
  );

  it('participation ouverte : Survey sur la clé b5:<participation>', async () => {
    const page = await rendre();
    const survey = trouver(page, Survey);
    expect(survey).not.toBeNull();
    const props = survey?.props as {
      storageKey: string;
      onSubmit: (r: unknown) => Promise<unknown>;
    };
    expect(props.storageKey).toBe(`b5:${ID}`);
    expect(html(page)).toContain('Acme');
  });

  it.each([
    [{ status: 'closed' }, { error: 'closed' }],
    [{ status: 'already' }, { error: 'already' }],
    [{ status: 'invalid' }, { error: 'failed' }],
    [{ status: 'forbidden' }, { error: 'failed' }],
    [{ status: 'failed' }, { error: 'failed' }],
    [
      { status: 'ok', href: `/mes-resultats/${ID}` },
      { href: `/mes-resultats/${ID}` }
    ]
  ])('onSubmit traduit %j en %j', async (issue, attendu) => {
    submitParticipation.mockResolvedValue(issue);
    const survey = trouver(await rendre(), Survey);
    const props = survey?.props as {
      onSubmit: (r: unknown) => Promise<unknown>;
    };
    const charge = { testId: 'b5-120' };
    expect(await props.onSubmit(charge)).toEqual(attendu);
    expect(submitParticipation).toHaveBeenCalledWith(ID, charge);
  });
});

describe('page de passation connectée : progression sur le serveur', () => {
  type PageProps = {
    initial?: { answers: unknown[]; index: number; revision: number };
    onProgress?: (
      answers: unknown[],
      revision: number
    ) => Promise<Record<string, unknown>>;
    labels: { resumed?: string; errorTexts?: Record<string, string> };
  };
  const proprietes = async (): Promise<PageProps> => {
    const page = await PassationPage({
      params: Promise.resolve({ locale: 'fr', participation: ID })
    });
    return trouver(page, Survey)?.props as PageProps;
  };
  const premiere = getItems('en')[0];

  it('sans sauvegarde serveur : pas de reprise, onProgress câblé', async () => {
    const props = await proprietes();
    expect(props.initial).toBeUndefined();
    expect(typeof props.onProgress).toBe('function');
    expect(loadTentative).toHaveBeenCalledWith(VIEWER, ID);
  });

  it('avec une tentative serveur : initial reprend réponses, écran et révision', async () => {
    loadTentative.mockResolvedValue({
      revision: 4,
      reponses: { [premiere.id]: 4 }
    });
    const props = await proprietes();
    expect(props.initial?.revision).toBe(4);
    expect(props.initial?.index).toBe(1);
    expect(props.initial?.answers).toEqual([
      {
        id: premiere.id,
        score: 4,
        domain: premiere.domain,
        facet: premiere.facet
      }
    ]);
    expect(props.labels.resumed).toContain('enregistrées sur votre compte');
    expect(props.labels.errorTexts?.conflictReloaded).toContain(
      'dernière version'
    );
  });

  it('une lecture de la tentative en panne n’empêche pas la passation', async () => {
    loadTentative.mockRejectedValue(new Error('passerelle'));
    const props = await proprietes();
    expect(props.initial).toBeUndefined();
    expect(typeof props.onProgress).toBe('function');
  });

  const reponses = [{ id: premiere.id, score: 3 }];

  it.each([
    [{ status: 'ok', revision: 2 }, { revision: 2 }],
    [{ status: 'closed' }, { error: 'closed' }],
    [{ status: 'invalid' }, { error: 'failed' }],
    [{ status: 'failed' }, { error: 'failed' }]
  ])('onProgress traduit %j en %j', async (issue, attendu) => {
    saveProgress.mockResolvedValue(issue);
    const props = await proprietes();
    expect(await props.onProgress?.(reponses, 1)).toEqual(attendu);
    expect(saveProgress).toHaveBeenCalledWith(ID, 1, reponses);
  });

  it('onProgress : un conflit rend la reprise construite depuis la tentative serveur', async () => {
    saveProgress.mockResolvedValue({
      status: 'conflict',
      revision: 6,
      reponses: { [premiere.id]: 5 }
    });
    const props = await proprietes();
    expect(await props.onProgress?.(reponses, 1)).toEqual({
      error: 'conflict',
      reprise: {
        answers: [
          {
            id: premiere.id,
            score: 5,
            domain: premiere.domain,
            facet: premiere.facet
          }
        ],
        index: 1,
        revision: 6
      }
    });
  });

  it('page publique /test : aucun onProgress, aucune reprise, aucune lecture de tentative', async () => {
    const page = await TestPage({ params: Promise.resolve({ locale: 'fr' }) });
    const props = trouver(page, Survey)?.props as PageProps;
    expect(props.onProgress).toBeUndefined();
    expect(props.initial).toBeUndefined();
    expect(loadTentative).not.toHaveBeenCalled();
    expect(saveProgress).not.toHaveBeenCalled();
  });
});
