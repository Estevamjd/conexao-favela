import { expect, type Page, test } from '@playwright/test';

const sessionStorageKey = 'conexao-favela:session:v1';
const authStorageKey = 'conexao-favela:auth:v1';
const bookingsStorageKey = 'conexao-favela:bookings:v1';
const paymentsStorageKey = 'conexao-favela:payments:v1';
const favoritesStorageKey = 'conexao-favela:favorites:v1';
const favoritesResetFlagKey = 'conexao-favela:favorites-reset-for-qa';
const scheduledFor = new Date(Date.now() + 48 * 60 * 60 * 1000);
const scheduledForTimestamp = {
  nanoseconds: (scheduledFor.getTime() % 1000) * 1_000_000,
  seconds: Math.floor(scheduledFor.getTime() / 1000),
};
const qaBooking = {
  communityId: 'alemao',
  guideId: 'seed-guide-teleferico',
  id: 'local-booking-smoke',
  meetingPoint: {
    description: {
      de: 'Treffpunkt am alten Bahnhof.',
      en: 'Meeting point at the former station.',
      es: 'Punto de encuentro en la antigua estacion.',
      fr: 'Point de rendez-vous a l ancienne station.',
      it: 'Punto di incontro alla vecchia stazione.',
      ja: '旧駅の集合場所。',
      pt: 'Ponto de encontro na antiga estacao.',
      zh: '旧车站集合点。',
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
  // A real booking stays pending until a signed gateway webhook approves payment.
  status: 'pending',
  tourId: 'memorias-do-teleferico',
  touristId: 'local-tourist-qa',
  touristsInfo: [{ name: 'Visitante QA' }, { name: 'Acompanhante QA' }],
};
const completedBookings = JSON.stringify({
  state: {
    localBookings: [qaBooking],
  },
  version: 0,
});
const completedPayments = JSON.stringify({
  state: {
    localPayments: [
      {
        amountCents: 16000,
        bookingId: 'local-booking-smoke',
        checkoutUrl: undefined,
        createdAtIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
        currency: 'BRL',
        gateway: 'mercado_pago',
        gatewayPaymentId: 'demo_payment_qa',
        paymentId: 'local-payment-qa',
        paymentMethod: 'pix',
        pixCopyPaste: '000201010212demoqa6304DEMO',
        pixQrCode: 'demo-qr:local-payment-qa',
        status: 'pending',
        updatedAtIso: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      },
    ],
  },
  version: 0,
});

type RouteCheck = {
  readonly authProfile?: 'guide' | 'tourist';
  readonly expectedText: RegExp | string;
  readonly label: string;
  readonly path: string;
};

const routeChecks: readonly RouteCheck[] = [
  { expectedText: /Historias reais/i, label: 'home turista', path: '/' },
  { expectedText: 'Filtros', label: 'explorar tours', path: '/explore' },
  { expectedText: /Mem/i, label: 'detalhe de tour', path: '/tour/memorias-do-teleferico' },
  {
    expectedText: /Luana Martins/i,
    label: 'perfil publico do guia',
    path: '/guide/seed-guide-teleferico',
  },
  { expectedText: /Reservar tour/i, label: 'reservar tour', path: '/book/memorias-do-teleferico' },
  {
    expectedText: /Pagamento seguro/i,
    label: 'pagamento de reserva',
    path: '/payment/local-booking-smoke',
  },
  {
    expectedText: /Confirmando pagamento/i,
    label: 'retorno de pagamento aprovado',
    path: '/payment-return/success?paymentId=local-payment-qa',
  },
  {
    expectedText: /Checkout fechado/i,
    label: 'retorno de checkout cancelado',
    path: '/payment-return/cancel?paymentId=local-payment-qa',
  },
  {
    expectedText: /Historico de pagamentos/i,
    label: 'historico de pagamentos',
    path: '/payments',
  },
  {
    expectedText: /Detalhe da reserva/i,
    label: 'detalhe de reserva',
    path: '/booking/local-booking-smoke',
  },
  { expectedText: /Mapa interativo/i, label: 'mapa de POIs', path: '/map' },
  {
    expectedText: /Detalhe do ponto turistico/i,
    label: 'detalhe de POI',
    path: '/poi/estacao-teleferico-alemao',
  },
  { expectedText: /Favoritos/i, label: 'favoritos', path: '/favorites' },
  { expectedText: 'Reservas', label: 'reservas', path: '/bookings' },
  { expectedText: /Avisos push/i, label: 'notificacoes', path: '/notifications' },
  { expectedText: 'Preferencias', label: 'perfil', path: '/profile' },
  { expectedText: /Entrar ou criar conta/i, label: 'login/cadastro', path: '/sign-in' },
  { expectedText: /Sou turista/i, label: 'tipo de perfil', path: '/profile-type' },
  { expectedText: /Cadastro de guia/i, label: 'cadastro de guia', path: '/guide-registration' },
  {
    authProfile: 'guide',
    expectedText: /Agendamentos do guia/i,
    label: 'agenda do guia',
    path: '/guide-bookings',
  },
  {
    authProfile: 'guide',
    expectedText: /Detalhe do agendamento/i,
    label: 'detalhe de agendamento do guia',
    path: '/guide-booking/local-booking-smoke',
  },
  {
    authProfile: 'guide',
    expectedText: /Meus tours/i,
    label: 'meus tours guia',
    path: '/guide-tours',
  },
  {
    authProfile: 'guide',
    expectedText: /Criar tour/i,
    label: 'criar tour guia',
    path: '/guide-tours/new',
  },
  { expectedText: /Sua experiencia/i, label: 'hub de experiencia', path: '/experience' },
  { expectedText: /Conversas/i, label: 'chats do turista', path: '/chats' },
  {
    expectedText: /Recomendados para voce/i,
    label: 'recomendacoes personalizadas',
    path: '/recommendations',
  },
  {
    expectedText: /Galeria da comunidade/i,
    label: 'galeria da comunidade',
    path: '/community-gallery',
  },
  { expectedText: /Cupons e promocoes/i, label: 'cupons', path: '/coupons' },
  { expectedText: /Modo offline/i, label: 'conteudo offline', path: '/offline' },
  {
    expectedText: /Sabores, arte e hospedagem/i,
    label: 'marketplace local',
    path: '/marketplace',
  },
  {
    expectedText: /No navegador, use o mapa interativo/i,
    label: 'fallback AR no navegador',
    path: '/ar-discovery',
  },
  {
    authProfile: 'guide',
    expectedText: /Conversas/i,
    label: 'chats do guia',
    path: '/guide-chats',
  },
  {
    authProfile: 'guide',
    expectedText: /Avaliacoes recebidas/i,
    label: 'avaliacoes do guia',
    path: '/guide-reviews',
  },
  {
    authProfile: 'guide',
    expectedText: /Financeiro/i,
    label: 'financeiro do guia',
    path: '/guide-finance',
  },
  {
    authProfile: 'guide',
    expectedText: /Estatisticas/i,
    label: 'estatisticas do guia',
    path: '/guide-statistics',
  },
  {
    authProfile: 'guide',
    expectedText: /Preferencias/i,
    label: 'perfil do guia',
    path: '/guide-profile',
  },
  {
    authProfile: 'guide',
    expectedText: /Tour em andamento/i,
    label: 'conducao de tour',
    path: '/guide-tour-live/local-booking-smoke',
  },
  {
    authProfile: 'guide',
    expectedText: /Editar tour/i,
    label: 'editar tour guia',
    path: '/guide-tours/new?tourId=memorias-do-teleferico',
  },
];

type QaAuthProfile = 'guide' | 'tourist' | 'unverifiedGuide';

function completedSession(profile: QaAuthProfile): string {
  return JSON.stringify({
    state: {
      activeProfile: profile === 'tourist' ? 'tourist' : 'guide',
      currentCommunityId: 'alemao',
      notificationsEnabled: true,
      onboardingCompleted: true,
      preferredCurrency: 'BRL',
      preferredLanguage: 'pt',
    },
    version: 0,
  });
}

function completedAuth(profile: QaAuthProfile): string {
  const isGuide = profile !== 'tourist';

  return JSON.stringify({
    state: {
      currentUser: {
        uid: isGuide ? 'seed-guide-teleferico' : 'local-tourist-qa',
        displayName: isGuide ? 'Luana Martins' : 'Visitante QA',
        email: isGuide ? 'luana@example.com' : 'qa@example.com',
        guideVerified: profile === 'guide',
        notificationsEnabled: true,
        preferredCurrency: 'BRL',
        preferredLanguage: 'pt',
        type: isGuide ? 'guide' : 'tourist',
      },
    },
    version: 0,
  });
}

async function primeCompletedSession(
  page: Page,
  profile: QaAuthProfile = 'tourist',
): Promise<void> {
  await page.addInitScript(
    (storage) => {
      if (!window.localStorage.getItem(storage.authKey)) {
        window.localStorage.setItem(storage.authKey, storage.authValue);
      }
      window.localStorage.setItem(storage.sessionKey, storage.sessionValue);
      window.localStorage.setItem(storage.bookingKey, storage.bookingValue);
      window.localStorage.setItem(storage.paymentKey, storage.paymentValue);
      if (window.sessionStorage.getItem(storage.favoritesResetFlagKey) !== '1') {
        window.localStorage.removeItem(storage.favoritesKey);
        window.sessionStorage.setItem(storage.favoritesResetFlagKey, '1');
      }
    },
    {
      authKey: authStorageKey,
      authValue: completedAuth(profile),
      bookingKey: bookingsStorageKey,
      bookingValue: completedBookings,
      paymentKey: paymentsStorageKey,
      paymentValue: completedPayments,
      favoritesKey: favoritesStorageKey,
      favoritesResetFlagKey,
      sessionKey: sessionStorageKey,
      sessionValue: completedSession(profile),
    },
  );
}

async function primeAnonymousSession(page: Page): Promise<void> {
  await page.addInitScript(
    (storage) => {
      window.localStorage.removeItem(storage.authKey);
      window.localStorage.setItem(storage.sessionKey, storage.sessionValue);
      window.localStorage.setItem(storage.bookingKey, storage.bookingValue);
      window.localStorage.setItem(storage.paymentKey, storage.paymentValue);
    },
    {
      authKey: authStorageKey,
      bookingKey: bookingsStorageKey,
      bookingValue: completedBookings,
      paymentKey: paymentsStorageKey,
      paymentValue: completedPayments,
      sessionKey: sessionStorageKey,
      sessionValue: completedSession('tourist'),
    },
  );
}

async function openRoute(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(1_000);
}

async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const hasOverflow = await page.evaluate(() => document.body.scrollWidth > window.innerWidth + 1);

  expect(hasOverflow).toBe(false);
}

async function dragHorizontalRail(page: Page, testId: string): Promise<number> {
  const rails = page.getByTestId(testId).filter({ visible: true });
  const railCount = await rails.count();

  expect(railCount).toBeGreaterThan(0);

  const rail = rails.first();
  await rail.scrollIntoViewIfNeeded();
  const box = await rail.boundingBox();

  if (!box) {
    throw new Error(`${testId} is not visible for drag validation.`);
  }

  const startX = box.x + box.width - 24;
  const endX = box.x + 24;
  const y = box.y + box.height / 2;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  await page.mouse.move(endX, y, { steps: 8 });
  await page.mouse.up();

  return rail.evaluate((element) => element.scrollLeft);
}

test.describe('mobile web QA', () => {
  for (const route of routeChecks) {
    test(`${route.label} renders a usable mobile screen`, async ({ page }) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));

      await primeCompletedSession(page, route.authProfile ?? 'tourist');
      await openRoute(page, route.path);

      await expect(page.getByText(route.expectedText).last()).toBeVisible();
      await expectNoHorizontalOverflow(page);
      expect(pageErrors).toEqual([]);
    });
  }

  test('first-run onboarding advances to language selection and home', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.addInitScript((key) => {
      window.localStorage.removeItem(key);
    }, sessionStorageKey);
    await openRoute(page, '/onboarding');

    await expect(page.getByText(/Turismo com escuta/i)).toBeVisible();
    await page
      .getByRole('button', { name: /^Continuar$/i })
      .last()
      .click();
    await expect(page.getByText(/Guias moradores/i)).toBeVisible();
    await page
      .getByRole('button', { name: /^Continuar$/i })
      .last()
      .click();
    await expect(page.getByText(/Reserva simples/i)).toBeVisible();
    await page
      .getByRole('button', { name: /Escolher idioma/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/language/);
    await expect(page.getByText(/Escolha o idioma/i)).toBeVisible();
    await page
      .getByRole('button', { name: /Portug/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText(/Historias reais/i).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('tour detail can save a local favorite and list it later', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/tour/memorias-do-teleferico');

    await page
      .getByRole('button', { name: /Salvar tour/i })
      .last()
      .click();
    await expect(page.getByText(/Tour salvo/i).last()).toBeVisible();

    await openRoute(page, '/favorites');

    await expect(page.getByText(/Mem/i).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('private routes redirect anonymous users to sign-in with return path', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeAnonymousSession(page);
    await openRoute(page, '/bookings');

    await expect(page).toHaveURL(/\/sign-in.*next/);
    await expect(page.getByText(/Entrar ou criar conta/i).last()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('local demo sign-in returns to the requested private route', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeAnonymousSession(page);
    await openRoute(page, '/bookings');

    await page.locator('input').nth(0).fill('qa@example.com');
    await page.locator('input').nth(1).fill('segredo123');
    await page
      .getByRole('button', { name: /Entrar com email/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/bookings/);
    await expect(page.getByText('Reservas').last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('profile editing persists after reload in local demo mode', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('dialog', (dialog) => void dialog.accept());
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/profile');

    await page.locator('input').first().fill('Visitante Revisado');
    await page
      .getByRole('button', { name: /Salvar perfil/i })
      .last()
      .click();
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText(/Visitante Revisado/i).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('logout clears local authenticated state and protects profile again', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/profile');

    await page
      .getByRole('button', { name: /^Sair$/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/sign-in.*next/);
    await expect(page.getByText(/Entrar ou criar conta/i).last()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('unverified guides are blocked from creating tours', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page, 'unverifiedGuide');
    await openRoute(page, '/guide-tours/new');

    await expect(page.getByText(/Verificacao pendente/i).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('home POI preview rail supports horizontal drag on web', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/');

    const scrollLeft = await dragHorizontalRail(page, 'poi-preview-rail');

    expect(scrollLeft).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('home featured tour rail supports horizontal drag on web', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/');

    const scrollLeft = await dragHorizontalRail(page, 'featured-tour-rail');

    expect(scrollLeft).toBeGreaterThan(0);
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('map selected POI opens a detail screen', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await primeCompletedSession(page);
    await openRoute(page, '/map');

    await page
      .getByRole('button', { name: /Ver detalhes do ponto/i })
      .last()
      .click();

    await expect(page).toHaveURL(/\/poi\/estacao-teleferico-alemao/);
    await expect(page.getByText(/Detalhe do ponto turistico/i).last()).toBeVisible();
    await expectNoHorizontalOverflow(page);
    expect(pageErrors).toEqual([]);
  });

  test('offline pack downloads and survives reload', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await primeCompletedSession(page);
    await openRoute(page, '/offline');
    await page.getByRole('button', { name: /Baixar conteudo/i }).click();
    await expect(page.getByText(/Conteudo disponivel offline/i)).toBeVisible();
    await page.reload();
    await expect(page.getByText(/Conteudo disponivel offline/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('marketplace sends a local authenticated inquiry', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('dialog', (dialog) => void dialog.accept());
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await primeCompletedSession(page);
    await openRoute(page, '/marketplace');
    await page
      .getByRole('button', { name: /Pedir disponibilidade/i })
      .first()
      .click();
    await page.getByLabel(/Conte a data/i).fill('Duas pessoas no proximo sabado pela manha.');
    await page.getByRole('button', { name: /^Enviar$/i }).click();
    await expect(page.getByText(/Pedido enviado/i).first()).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('booking creates a chat and sends a local message', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await primeCompletedSession(page);
    await openRoute(page, '/booking/local-booking-smoke');
    await page.getByRole('button', { name: /Conversar com o guia/i }).click();
    await expect(page).toHaveURL(/\/chat\//);
    await page.getByLabel(/Escreva uma mensagem/i).fill('Podemos confirmar o ponto de encontro?');
    await page.getByRole('button', { name: /^Enviar$/i }).click();
    await expect(page.getByText(/Podemos confirmar/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('coupon changes the demo checkout amount without client pricing input', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await primeCompletedSession(page);
    await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
      key: paymentsStorageKey,
      value: JSON.stringify({ state: { localPayments: [] }, version: 0 }),
    });
    await openRoute(page, '/payment/local-booking-smoke');
    await page.getByLabel(/Codigo do cupom/i).fill('BEMVINDO10');
    await page.getByRole('button', { name: /Aplicar cupom/i }).click();
    await expect(page.getByText(/Cupom aplicado/i)).toBeVisible();
    await expect(page.getByText(/R\$\s*144/i)).toBeVisible();
    expect(pageErrors).toEqual([]);
  });

  test('completed booking can submit one review', async ({ page }) => {
    const pageErrors: string[] = [];
    page.on('dialog', (dialog) => void dialog.accept());
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await primeCompletedSession(page);
    await page.addInitScript(({ key, value }) => window.localStorage.setItem(key, value), {
      key: bookingsStorageKey,
      value: JSON.stringify({
        state: { localBookings: [{ ...qaBooking, status: 'completed' }] },
        version: 0,
      }),
    });
    await openRoute(page, '/review/local-booking-smoke');
    await page.getByLabel(/^Comentario$/i).fill('Uma experiencia excelente e muito bem conduzida.');
    await page.getByRole('button', { name: /Publicar avaliacao/i }).click();
    await expect(page).toHaveURL(/\/booking\/local-booking-smoke/);
    expect(pageErrors).toEqual([]);
  });
});
