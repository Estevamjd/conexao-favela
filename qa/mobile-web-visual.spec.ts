import { expect, type Page, test } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const outputDir = path.resolve(process.cwd(), 'qa-artifacts/mobile-web');
const sessionStorageKey = 'conexao-favela:session:v1';
const authStorageKey = 'conexao-favela:auth:v1';
const bookingsStorageKey = 'conexao-favela:bookings:v1';
const paymentsStorageKey = 'conexao-favela:payments:v1';

type QaAuthProfile = 'guide' | 'tourist';

type VisualRoute = {
  readonly expectedText: RegExp | string;
  readonly label: string;
  readonly path: string;
  readonly profile?: QaAuthProfile;
};

const scheduledFor = new Date(Date.now() + 48 * 60 * 60 * 1000);
const scheduledForTimestamp = {
  nanoseconds: (scheduledFor.getTime() % 1000) * 1_000_000,
  seconds: Math.floor(scheduledFor.getTime() / 1000),
};

const demoBooking = {
  communityId: 'alemao',
  guideId: 'seed-guide-teleferico',
  id: 'local-booking-smoke',
  meetingPoint: {
    description: {
      en: 'Meeting point at the former station.',
      es: 'Punto de encuentro en la antigua estacion.',
      pt: 'Ponto de encontro na antiga estacao.',
    },
    lat: -22.8592,
    lng: -43.2759,
    name: 'Estacao Alemao do Teleferico',
  },
  numberOfTourists: 2,
  pricing: {
    currency: 'BRL',
    pricePerPerson: 80,
    totalPrice: 160,
  },
  scheduledFor: scheduledForTimestamp,
  shareableLink: 'dev://bookings/local-booking-smoke',
  status: 'confirmed',
  tourId: 'memorias-do-teleferico',
  touristId: 'local-tourist-qa',
  touristsInfo: [{ name: 'Visitante QA' }, { name: 'Acompanhante QA' }],
};

const demoPayment = {
  amountCents: 16000,
  bookingId: 'local-booking-smoke',
  createdAtIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  currency: 'BRL',
  gateway: 'mercado_pago',
  gatewayPaymentId: 'demo_payment_visual',
  paymentId: 'local-payment-visual',
  paymentMethod: 'pix',
  pixCopyPaste: '000201010212demovisual6304DEMO',
  pixQrCode: 'demo-qr:local-payment-visual',
  status: 'pending',
  updatedAtIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
};

const routes: readonly VisualRoute[] = [
  { expectedText: /Historias reais/i, label: '01-home', path: '/' },
  { expectedText: 'Filtros', label: '02-explore', path: '/explore' },
  { expectedText: /Mem/i, label: '03-tour-detail', path: '/tour/memorias-do-teleferico' },
  { expectedText: /Reservar tour/i, label: '04-book-tour', path: '/book/memorias-do-teleferico' },
  { expectedText: /Pagamento seguro/i, label: '05-payment', path: '/payment/local-booking-smoke' },
  {
    expectedText: /Confirmando pagamento/i,
    label: '05b-payment-return',
    path: '/payment-return/success?paymentId=local-payment-visual',
  },
  {
    expectedText: /Checkout fechado/i,
    label: '05c-payment-cancel',
    path: '/payment-return/cancel?paymentId=local-payment-visual',
  },
  {
    expectedText: /Detalhe da reserva/i,
    label: '06-booking-detail',
    path: '/booking/local-booking-smoke',
  },
  { expectedText: /Mapa interativo/i, label: '07-map', path: '/map' },
  {
    expectedText: /Detalhe do ponto turistico/i,
    label: '08-poi-detail',
    path: '/poi/estacao-teleferico-alemao',
  },
  { expectedText: /Favoritos/i, label: '09-favorites', path: '/favorites' },
  { expectedText: 'Preferencias', label: '10-profile', path: '/profile' },
  {
    expectedText: /Agendamentos do guia/i,
    label: '11-guide-bookings',
    path: '/guide-bookings',
    profile: 'guide',
  },
  { expectedText: /Meus tours/i, label: '12-guide-tours', path: '/guide-tours', profile: 'guide' },
  {
    expectedText: /Criar tour/i,
    label: '13-guide-create-tour',
    path: '/guide-tours/new',
    profile: 'guide',
  },
  { expectedText: /Entrar ou criar conta/i, label: '14-sign-in', path: '/sign-in' },
  { expectedText: /Sua experiencia/i, label: '15-experience-hub', path: '/experience' },
  {
    expectedText: /Galeria da comunidade/i,
    label: '16-community-gallery',
    path: '/community-gallery',
  },
  {
    expectedText: /Recomendados para voce/i,
    label: '17-recommendations',
    path: '/recommendations',
  },
  {
    expectedText: /Sabores, arte e hospedagem/i,
    label: '18-marketplace',
    path: '/marketplace',
  },
  {
    expectedText: /Financeiro/i,
    label: '19-guide-finance',
    path: '/guide-finance',
    profile: 'guide',
  },
  {
    expectedText: /Estatisticas/i,
    label: '20-guide-statistics',
    path: '/guide-statistics',
    profile: 'guide',
  },
];

