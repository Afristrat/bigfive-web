import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Relevé du réseau réel : actions (informer, consentir, répondre, retirer) et
// chargeurs (mes_releves_reseau, reseau_releve, reseau_lire). Contrat : §2 de
// contrat-reseau.md. La base décide de tout ; ces modules valident les entrées,
// lisent les réponses avec des schémas stricts et traduisent les refus.

type Parser = { parse: (value: unknown) => unknown };

const VIEWER = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'participant@client.test',
  accessToken: 'aaaa.bbbb.cccc'
};
const PART = '66666666-6666-4666-8666-666666666666';
const M1 = '77777777-7777-4777-8777-777777777771';
const M2 = '77777777-7777-4777-8777-777777777772';
const CAMPAGNE = '33333333-3333-4333-8333-333333333333';
const GROUPE = '44444444-4444-4444-8444-444444444444';

const currentViewer = vi.fn();
vi.mock('@/lib/session', () => ({
  currentViewer: () => currentViewer()
}));

const rpc = vi.fn();
const select = vi.fn();
vi.mock('@/lib/supabase/server', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/supabase/server')>()),
  userClient: () => ({
    rpc: async (fn: string, args: unknown, schema: Parser) =>
      schema.parse(await rpc(fn, args)),
    select: async (...args: unknown[]) => select(...args)
  })
}));

import {
  consentirReseau,
  informerReseau,
  repondreReseau,
  retirerReseau
} from '@/actions/reseau';
import {
  loadMesRelevesReseau,
  loadMesRelevesReseauOuVide,
  loadReleveReseau,
  loadReseauCampagne,
  parseParticipationReseau
} from '@/lib/reseau-data';
import { GatewayError } from '@/lib/supabase/server';

const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

beforeEach(() => {
  currentViewer.mockReset();
  currentViewer.mockResolvedValue({ status: 'ok', viewer: VIEWER });
  rpc.mockReset();
  select.mockReset();
  warn.mockClear();
});

const ERREURS: [string, string][] = [
  ['55000', 'closed'],
  ['P0002', 'notfound'],
  ['42501', 'forbidden'],
  ['22023', 'invalid']
];

// ---------------------------------------------------------------------------
// Actions.

