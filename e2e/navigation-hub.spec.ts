import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

async function signIn(page: import('@playwright/test').Page) {
  await page.goto('/');
  await page.getByLabel('E-mail').fill(email!);
  await page.getByLabel('Senha').fill(password!);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByTestId('hub-create-group')).toBeVisible({ timeout: 30_000 });
}

test.describe('Hub navigation', () => {
  test.beforeEach(async ({ page }) => {
    test.skip(!email || !password, 'Defina E2E_EMAIL e E2E_PASSWORD para testes autenticados');
    await signIn(page);
  });

  test('mostra hub com quatro ações após login', async ({ page }) => {
    await expect(page.getByTestId('hub-create-group')).toBeVisible();
    await expect(page.getByTestId('hub-join-code')).toBeVisible();
    await expect(page.getByTestId('hub-my-groups')).toBeVisible();
    await expect(page.getByTestId('hub-solo')).toBeVisible();
  });

  test('hub → meus grupos → voltar → hub', async ({ page }) => {
    await page.getByTestId('hub-my-groups').click();
    await expect(page.getByText('Escolha um grupo')).toBeVisible();
    await page.getByTestId('nav-back').click();
    await expect(page.getByTestId('hub-create-group')).toBeVisible();
  });

  test('hub → solo → visão geral → voltar → hub', async ({ page }) => {
    await page.getByTestId('hub-solo').click();
    await expect(page.getByTestId('overview-screen')).toBeVisible({ timeout: 30_000 });
    await page.getByTestId('nav-back').click();
    await expect(page.getByTestId('hub-create-group')).toBeVisible();
  });

  test('cabeçalho não ocupa altura excessiva na visão geral', async ({ page }) => {
    await page.getByTestId('hub-solo').click();
    await expect(page.getByTestId('overview-screen')).toBeVisible({ timeout: 30_000 });

    const header = page.locator('[role="banner"]').first();
    await expect(header).toBeVisible();
    const box = await header.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeLessThan(120);
  });
});
