import { expect, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

type AdminVisualRoute = {
  readonly expectedText: RegExp | string;
  readonly label: string;
  readonly path: string;
};

const outputDir = path.resolve(process.cwd(), 'qa-artifacts/admin-web');

const routes: readonly AdminVisualRoute[] = [
  { expectedText: /Painel admin/i, label: '01-admin-home', path: '/' },
  { expectedText: /Guias pendentes/i, label: '02-guides', path: '/guides' },
  { expectedText: /Pagamentos/i, label: '03-payments', path: '/payments' },
  { expectedText: /Acessos liberados/i, label: '04-subscriptions', path: '/subscriptions' },
  { expectedText: /Conteudo turistico/i, label: '05-content', path: '/content' },
  { expectedText: /Avaliacoes/i, label: '06-reviews', path: '/reviews' },
  { expectedText: /Cupons e promocoes/i, label: '07-promotions', path: '/promotions' },
  { expectedText: /Comunidades/i, label: '08-communities', path: '/communities' },
];

test.describe('admin web visual audit', () => {
  test.beforeAll(async () => {
    await mkdir(outputDir, { recursive: true });
  });

  for (const route of routes) {
    test(`${route.label} snapshot`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(500);

      await expect(page.getByText(route.expectedText).first()).toBeVisible();
      const hasOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth + 1,
      );
      expect(hasOverflow).toBe(false);

      await page.screenshot({
        fullPage: true,
        path: path.join(outputDir, `${testInfo.project.name}-${route.label}.png`),
      });

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
});
