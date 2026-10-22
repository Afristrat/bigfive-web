import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getItems } from '@bigfive-org/questions';
import { calculerScores } from '@/lib/moteur';

// Le client Supabase est remplacé : seul compte ce que le chargeur lui demande.
// Les fonctions de rappel appliquent le schéma zod du chargeur, comme le vrai
// client, pour que la forme des réponses soit éprouvée.
const reponsesRpc = vi.fn();
const reponsesSelect = vi.fn();
const appels: { fn: string; args: Record<string, unknown> }[] = [];
const requetes: { table: string; query: string }[] = [];
const jetons: string[] = [];

vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: (jeton: string) => {
    jetons.push(jeton);
    return {
      rpc: async (
        fn: string,
        args: Record<string, unknown>,
        schema: { parse: (v: unknown) => unknown }
      ) => {
        appels.push({ fn, args });
        return schema.parse(await reponsesRpc(fn, args));
      },
      select: async (
        table: string,
        query: string,
        schema: { parse: (v: unknown) => unknown }
      ) => {
        requetes.push({ table, query });
        return schema.parse(await reponsesSelect(table, query));
      }
    };
  }
}));

import {
  loadCampagneOrganisation,
  loadResultatIndividuel,
  loadResultatsCampagne,
  peutLireResultats
} from '@/lib/consultant-data';
import { GatewayError } from '@/lib/supabase/server';

const viewer = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'consultant@tenga.test',
  accessToken: 'jeton.de.la.personne'
};
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';
const PARTICIPATION = '44444444-4444-4444-8444-444444444444';
const ORGANISATION = '22222222-2222-4222-8222-222222222222';

const items = getItems('en');
const scores = calculerScores(
  Object.fromEntries(items.map((item) => [item.id, 3])),
  600
);

const ligneLecture = (
  surcharge: Record<string, unknown> = {}
): Record<string, unknown> => ({
  participation_id: PARTICIPATION,
  campaign_id: CAMPAGNE,
  organization_id: ORGANISATION,
  reponses: { SENTINELLE_REPONSES: 5 },
  scores,
  questionnaire_version: 'b5-120-ma-2026-10',
  calcul_version: 'tenga-somme-1',
  soumis_le: '2026-10-20T10:00:00+00:00',
  ...surcharge
});

beforeEach(() => {
  reponsesRpc.mockReset();
  reponsesSelect.mockReset();
  appels.length = 0;
  requetes.length = 0;
  jetons.length = 0;
});

describe('loadResultatsCampagne : liste par la fonction app.lister_resultats_campagne', () => {
  it('appelle la fonction avec l’identité de la personne et rend les lignes dans l’ordre reçu', async () => {
    reponsesRpc.mockResolvedValue([
      { participation_id: PARTICIPATION, soumis_le: '2026-10-20T10:00:00Z' },
      {
        participation_id: '55555555-5555-4555-8555-555555555555',
        soumis_le: '2026-10-21T10:00:00Z'
      }
    ]);
    const liste = await loadResultatsCampagne(viewer, CAMPAGNE);
    expect(appels).toEqual([
      { fn: 'lister_resultats_campagne', args: { p_campagne: CAMPAGNE } }
    ]);
    expect(jetons).toEqual([viewer.accessToken]);
    expect(liste).toEqual([
      { participationId: PARTICIPATION, soumisLe: '2026-10-20T10:00:00Z' },
      {
        participationId: '55555555-5555-4555-8555-555555555555',
        soumisLe: '2026-10-21T10:00:00Z'
      }
    ]);
    expect(requetes).toEqual([]);
  });

  it('une campagne sans résultat donne une liste vide', async () => {
    reponsesRpc.mockResolvedValue([]);
    expect(await loadResultatsCampagne(viewer, CAMPAGNE)).toEqual([]);
  });

  it('refus de la base (403) : null, jamais une liste vide', async () => {
    reponsesRpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await loadResultatsCampagne(viewer, CAMPAGNE)).toBeNull();
  });

  it('une panne de la passerelle n’est pas avalée', async () => {
    reponsesRpc.mockRejectedValue(new GatewayError(500, null));
    await expect(loadResultatsCampagne(viewer, CAMPAGNE)).rejects.toThrow(
      GatewayError
    );
  });

  it('identifiant hors format : refus avant toute requête', async () => {
    await expect(
      loadResultatsCampagne(viewer, "x' or 1=1 --")
    ).rejects.toThrow();
    expect(appels).toEqual([]);
    expect(jetons).toEqual([]);
  });

  it('ne renvoie aucune identité : rien que l’identifiant opaque et la date', async () => {
    reponsesRpc.mockResolvedValue([
      {
        participation_id: PARTICIPATION,
        soumis_le: '2026-10-20T10:00:00Z',
        email: 'nom@exemple.test',
        user_id: viewer.id
      }
    ]);
    const liste = await loadResultatsCampagne(viewer, CAMPAGNE);
    expect(Object.keys(liste?.[0] ?? {}).sort()).toEqual([
      'participationId',
      'soumisLe'
    ]);
  });
});