describe('informerReseau : information préalable et opposition', () => {
  it('session absente ou expirée : reconnexion, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await informerReseau(PART, false)).toEqual({
      status: 'reconnexion'
    });
    currentViewer.mockResolvedValue({ status: 'refresh' });
    expect(await informerReseau(PART, true)).toEqual({
      status: 'reconnexion'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('jeton refusé en cours d’action (401) : reconnexion, pas un échec', async () => {
    rpc.mockRejectedValue(new GatewayError(401, null));
    expect(await informerReseau(PART, false)).toEqual({
      status: 'reconnexion'
    });
    expect(warn).not.toHaveBeenCalled();
  });

  it('participation hors format ou opposition non booléenne : invalid, aucun appel', async () => {
    expect(await informerReseau('x', false)).toEqual({ status: 'invalid' });
    expect(await informerReseau(PART, 'oui' as unknown as boolean)).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('« j’ai lu » sans opposition : reseau_informer(false), rend « informe »', async () => {
    rpc.mockResolvedValue('informe');
    expect(await informerReseau(PART, false)).toEqual({ status: 'informe' });
    expect(rpc).toHaveBeenCalledWith('reseau_informer', {
      p_participation: PART,
      p_opposition: false
    });
  });

  it('opposition : reseau_informer(true), rend « oppose »', async () => {
    rpc.mockResolvedValue('oppose');
    expect(await informerReseau(PART, true)).toEqual({ status: 'oppose' });
    expect(rpc).toHaveBeenCalledWith('reseau_informer', {
      p_participation: PART,
      p_opposition: true
    });
  });

  it.each(ERREURS)('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await informerReseau(PART, false)).toEqual({ status });
  });

  it('panne ou réponse inattendue : failed, journal sans identifiant', async () => {
    rpc.mockRejectedValue(new GatewayError(502, null));
    expect(await informerReseau(PART, false)).toEqual({ status: 'failed' });
    rpc.mockResolvedValue('autre');
    expect(await informerReseau(PART, false)).toEqual({ status: 'failed' });
    const journal = warn.mock.calls.map((c) => String(c[0])).join(' ');
    expect(journal).toContain('reseau.action_failed');
    expect(journal).not.toContain(PART);
    expect(journal).not.toContain(VIEWER.email);
  });
});

describe('consentirReseau : deux accords distincts', () => {
  it('sans session : reconnexion, aucun appel', async () => {
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await consentirReseau(PART, true, false)).toEqual({
      status: 'reconnexion'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('transmet les deux accords tels quels', async () => {
    rpc.mockResolvedValue('enregistre');
    expect(await consentirReseau(PART, true, false)).toEqual({
      status: 'enregistre'
    });
    expect(rpc).toHaveBeenCalledWith('reseau_consentir', {
      p_participation: PART,
      p_repondre: true,
      p_carte: false
    });
    await consentirReseau(PART, false, true);
    expect(rpc).toHaveBeenLastCalledWith('reseau_consentir', {
      p_participation: PART,
      p_repondre: false,
      p_carte: true
    });
  });

  it('accord non booléen : invalid, aucun appel', async () => {
    expect(await consentirReseau(PART, 1 as unknown as boolean, false)).toEqual(
      { status: 'invalid' }
    );
    expect(
      await consentirReseau(PART, true, undefined as unknown as boolean)
    ).toEqual({ status: 'invalid' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(ERREURS)('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await consentirReseau(PART, true, true)).toEqual({ status });
  });
});

describe('repondreReseau : enregistrement unique de la liste', () => {
  const reponses = [
    { cite: M1, lien: 'conseil', valeur: 4 },
    { cite: M1, lien: 'confiance', valeur: 3 },
    { cite: M2, lien: 'dependance', valeur: 0 }
  ] as const;

  it('un seul appel, toutes les réponses, rend « repondu »', async () => {
    rpc.mockResolvedValue(3);
    expect(await repondreReseau(PART, [...reponses])).toEqual({
      status: 'repondu'
    });
    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith('reseau_repondre', {
      p_participation: PART,
      p_reponses: reponses
    });
  });

  it('les champs en trop sont retirés avant l’envoi', async () => {
    rpc.mockResolvedValue(1);
    await repondreReseau(PART, [
      { cite: M1, lien: 'conseil', valeur: 2, nom: 'Karim' } as never
    ]);
    expect(rpc).toHaveBeenCalledWith('reseau_repondre', {
      p_participation: PART,
      p_reponses: [{ cite: M1, lien: 'conseil', valeur: 2 }]
    });
  });

  it.each([
    ['liste vide', []],
    ['pas une liste', 'conseil' as never],
    ['lien inconnu', [{ cite: M1, lien: 'bloque', valeur: 1 }]],
    ['fréquence hors échelle', [{ cite: M1, lien: 'conseil', valeur: 5 }]],
    ['confiance hors échelle', [{ cite: M1, lien: 'confiance', valeur: 4 }]],
    ['valeur non entière', [{ cite: M1, lien: 'conseil', valeur: 1.5 }]],
    ['personne citée hors format', [{ cite: 'x', lien: 'conseil', valeur: 1 }]],
    ['se citer soi-même', [{ cite: PART, lien: 'conseil', valeur: 1 }]],
    [
      'doublon (personne, lien)',
      [
        { cite: M1, lien: 'conseil', valeur: 1 },
        { cite: M1, lien: 'conseil', valeur: 2 }
      ]
    ]
  ])('%s : invalid, aucun appel', async (_, liste) => {
    expect(await repondreReseau(PART, liste as never)).toEqual({
      status: 'invalid'
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each(ERREURS)('code SQL %s : %s', async (code, status) => {
    rpc.mockRejectedValue(new GatewayError(400, code));
    expect(await repondreReseau(PART, [...reponses])).toEqual({ status });
  });

  it('un nombre illisible en retour : failed', async () => {
    rpc.mockResolvedValue('trois');
    expect(await repondreReseau(PART, [...reponses])).toEqual({
      status: 'failed'
    });
  });
});

describe('retirerReseau : retrait à tout moment', () => {
  it('appelle reseau_retirer et rend « retire »', async () => {
    rpc.mockResolvedValue(8);
    expect(await retirerReseau(PART)).toEqual({ status: 'retire' });
    expect(rpc).toHaveBeenCalledWith('reseau_retirer', {
      p_participation: PART
    });
  });

  it('sans session ou hors format : aucun appel', async () => {
    expect(await retirerReseau('x')).toEqual({ status: 'invalid' });
    currentViewer.mockResolvedValue({ status: 'anonymous' });
    expect(await retirerReseau(PART)).toEqual({ status: 'reconnexion' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it('P0002 : notfound', async () => {
    rpc.mockRejectedValue(new GatewayError(400, 'P0002'));
    expect(await retirerReseau(PART)).toEqual({ status: 'notfound' });
  });

  it('le résultat ne contient ni jeton, ni adresse, ni identifiant', async () => {
    rpc.mockResolvedValue(2);
    const sortie = JSON.stringify(await retirerReseau(PART));
    expect(sortie).not.toContain(VIEWER.accessToken);
    expect(sortie).not.toContain(VIEWER.email);
    expect(sortie).not.toContain(PART);
  });
});

// ---------------------------------------------------------------------------
// Chargeurs.

const ligneMes = (surcharge: Record<string, unknown> = {}) => ({
  participation_id: PART,
  organisation_nom: 'Acme',
  campagne_titre: 'Cohorte 1',
  campagne_statut: 'ouverte',
  ...surcharge
});

describe('loadMesRelevesReseau : app.mes_releves_reseau', () => {
  it('appelle la fonction sans argument et met en forme', async () => {
    rpc.mockResolvedValue([ligneMes()]);
    expect(await loadMesRelevesReseau(VIEWER)).toEqual([
      {
        participationId: PART,
        organisationNom: 'Acme',
        campagneTitre: 'Cohorte 1',
        campagneStatut: 'ouverte'
      }
    ]);
    expect(rpc).toHaveBeenCalledWith('mes_releves_reseau', {});
  });

  it('interrupteur fermé : aucune ligne', async () => {
    rpc.mockResolvedValue([]);
    expect(await loadMesRelevesReseau(VIEWER)).toEqual([]);
  });

  it('statut inconnu ou clé en trop : refusé (schéma strict)', async () => {
    rpc.mockResolvedValue([ligneMes({ campagne_statut: 'bientot' })]);
    await expect(loadMesRelevesReseau(VIEWER)).rejects.toThrow();
    rpc.mockResolvedValue([ligneMes({ email: 'x@y.z' })]);
    await expect(loadMesRelevesReseau(VIEWER)).rejects.toThrow();
  });
});

describe('loadMesRelevesReseauOuVide : bloc secondaire, jamais bloquant', () => {
  it('rend les lignes quand la base répond', async () => {
    rpc.mockResolvedValue([ligneMes()]);
    expect(await loadMesRelevesReseauOuVide(VIEWER)).toHaveLength(1);
  });

  it('panne ou fonction absente : liste vide et trace sans identifiant', async () => {
    rpc.mockRejectedValue(new GatewayError(404, 'PGRST202'));
    expect(await loadMesRelevesReseauOuVide(VIEWER)).toEqual([]);
    expect(warn).toHaveBeenCalledWith(
      JSON.stringify({ event: 'reseau.liste_indisponible' })
    );
  });
});

const releveOuvert = (surcharge: Record<string, unknown> = {}) => ({
  ouvert: true,
  campagne_ouverte: true,
  moi: {
    informe_le: '2026-10-23T09:00:00Z',
    oppose_le: null,
    accord_repondre_le: '2026-10-23T09:05:00Z',
    accord_carte_le: null
  },
  membres: [
    { participation_id: M1, nom: 'Karim B.' },
    { participation_id: M2, nom: null }
  ],
  reponses: [{ cite: M1, lien: 'conseil', valeur: 3 }],
  ...surcharge
});

describe('parseParticipationReseau', () => {
  it('rend la forme canonique d’un uuid, null sinon', () => {
    expect(parseParticipationReseau(PART)).toBe(PART);
    expect(parseParticipationReseau('x')).toBeNull();
    expect(parseParticipationReseau(undefined)).toBeNull();
  });
});

describe('loadReleveReseau : app.reseau_releve', () => {
  it('identifiant hors format : lève avant toute requête', async () => {
    await expect(loadReleveReseau(VIEWER, 'x')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });

  it('interrupteur fermé : null (donc 404)', async () => {
    rpc.mockResolvedValue({ ouvert: false });
    expect(await loadReleveReseau(VIEWER, PART)).toBeNull();
    expect(rpc).toHaveBeenCalledWith('reseau_releve', {
      p_participation: PART
    });
    expect(select).not.toHaveBeenCalled();
  });

  it('relevé ouvert : met en forme sans rien ajouter', async () => {
    rpc.mockResolvedValue(releveOuvert());
    expect(await loadReleveReseau(VIEWER, PART)).toEqual({
      campagneOuverte: true,
      moi: {
        informeLe: '2026-10-23T09:00:00Z',
        opposeLe: null,
        accordRepondreLe: '2026-10-23T09:05:00Z',
        accordCarteLe: null
      },
      membres: [
        { participationId: M1, nom: 'Karim B.' },
        { participationId: M2, nom: null }
      ],
      reponses: [{ cite: M1, lien: 'conseil', valeur: 3 }]
    });
  });

  it('pas encore informé : moi null, membres vides', async () => {
    rpc.mockResolvedValue(
      releveOuvert({ moi: null, membres: [], reponses: [] })
    );
    const lu = await loadReleveReseau(VIEWER, PART);
    expect(lu?.moi).toBeNull();
    expect(lu?.membres).toEqual([]);
  });

  it.each([
    ['clé en trop à la racine', releveOuvert({ responsable: true })],
    [
      'clé en trop dans un membre',
      releveOuvert({
        membres: [{ participation_id: M1, nom: 'K', email: 'k@x.y' }]
      })
    ],
    ['clé en trop quand fermé', { ouvert: false, membres: [] }],
    [
      'confiance hors échelle',
      releveOuvert({
        reponses: [{ cite: M1, lien: 'confiance', valeur: 4 }]
      })
    ],
    [
      'lien inconnu',
      releveOuvert({
        reponses: [{ cite: M1, lien: 'bloque', valeur: 1 }]
      })
    ],
    [
      'moi sans date d’information',
      releveOuvert({
        moi: {
          informe_le: null,
          oppose_le: null,
          accord_repondre_le: null,
          accord_carte_le: null
        }
      })
    ]
  ])('%s : refusé (lève, jamais un affichage au hasard)', async (_, corps) => {
    rpc.mockResolvedValue(corps);
    await expect(loadReleveReseau(VIEWER, PART)).rejects.toThrow();
  });

  it.each([
    ['P0002 : pas à moi ou inexistante', new GatewayError(400, 'P0002')],
    ['42501', new GatewayError(403, '42501')],
    ['55000', new GatewayError(400, '55000')],
    ['401', new GatewayError(401, null)],
    ['403 sans code', new GatewayError(403, null)]
  ])('%s : null, donc 404', async (_, erreur) => {
    rpc.mockRejectedValue(erreur);
    expect(await loadReleveReseau(VIEWER, PART)).toBeNull();
  });

  it('une panne de la passerelle n’est pas avalée', async () => {
    rpc.mockRejectedValue(new GatewayError(502, null));
    await expect(loadReleveReseau(VIEWER, PART)).rejects.toThrow();
  });
});

const lecture = () => ({
  campagne_id: CAMPAGNE,
  campagne_statut: 'ouverte',
  groupes: [
    {
      groupe_id: GROUPE,
      nom: 'Équipe Atlas',
      effectif: 5,
      membres: [
        {
          participation_id: PART,
          nom: 'Amine M.',
          informe: true,
          oppose: false,
          accord_repondre: true,
          accord_carte: true,
          a_repondu: true
        },
        {
          participation_id: M1,
          nom: 'Karim B.',
          informe: true,
          oppose: true,
          accord_repondre: false,
          accord_carte: false,
          a_repondu: false
        },
        {
          participation_id: M2,
          nom: null,
          informe: true,
          oppose: false,
          accord_repondre: true,
          accord_carte: false,
          a_repondu: true
        }
      ],
      reponses: [{ de: PART, vers: M2, lien: 'conseil', valeur: 2 }]
    }
  ]
});

describe('loadReseauCampagne : app.reseau_lire (consultant)', () => {
  it('appelle la fonction journalisée et compte par groupe', async () => {
    rpc.mockResolvedValue(lecture());
    const lu = await loadReseauCampagne(VIEWER, CAMPAGNE);
    expect(rpc).toHaveBeenCalledWith('reseau_lire', { p_campagne: CAMPAGNE });
    expect(select).not.toHaveBeenCalled();
    expect(lu?.statut).toBe('ouverte');
    expect(lu?.groupes).toEqual([
      {
        groupeId: GROUPE,
        nom: 'Équipe Atlas',
        effectif: 5,
        informes: 3,
        oppositions: 1,
        repondants: 2,
        accordsCarte: 1
      }
    ]);
  });

  it('les décomptes ne contiennent aucun nom de personne ni aucune réponse', async () => {
    rpc.mockResolvedValue(lecture());
    const lu = await loadReseauCampagne(VIEWER, CAMPAGNE);
    const decomptes = JSON.stringify(lu?.groupes);
    expect(decomptes).not.toContain('Amine');
    expect(decomptes).not.toContain('Karim');
    expect(decomptes).not.toContain(PART);
    expect(decomptes).not.toContain('valeur');
  });

  it('le rendu brut est gardé tel quel pour l’export', async () => {
    rpc.mockResolvedValue(lecture());
    const lu = await loadReseauCampagne(VIEWER, CAMPAGNE);
    expect(lu?.brut).toEqual(lecture());
  });

  it('clé inattendue : refusé', async () => {
    rpc.mockResolvedValue({ ...lecture(), responsable_voit: true });
    await expect(loadReseauCampagne(VIEWER, CAMPAGNE)).rejects.toThrow();
  });

  it.each([
    [
      '42501 (responsable, autre organisation, inexistante)',
      new GatewayError(403, '42501')
    ],
    ['401', new GatewayError(401, null)]
  ])('%s : null, donc 404', async (_, erreur) => {
    rpc.mockRejectedValue(erreur);
    expect(await loadReseauCampagne(VIEWER, CAMPAGNE)).toBeNull();
  });

  it('identifiant hors format : lève avant toute requête', async () => {
    await expect(loadReseauCampagne(VIEWER, 'x')).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Contrats de source.

const source = (relatif: string): string =>
  readFileSync(
    fileURLToPath(new URL(`../../src/${relatif}`, import.meta.url)),
    'utf8'
  );

describe('contrats de source', () => {
  it('le chargeur ne lit aucune table et n’utilise pas la clé de service', () => {
    const s = source('lib/reseau-data.ts');
    expect(s).not.toMatch(/\.select\(/);
    expect(s).not.toContain('serviceClient');
    for (const fn of ['mes_releves_reseau', 'reseau_releve', 'reseau_lire']) {
      expect(s).toContain(`'${fn}'`);
    }
  });

  it('les actions sont serveur, sans table ni clé de service', () => {
    const s = source('actions/reseau.ts');
    expect(s.startsWith("'use server'")).toBe(true);
    expect(s).not.toMatch(/\.select\(/);
    expect(s).not.toContain('serviceClient');
  });

  it('les composants du réseau n’atteignent ni la base ni les actions réelles', () => {
    const dossier = fileURLToPath(
      new URL('../../src/components/reseau/', import.meta.url)
    );
    const fichiers = readdirSync(dossier).filter((f) => f.endsWith('.tsx'));
    expect(fichiers.length).toBeGreaterThan(0);
    for (const fichier of fichiers) {
      const s = source(`components/reseau/${fichier}`);
      expect(s).not.toContain('supabase');
      expect(s).not.toContain('reseau-data');
      expect(s).not.toMatch(/from '@\/actions\/reseau'/);
    }
  });

  it('l’écran applique la logique d’interaction testée (sans DOM)', () => {
    const s = source('components/reseau/ecran-reseau.tsx');
    expect(s).toContain('reduireInteraction');
    expect(s).toContain('messageReseau(');
    expect(s).toContain('doitConfirmerRefus(');
    // Clé de remontage aux deux points de montage du formulaire d’accords.
    expect(
      s.match(/key=\{`accords-\$\{cleAccords\(releve\.moi\)\}`\}/g)
    ).toHaveLength(2);
  });

  it('les deux pages utilisent l’enveloppe tolérante aux pannes', () => {
    for (const page of [
      'app/[locale]/mes-resultats/page.tsx',
      'app/[locale]/mes-resultats/reseau/[participation]/page.tsx'
    ]) {
      expect(source(page)).toContain('loadMesRelevesReseauOuVide(');
    }
  });

  it('la logique pure n’importe aucun accès aux données', () => {
    const s = source('lib/reseau-releve.ts');
    expect(s).not.toMatch(/^import /m);
    expect(s).not.toContain('supabase');
  });
});
