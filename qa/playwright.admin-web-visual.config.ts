import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const baseURL = process.env.ADMIN_WEB_BASE_URL ?? 'http://127.0.0.1:3000';
const browserChannel =
  process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  projects: [
    {
      name: 'desktop',
      use: {
        viewport: {
          height: 900,
          width: 1366,
        },
      },
    },
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 7'],
        viewport: {
          height: 844,
          width: 390,
        },
      },
    },
  ],
  reporter: [['line']],
  testDir: '.',
  testMatch: ['admin-web-visual.spec.ts'],
  timeout: 90_000,
  use: {
    baseURL,
    browserName: 'chromium',
    ...(browserChannel ? { channel: browserChannel } : {}),
    locale: 'pt-BR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm --filter @conexao-favela/admin exec next dev --hostname 127.0.0.1 --port 3000',
    reuseExistingServer: true,
    timeout: 120_000,
    url: baseURL,
  },
});
