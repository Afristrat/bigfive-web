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
  'members'
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

  it('le compteur annonce un seuil (« moins de N »), jamais un nombre exact accordé à tort', () => {
    expect(fr.invitations.counterLow).toMatch(/moins de \{remaining\}/);
    expect(fr.invitations.counterLow).not.toMatch(/Il reste/);
  });
});
