import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import ar from '@/messages/ar.js';
import en from '@/messages/en.js';
import fr from '@/messages/fr.js';

type Tree = { [key: string]: string | Tree };

const flatten = (tree: Tree, prefix = ''): string[] =>
  Object.entries(tree).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [`${prefix}${key}`]
      : flatten(value, `${prefix}${key}.`)
  );

const catalogs: Record<'fr' | 'en' | 'ar', Tree> = { fr, en, ar };

// Espaces de noms du lot 1 : parité stricte des clés dans les trois langues.
const namespaces = [
  'login',
  'account',
  'roles',
  'admin',
  'campaigns',
  'invitations',
  'invitation',
  'members',
  'niveaux',
  'passation',
  'mesResultats',
  'rapport',
  'binome',
  'synthese',
  'apercu',
  'relecture',
  'reseau',
  'flow'
] as const;

describe('parité des messages fr / en / ar', () => {
  for (const namespace of namespaces) {
    it(`« ${namespace} » a les mêmes clés dans les trois langues`, () => {
      const keys = (lang: 'fr' | 'en' | 'ar'): string[] => {
        const subtree = catalogs[lang][namespace];
        expect(typeof subtree).toBe('object');
        return flatten(subtree as Tree).sort();
      };
      expect(keys('fr').length).toBeGreaterThan(0);
      expect(keys('en')).toEqual(keys('fr'));
      expect(keys('ar')).toEqual(keys('fr'));
    });
  }

  it('« toolbar » a la clé « account » partout et plus de comparaison', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const toolbar = catalogs[lang].toolbar as Tree;
      expect(typeof toolbar.account).toBe('string');
      expect(toolbar).not.toHaveProperty('compare');
      expect(toolbar).not.toHaveProperty('compare_with');
    }
  });

  it('le partage de résultat n’existe plus dans les messages', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      expect(catalogs[lang]).not.toHaveProperty('share');
      expect(catalogs[lang]).not.toHaveProperty('getCompare');
      expect(catalogs[lang]).not.toHaveProperty('shareLinks');
    }
  });

  it('aucune chaîne du lot 1 n’est vide, ni tiret cadratin, ni promesse de marque', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      for (const namespace of namespaces) {
        const text = JSON.stringify(catalogs[lang][namespace]);
        expect(text).not.toContain('""');
        expect(text).not.toContain('—');
        expect(text.toLowerCase()).not.toMatch(
          /gratuit|open source|scientifiquement/
        );
      }
    }
  });

  it('le français du lot 1 met une espace insécable avant ? ! : et ;', () => {
    const leaves = (tree: Tree): string[] =>
      Object.values(tree).flatMap((v) =>
        typeof v === 'string' ? [v] : leaves(v)
      );
    for (const namespace of namespaces) {
      for (const text of leaves(fr[namespace] as Tree)) {
        expect(text).not.toMatch(/[^\s ][?!:;]/);
      }
    }
  });

  const leafEntries = (tree: Tree, prefix = ''): [string, string][] =>
    Object.entries(tree).flatMap(([key, value]) =>
      typeof value === 'string'
        ? [[`${prefix}${key}`, value] as [string, string]]
        : leafEntries(value, `${prefix}${key}.`)
    );
  const placeholders = (text: string): string[] =>
    [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? '').sort();

  // Sous-arbres du lot des invitations : espaces de noms entiers et clés admin.grant*.
  const invitationScope = (lang: 'fr' | 'en' | 'ar'): [string, string][] => [
    ...(['campaigns', 'invitations', 'invitation', 'members'] as const).flatMap(
      (namespace) =>
        leafEntries(catalogs[lang][namespace] as Tree, `${namespace}.`)
    ),
    ...leafEntries(catalogs[lang].admin as Tree, 'admin.').filter(([key]) =>
      key.startsWith('admin.grant')
    )
  ];

  it('les clés admin.grant* nouvelles existent dans les trois langues', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const admin = catalogs[lang].admin as Tree;
      for (const key of [
        'grantWorking',
        'grantInvalid',
        'grantExists',
        'grantError'
      ]) {
        expect(typeof admin[key]).toBe('string');
      }
    }
  });

  it('les clés admin de création, d’attribution et de retrait existent dans les trois langues', () => {
    const keys = [
      'requiredLegend',
      'createWorking',
      'assignWorking',
      'organizationPlaceholder',
      'rolePlaceholder',
      'removeTitle',
      'removeIntro',
      'removeCaption',
      'removeColAddress',
      'removeColAdded',
      'removeColAction',
      'removeYou',
      'removeSelfHelp',
      'removeConfirm',
      'removeButton',
      'removeButtonAria',
      'removeWorking',
      'removed',
      'removeInvalid',
      'removeSelf',
      'removeAbsent',
      'removeForbidden',
      'removeError',
      'adminsUnavailable'
    ];
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const admin = catalogs[lang].admin as Tree;
      for (const key of keys)
        expect(typeof admin[key], `${lang} ${key}`).toBe('string');
    }
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const admin = catalogs[lang].admin as Tree;
      expect(admin).not.toHaveProperty('grantRequiredLegend');
    }
  });

  it('le libellé anglais de l’organisation suit l’orthographe du reste du catalogue', () => {
    const admin = catalogs.en.admin as Tree;
    expect(admin.organizationLabel).toBe('Organisation');
    const texts = leafEntries(admin, 'admin.').map(([, text]) => text);
    for (const text of texts) expect(text).not.toMatch(/rganization/);
  });

  it('les placeholders {adresse} des libellés de retrait sont identiques', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      const admin = catalogs[lang].admin as Tree;
      for (const key of ['removeConfirm', 'removeButtonAria']) {
        expect(placeholders(String(admin[key]))).toEqual(['adresse']);
      }
    }
  });

  it('les gabarits {nom} sont les mêmes dans les trois langues pour chaque clé', () => {
    const byKey = (lang: 'fr' | 'en' | 'ar'): Record<string, string[]> =>
      Object.fromEntries(
        invitationScope(lang).map(([key, text]) => [key, placeholders(text)])
      );
    expect(byKey('en')).toEqual(byKey('fr'));
    expect(byKey('ar')).toEqual(byKey('fr'));
  });

  it('aucun plafond chiffré écrit en dur : les plafonds passent par {max}', () => {
    for (const lang of ['fr', 'en', 'ar'] as const) {
      for (const [key, text] of invitationScope(lang)) {
        // 160, 1000 (ou 1 000), 4000 et 25 viennent de access-rules.
        expect(text, `${lang} ${key}`).not.toMatch(
          /(^|[^\d])(160|1[   ,]?000|4[   ,]?000|25)([^\d]|$)/
        );
      }
    }
  });

  describe('relevé du réseau : textes juridiques', () => {
    const fichier = (lang: 'fr' | 'en' | 'ar'): string =>
      readFileSync(
        fileURLToPath(
          new URL(
            `../../src/messages/espace/reseau.${lang}.js`,
            import.meta.url
          )
        ),
        'utf8'
      );
    const reseau = (lang: 'fr' | 'en' | 'ar') => catalogs[lang].reseau as Tree;
    const BLOCS = ['information', 'consentement', 'mentions'];

    it.each(['fr', 'en', 'ar'] as const)(
      '%s : chaque bloc juridique porte la mention de relecture par Amine',
      (lang) => {
        const source = fichier(lang);
        const mention =
          '// À relire par Amine (relecteur juridique) : texte non validé.';
        for (const bloc of BLOCS) {
          const debut = source.indexOf(`  ${bloc}: {`);
          expect(debut, `${lang} ${bloc}`).toBeGreaterThan(0);
          const avant = source.slice(0, debut).trimEnd().split('\n').pop();
          expect(avant?.trim(), `${lang} ${bloc}`).toBe(mention);
        }
      }
    );

    it('la déclaration à la CNDP est dite « en cours », sans aucun numéro', () => {
      expect(fr.reseau.mentions.cndp).toBe('Déclaration à la CNDP : en cours.');
      for (const lang of ['fr', 'en', 'ar'] as const) {
        const texte = JSON.stringify(reseau(lang));
        expect(texte).toMatch(/CNDP/);
        expect(texte).not.toMatch(/n°|\bno\.\s*\d|رقم/i);
        expect(texte).not.toMatch(/\[[^\]]*\]/);
      }
    });

    it('responsable du traitement : Tenga Conseil ; contact par gabarit {contact}', () => {
      for (const lang of ['fr', 'en', 'ar'] as const) {
        const mentions = reseau(lang).mentions as Tree;
        expect(String(mentions.responsable)).toContain('Tenga Conseil');
        expect(placeholders(String(mentions.contact))).toEqual(['contact']);
        expect(placeholders(String(mentions.contactSansAdresse))).toEqual([]);
      }
    });

    it('les gabarits sont les mêmes dans les trois langues pour chaque clé', () => {
      const parCle = (lang: 'fr' | 'en' | 'ar'): Record<string, string[]> =>
        Object.fromEntries(
          leafEntries(reseau(lang)).map(([cle, texte]) => [
            cle,
            placeholders(texte)
          ])
        );
      expect(parCle('en')).toEqual(parCle('fr'));
      expect(parCle('ar')).toEqual(parCle('fr'));
    });

    it('aucune apostrophe droite (caractère d’échappement ICU)', () => {
      for (const lang of ['fr', 'en', 'ar'] as const) {
        for (const [cle, texte] of leafEntries(reseau(lang))) {
          expect(texte, `${lang} ${cle}`).not.toContain("'");
        }
      }
    });

    // Le texte dit « trois ans » : il ne doit pas diverger en silence de la
    // durée par défaut de la base (private.settings.conservation_reseau_mois).
    // La migration vient du lot SQL ; tant qu'aucune migration ne définit la
    // colonne (lot pas encore fusionné), le contrôle est sauté et le dit.
    const migrations = fileURLToPath(
      new URL('../../../supabase/migrations/', import.meta.url)
    );
    const definitions = readdirSync(migrations)
      .filter((f) => f.endsWith('.sql'))
      .map((f) => readFileSync(`${migrations}${f}`, 'utf8'))
      .flatMap((sql) => [
        ...sql.matchAll(
          /ADD COLUMN conservation_reseau_mois\s+integer\s+NOT NULL\s+DEFAULT\s+(\d+)/g
        )
      ])
      .map((m) => Number(m[1]));

    it.skipIf(definitions.length === 0)(
      'conservation : « trois ans » = défaut de 36 mois en base (migration du lot SQL, quel que soit son numéro)',
      () => {
        expect(definitions.at(-1)).toBe(36);
        expect(String(fr.reseau.mentions.conservation)).toMatch(/trois ans/);
        const en = (reseau('en').mentions as Tree).conservation;
        expect(String(en)).toMatch(/three years/);
      }
    );

    it('conservation : les réponses et les choix enregistrés sont nommés', () => {
      expect(String(fr.reseau.mentions.conservation)).toMatch(
        /réponses et vos choix/
      );
    });

    it('la question « qui vous bloque » n’existe pas', () => {
      for (const lang of ['fr', 'en', 'ar'] as const) {
        expect(JSON.stringify(reseau(lang)).toLowerCase()).not.toMatch(
          /bloque|blocks you|يعرقل/
        );
      }
    });
  });

  it('le compteur annonce un seuil (« moins de N »), jamais un nombre exact accordé à tort', () => {
    expect(fr.invitations.counterLow).toMatch(/moins de \{remaining\}/);
    expect(fr.invitations.counterLow).not.toMatch(/Il reste/);
  });
});