describe('loadResultatIndividuel : lecture journalisée par app.lire_resultat_individuel', () => {
  it('appelle la fonction et jamais un select sur results', async () => {
    reponsesRpc.mockResolvedValue([ligneLecture()]);
    const lu = await loadResultatIndividuel(viewer, PARTICIPATION);
    expect(appels).toEqual([
      {
        fn: 'lire_resultat_individuel',
        args: { p_participation: PARTICIPATION }
      }
    ]);
    expect(requetes).toEqual([]);
    expect(jetons).toEqual([viewer.accessToken]);
    expect(lu).toMatchObject({
      participationId: PARTICIPATION,
      campagneId: CAMPAGNE,
      organisationId: ORGANISATION,
      soumisLe: '2026-10-20T10:00:00+00:00',
      questionnaireVersion: 'b5-120-ma-2026-10',
      calculVersion: 'tenga-somme-1'
    });
    expect(lu?.scores).toEqual(scores);
  });

  it('les réponses brutes ne sortent jamais du chargeur', async () => {
    reponsesRpc.mockResolvedValue([ligneLecture()]);
    const lu = await loadResultatIndividuel(viewer, PARTICIPATION);
    expect(JSON.stringify(lu)).not.toContain('SENTINELLE_REPONSES');
    expect(Object.keys(lu ?? {})).not.toContain('reponses');
  });

  it('format de scores illisible : scores null, la lecture reste possible', async () => {
    reponsesRpc.mockResolvedValue([ligneLecture({ scores: { N: 1 } })]);
    const lu = await loadResultatIndividuel(viewer, PARTICIPATION);
    expect(lu).not.toBeNull();
    expect(lu?.scores).toBeNull();
  });

  it('refus de la base (403) : null', async () => {
    reponsesRpc.mockRejectedValue(new GatewayError(403, '42501'));
    expect(await loadResultatIndividuel(viewer, PARTICIPATION)).toBeNull();
  });

  it('connexion refusée (401) : null', async () => {
    reponsesRpc.mockRejectedValue(new GatewayError(401, '42501'));
    expect(await loadResultatIndividuel(viewer, PARTICIPATION)).toBeNull();
  });

  it('aucune ligne rendue : null', async () => {
    reponsesRpc.mockResolvedValue([]);
    expect(await loadResultatIndividuel(viewer, PARTICIPATION)).toBeNull();
  });

  it('une panne de la passerelle n’est pas avalée', async () => {
    reponsesRpc.mockRejectedValue(new GatewayError(502, null));
    await expect(loadResultatIndividuel(viewer, PARTICIPATION)).rejects.toThrow(
      GatewayError
    );
  });

  it('identifiant hors format : refus avant toute requête', async () => {
    await expect(
      loadResultatIndividuel(viewer, 'pas-un-uuid')
    ).rejects.toThrow();
    expect(appels).toEqual([]);
  });
});

describe('loadCampagneOrganisation : la campagne appartient bien à l’organisation de l’URL', () => {
  it('filtre par identifiant ET organisation, lit campaigns seule', async () => {
    reponsesSelect.mockResolvedValue([
      { id: CAMPAGNE, titre: 'Cohorte 1', statut: 'close' }
    ]);
    const campagne = await loadCampagneOrganisation(
      viewer,
      ORGANISATION,
      CAMPAGNE
    );
    expect(campagne).toEqual({ id: CAMPAGNE, titre: 'Cohorte 1' });
    expect(requetes).toEqual([
      {
        table: 'campaigns',
        query: `id=eq.${CAMPAGNE}&organization_id=eq.${ORGANISATION}&select=id,titre,statut`
      }
    ]);
  });

  it('campagne absente ou d’une autre organisation : null', async () => {
    reponsesSelect.mockResolvedValue([]);
    expect(
      await loadCampagneOrganisation(viewer, ORGANISATION, CAMPAGNE)
    ).toBeNull();
  });

  it('identifiants hors format : refus avant toute requête', async () => {
    await expect(
      loadCampagneOrganisation(viewer, ORGANISATION, 'a&b=c')
    ).rejects.toThrow();
    await expect(
      loadCampagneOrganisation(viewer, 'a&b=c', CAMPAGNE)
    ).rejects.toThrow();
    expect(requetes).toEqual([]);
  });
});

describe('peutLireResultats : miroir de la règle de la base', () => {
  it.each([
    [{ isAdmin: true, role: null }, true],
    [{ isAdmin: false, role: 'consultant' as const }, true],
    [{ isAdmin: false, role: 'responsable' as const }, false],
    [{ isAdmin: false, role: 'participant' as const }, false],
    [{ isAdmin: false, role: null }, false]
  ])('%j donne %s', (lecteur, attendu) => {
    expect(peutLireResultats(lecteur)).toBe(attendu);
  });
});

describe('source du chargeur : aucun accès direct aux résultats', () => {
  const source = readFileSync(
    fileURLToPath(new URL('../../src/lib/consultant-data.ts', import.meta.url)),
    'utf8'
  );

  it('ne lit ni results, ni participations, ni attempts, ni les réponses', () => {
    expect(source).not.toMatch(/select\(\s*'results'/);
    expect(source).not.toMatch(/'results'\s*,/);
    expect(source).not.toMatch(/\/results/);
    expect(source).not.toMatch(/participations\?/);
    expect(source).not.toMatch(/'participations'/);
    expect(source).not.toMatch(/'attempts'/);
    expect(source).not.toMatch(/reponses/);
  });

  it('passe par les deux fonctions de la base et par elles seules', () => {
    expect(source).toContain("'lister_resultats_campagne'");
    expect(source).toContain("'lire_resultat_individuel'");
    expect(source).not.toMatch(/serviceClient/);
  });
});
