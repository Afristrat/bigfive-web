import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Lot mot de passe administrateur (migration 0018) : ses éléments sont branchés
// sur les trois pages qui les portent, et seulement là. Les modules du lot
// invitations et super administrateurs restent indépendants du lot (ils
// compilent et fonctionnent sans lui). Les motifs sont coupés pour que cette
// vérification ne se cite pas elle-même quand on cherche ces noms.
const elementsDuLot = [
  ['md', 'p_'],
  ['deverrouiller', '_mot_de_passe'],
  ['password', '-login'],
  ['password', '-unlock'],
  ['security', '-forms'],
  ['actions/', 'security'],
  ['Password', 'LoginForm'],
  ['Unlock', 'Button'],
  ['unlock', 'Password'],
  ['loadLocked', 'Accounts'],
  ['hasVerified', 'Totp'],
  ['tenga_', 'mfa'],
  ['PENDING', '_COOKIE']
].map((parts) => parts.join(''));

const lire = (file: string): string =>
  readFileSync(resolve(process.cwd(), file), 'utf8');

const independants = [
  'src/actions/admin.ts',
  'src/lib/admin-data.ts',
  'src/app/[locale]/admin/apercu-rapport/page.tsx',
  'src/actions/auth.ts',
  'src/components/admin-forms.tsx',
  'src/components/tenga-admins-panel.tsx'
];

// Page, puis éléments du lot qu'elle doit importer et utiliser.
const branchements: [string, string[]][] = [
  [
    'src/app/[locale]/connexion/page.tsx',
    [
      "from '@/components/password-login-form'",
      '<PasswordLoginForm',
      // Le lien magique reste affiché à côté.
      '<LoginForm'
    ]
  ],
  [
    'src/app/[locale]/mon-compte/page.tsx',
    [
      "from '@/components/security-forms'",
      '<TotpSection',
      '<PasswordSection',
      'hasVerifiedTotp(viewer)',
      // Section réservée aux administrateurs Tenga.
      '{admin && ('
    ]
  ],
  [
    'src/app/[locale]/admin/page.tsx',
    [
      "from '@/components/password-unlock'",
      "from '@/lib/password-locked-accounts'",
      'loadLockedAccounts(viewer)',
      '<UnlockButton',
      "id='verrous-titre'",
      // Page entière réservée aux administrateurs Tenga.
      "requireAdmin(locale, '/admin')"
    ]
  ]
];

describe('lot mot de passe : séparation des modules du lot invitations', () => {
  it.each(independants)(
    '%s ne référence aucun élément du lot mot de passe',
    (file) => {
      const trouves = elementsDuLot.filter((motif) =>
        lire(file).includes(motif)
      );
      expect(trouves).toEqual([]);
    }
  );
});

describe('lot mot de passe : branchement sur les trois pages', () => {
  it.each(branchements)('%s branche les éléments du lot', (file, attendus) => {
    const source = lire(file);
    const manquants = attendus.filter((motif) => !source.includes(motif));
    expect(manquants).toEqual([]);
  });
});
