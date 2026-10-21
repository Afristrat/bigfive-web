import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Le lot invitations et super administrateurs doit compiler, tester et
// fonctionner seul : aucun fichier qu'il livre ne référence le lot mot de passe
// (migration 0018, non publiable). Les motifs sont coupés pour que cette
// vérification ne se cite pas elle-même quand on cherche ces noms.
const interdits = [
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

const livres = [
  'src/actions/admin.ts',
  'src/lib/admin-data.ts',
  'src/app/[locale]/admin/page.tsx',
  'src/app/[locale]/admin/apercu-rapport/page.tsx',
  'src/app/[locale]/connexion/page.tsx',
  'src/app/[locale]/mon-compte/page.tsx',
  'src/actions/auth.ts',
  'src/components/admin-forms.tsx',
  'src/components/tenga-admins-panel.tsx'
];

describe('séparation du lot mot de passe', () => {
  it.each(livres)(
    '%s ne référence aucun élément du lot mot de passe',
    (file) => {
      const source = readFileSync(resolve(process.cwd(), file), 'utf8');
      const trouves = interdits.filter((motif) => source.includes(motif));
      expect(trouves).toEqual([]);
    }
  );
});
