import { expect, test, type Page } from '@playwright/test';

type BrowserErrors = {
  readonly consoleErrors: string[];
  readonly pageErrors: string[];
};

function watchBrowserErrors(page: Page): BrowserErrors {
  const errors: BrowserErrors = {
    consoleErrors: [],
    pageErrors: [],
  };

  page.on('pageerror', (error) => errors.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.consoleErrors.push(message.text());
    }
  });

  return errors;
}

function expectNoBrowserErrors(errors: BrowserErrors): void {
  expect(errors.pageErrors).toEqual([]);
  expect(errors.consoleErrors).toEqual([]);
}

test.describe('admin web operations', () => {
  test('home actions navigate to each operational area', async ({ page }) => {
    const errors = watchBrowserErrors(page);

    await page.goto('/');
    await page.getByRole('link', { name: 'Revisar guias pendentes' }).click();
    await expect(page).toHaveURL(/\/guides$/);
    await expect(page.getByRole('heading', { name: 'Guias pendentes' })).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: 'Ver pagamentos' }).click();
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.getByRole('heading', { name: 'Pagamentos', level: 1 })).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: 'Ver acessos' }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.getByRole('heading', { name: 'Acessos liberados' })).toBeVisible();

    await page.goto('/');
    await page.getByRole('link', { name: 'Gerenciar conteudo' }).click();
    await expect(page).toHaveURL(/\/content$/);

    await page.goto('/');
    await page.getByRole('link', { name: 'Moderar avaliacoes' }).click();
    await expect(page).toHaveURL(/\/reviews$/);

    await page.goto('/');
    await page.getByRole('link', { name: 'Cupons e promocoes' }).click();
    await expect(page).toHaveURL(/\/promotions$/);

    await page.goto('/');
    await page.getByRole('link', { name: 'Expansao de comunidades' }).click();
    await expect(page).toHaveURL(/\/communities$/);

    expectNoBrowserErrors(errors);
  });

  test('payment filters combine status, gateway and currency', async ({ page }) => {
    const errors = watchBrowserErrors(page);

    await page.goto('/payments');
    await expect(page.getByRole('status')).toContainText('Modo demonstracao');
    await expect(page.locator('.finance-row')).toHaveCount(4);
    const filters = page.getByLabel('Filtros de pagamento');

    await filters.getByLabel('Status').selectOption('approved');
    await expect(page.locator('.finance-row')).toHaveCount(1);
    await expect(page.locator('.finance-row')).toContainText('Aprovado');

    await filters.getByLabel('Gateway').selectOption('stripe');
    await expect(page.getByText('Nenhum pagamento encontrado')).toBeVisible();

    await filters.getByLabel('Status').selectOption('all');
    await expect(page.locator('.finance-row')).toHaveCount(2);
    await filters.getByLabel('Moeda').selectOption('EUR');
    await expect(page.locator('.finance-row')).toHaveCount(1);
    await expect(page.locator('.finance-row')).toContainText('Recusado');
    await expect(page.locator('.finance-row')).toContainText('DE');

    await filters.getByLabel('Pais').selectOption('BR');
    await expect(page.getByText('Nenhum pagamento encontrado')).toBeVisible();
    await filters.getByLabel('Gateway').selectOption('all');
    await filters.getByLabel('Moeda').selectOption('all');
    await filters.getByLabel('Tour/plano/reserva').selectOption('tour-arte-becos');
    await expect(page.locator('.finance-row')).toHaveCount(1);
    await expect(page.locator('.finance-row')).toContainText('Reembolsado');

    expectNoBrowserErrors(errors);
  });

  test('financial switcher opens payment and access datasets', async ({ page }) => {
    const errors = watchBrowserErrors(page);

    await page.goto('/payments');
    await page.getByRole('link', { name: 'Acessos e assinaturas' }).click();
    await expect(page).toHaveURL(/\/subscriptions$/);
    await expect(page.locator('.finance-row')).toHaveCount(3);
    await expect(page.locator('.finance-row').first()).toContainText('Ativo');

    await page.getByRole('link', { name: 'Pagamentos', exact: true }).click();
    await expect(page).toHaveURL(/\/payments$/);
    await expect(page.locator('.finance-row')).toHaveCount(4);

    expectNoBrowserErrors(errors);
  });

  test('demo guide approval updates queue, status and audit trail', async ({ page }) => {
    const errors = watchBrowserErrors(page);

    await page.goto('/guides');
    await expect(page.getByRole('status')).toContainText('Modo demonstracao');
    await expect(page.locator('.guide-row')).toHaveCount(3);
    await expect(page.getByLabel('Resumo da fila').getByText('3', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Aprovar guia' }).first().click();
    await expect(page.locator('.guide-row')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'Auditoria' }).locator('..')).not.toContainText(
      'Esta tela replica o contrato localmente',
    );

    await page.getByRole('button', { name: /Aprovados\s+1/ }).click();
    await expect(page.locator('.guide-row')).toHaveCount(1);
    await expect(page.locator('.guide-row')).toContainText('Aprovado');
    await expect(page.locator('.guide-row')).toContainText('Aprovado em');

    await page.getByRole('button', { name: /Todos\s+3/ }).click();
    await expect(page.locator('.guide-row')).toHaveCount(3);

    expectNoBrowserErrors(errors);
  });

  test('content, review, coupon and community operations work in demo mode', async ({ page }) => {
    const errors = watchBrowserErrors(page);

    await page.goto('/content');
    await expect(page.locator('.operation-row')).toHaveCount(18);
    await expect(page.getByText('Marketplace', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Pausar' }).first().click();
    await expect(page.locator('.operation-row').first()).toContainText('paused');

    await page.goto('/reviews');
    await expect(page.locator('.operation-row')).toHaveCount(3);
    await page.getByRole('button', { name: 'Publicar' }).click();
    await expect(page.locator('.operation-row').first()).toContainText('published');

    await page.goto('/promotions');
    await expect(page.locator('.operation-row')).toHaveCount(2);
    await page.getByRole('button', { name: 'Pausar' }).first().click();
    await expect(page.locator('.operation-row').first()).toContainText('pausado');

    await page.goto('/communities');
    await expect(page.locator('.operation-row')).toHaveCount(5);
    await expect(page.getByText('Complexo da Penha')).toBeVisible();

    expectNoBrowserErrors(errors);
  });
});
