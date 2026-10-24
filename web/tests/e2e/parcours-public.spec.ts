import { expect, test } from '@playwright/test';

test('la page d’accueil répond en 200', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});

// Parcours anonyme fermé (PARCOURS_ANONYME_OUVERT dans config/site.ts) : sans
// session, le questionnaire public et les résultats publics mènent à la connexion.
test.describe('parcours anonyme fermé', () => {
  for (const [path, retour] of [
    ['/fr/test', '/test'],
    ['/fr/result', '/mes-resultats'],
    ['/fr/result/0123456789abcdef01234567', '/mes-resultats']
  ]) {
    test(`${path} sans session mène à la connexion`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(200);
      const url = new URL(page.url());
      expect(url.pathname).toBe('/fr/connexion');
      expect(url.searchParams.get('next')).toBe(retour);
    });
  }
});

test.describe('anciennes pages retirées', () => {
  for (const path of [
    '/translations',
    '/fr/translations',
    '/translations/b5-johnson-120-ipip-neo-pi-r',
    '/translations/result/fr'
  ]) {
    test(`${path} répond en 404`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    });
  }
});
