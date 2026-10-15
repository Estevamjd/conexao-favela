import { defineConfig } from '@playwright/test';
import process from 'node:process';

const baseURL = process.env.MOBILE_WEB_BASE_URL ?? 'http://localhost:8081';
const browserChannel =
  process.env.PLAYWRIGHT_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },
  reporter: [['line']],
  testDir: '.',
  testMatch: ['mobile-web.spec.ts'],
  timeout: 60_000,
  use: {
    baseURL,
    browserName: 'chromium',
    ...(browserChannel ? { channel: browserChannel } : {}),
    locale: 'pt-BR',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    viewport: {
      height: 844,
      width: 390,
    },
  },
  webServer: {
    command: 'pnpm qa:mobile-web:server',
    reuseExistingServer: true,
    timeout: 240_000,
    url: baseURL,
  },
});
