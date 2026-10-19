import { expect, test } from '@playwright/test';

test('la page d’accueil répond en 200', async ({ page }) => {
  const response = await page.goto('/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
});

test('/fr/test affiche la première question', async ({ page }) => {
  const response = await page.goto('/fr/test');
  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole('progressbar')
  ).toBeVisible();
  const question = page.getByRole('heading', { level: 2 }).first();
  await expect(question).toBeVisible();
  await expect(question).not.toHaveText('');
  await expect(page.getByRole('radio').first()).toBeVisible();
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
