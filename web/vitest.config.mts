import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // `server-only` lève hors du compilateur de Next.js ; en test, module vide.
      'server-only': fileURLToPath(
        new URL('./tests/unit/stubs/server-only.ts', import.meta.url)
      )
    }
  },
  // Next.js laisse le JSX intact (tsconfig « preserve ») ; les tests rendent
  // les composants purs et ont besoin du JSX transformé.
  oxc: {
    jsx: { runtime: 'automatic' }
  },
  test: {
    include: ['tests/unit/**/*.test.ts']
  }
});