function sessionSnapshot(profile: QaAuthProfile): string {
  return JSON.stringify({
    state: {
      activeProfile: profile,
      currentCommunityId: 'alemao',
      notificationsEnabled: true,
      onboardingCompleted: true,
      preferredCurrency: 'BRL',
      preferredLanguage: 'pt',
    },
    version: 0,
  });
}

function authSnapshot(profile: QaAuthProfile): string {
  const isGuide = profile === 'guide';

  return JSON.stringify({
    state: {
      currentUser: {
        displayName: isGuide ? 'Luana Martins' : 'Visitante QA',
        email: isGuide ? 'luana@example.com' : 'qa@example.com',
        guideVerified: isGuide,
        notificationsEnabled: true,
        preferredCurrency: 'BRL',
        preferredLanguage: 'pt',
        type: profile,
        uid: isGuide ? 'seed-guide-teleferico' : 'local-tourist-qa',
      },
    },
    version: 0,
  });
}

async function primeCompletedSession(page: Page, profile: QaAuthProfile): Promise<void> {
  await page.addInitScript(
    (storage) => {
      window.localStorage.setItem(storage.authKey, storage.authValue);
      window.localStorage.setItem(storage.sessionKey, storage.sessionValue);
      window.localStorage.setItem(storage.bookingKey, storage.bookingValue);
      window.localStorage.setItem(storage.paymentKey, storage.paymentValue);
    },
    {
      authKey: authStorageKey,
      authValue: authSnapshot(profile),
      bookingKey: bookingsStorageKey,
      bookingValue: JSON.stringify({ state: { localBookings: [demoBooking] }, version: 0 }),
      paymentKey: paymentsStorageKey,
      paymentValue: JSON.stringify({ state: { localPayments: [demoPayment] }, version: 0 }),
      sessionKey: sessionStorageKey,
      sessionValue: sessionSnapshot(profile),
    },
  );
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1);

  expect(hasOverflow).toBe(false);
}

test.describe('mobile web visual audit', () => {
  test.beforeAll(async () => {
    await mkdir(outputDir, { recursive: true });
  });

  for (const route of routes) {
    test(`${route.label} snapshot`, async ({ page }) => {
      const pageErrors: string[] = [];
      const consoleErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });

      await primeCompletedSession(page, route.profile ?? 'tourist');
      await page.goto(route.path);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(600);

      await expect(page.getByText(route.expectedText).last()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(outputDir, `${route.label}.png`),
      });

      expect(pageErrors).toEqual([]);
      expect(consoleErrors).toEqual([]);
    });
  }
});
