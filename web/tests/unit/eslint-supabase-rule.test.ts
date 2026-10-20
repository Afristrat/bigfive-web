import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Applique la règle no-restricted-syntax de .eslintrc.json à de faux fichiers :
// la règle qui réserve SUPABASE_* à src/lib/supabase/server.ts doit rester rouge
// sur chaque contournement connu.
const config = JSON.parse(
  readFileSync(
    fileURLToPath(new URL('../../.eslintrc.json', import.meta.url)),
    'utf8'
  )
) as { rules: Record<string, unknown> };

// ESLint 8 n'embarque pas ses types et @types/eslint n'est pas une dépendance :
// seul le contrat utilisé ici est déclaré.
type LinterLike = {
  verify: (code: string, config: unknown) => readonly unknown[];
};
const { Linter } = createRequire(import.meta.url)('eslint') as {
  Linter: new () => LinterLike;
};
const linter = new Linter();
const violations = (code: string): number =>
  linter.verify(code, {
    parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    rules: {
      'no-restricted-syntax': config.rules['no-restricted-syntax'] as never
    }
  }).length;

describe('règle ESLint SUPABASE_*', () => {
  const interdits: Record<string, string> = {
    'accès pointé': 'const a = process.env.SUPABASE_URL;',
    'accès pointé optionnel': 'const a = process.env?.SUPABASE_SECRET_KEY;',
    'accès entre crochets': "const a = process.env['SUPABASE_URL'];",
    'accès calculé par variable': 'const a = process.env[name];',
    'accès calculé par gabarit': 'const a = process.env[`SUPABASE_${k}`];',
    déstructuration: 'const { SUPABASE_URL } = process.env;',
    'déstructuration renommée': 'const { SUPABASE_URL: u } = process.env;',
    'déstructuration à clé chaîne':
      "const { 'SUPABASE_URL': u } = process.env;",
    'déstructuration avec reste': 'const { A, ...reste } = process.env;',
    'déstructuration par affectation':
      'let u; ({ SUPABASE_URL: u } = process.env);',
    'alias de process.env': 'const e = process.env; const a = e.SUPABASE_URL;',
    'littéral chaîne': "const nom = 'SUPABASE_SECRET_KEY';",
    'littéral dans un gabarit': 'const nom = `lire SUPABASE_URL`;'
  };

  for (const [nom, code] of Object.entries(interdits)) {
    it(`refuse : ${nom}`, () => {
      expect(violations(code)).toBeGreaterThan(0);
    });
  }

  it('laisse passer les variables non Supabase', () => {
    expect(violations("const a = process.env['SITE_URL'];")).toBe(0);
    expect(violations('const a = process.env.SITE_URL;')).toBe(0);
    expect(violations('const { SITE_URL } = process.env;')).toBe(0);
  });
});
