import { defineConfig } from '@playwright/test';

// Les parcours visent toujours une URL déployée (préproduction), jamais un
// serveur local : pas de `webServer` ici (règle du projet, SOP-011).
const baseURL = process.env.PLAYWRIGHT_BASE_URL;
if (!baseURL) {
  throw new Error(
    'PLAYWRIGHT_BASE_URL doit pointer vers une URL déployée (préproduction).'
  );
}

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: 0,
  reporter: [['list']],
  use: { baseURL, trace: 'retain-on-failure' }
});
