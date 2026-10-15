type SmokeRoute = {
  readonly label: string;
  readonly path: string;
};

type SmokeResult = {
  readonly label: string;
  readonly url: string;
  readonly status: number | null;
  readonly ok: boolean;
  readonly shellLoaded: boolean;
  readonly error?: string;
};

const defaultBaseUrls = ['http://localhost:8081/', 'http://127.0.0.1:8081/'] as const;

const routes: readonly SmokeRoute[] = [
  { label: 'home turista', path: '/' },
  { label: 'explorar tours', path: '/explore' },
  { label: 'detalhe de tour', path: '/tour/memorias-do-teleferico' },
  { label: 'perfil publico do guia', path: '/guide/seed-guide-teleferico' },
  { label: 'reservar tour', path: '/book/memorias-do-teleferico' },
  { label: 'pagamento de reserva', path: '/payment/local-booking-smoke' },
  {
    label: 'retorno de pagamento aprovado',
    path: '/payment-return/success?paymentId=local-payment-qa',
  },
  {
    label: 'retorno de checkout cancelado',
    path: '/payment-return/cancel?paymentId=local-payment-qa',
  },
  { label: 'historico de pagamentos', path: '/payments' },
  { label: 'detalhe de reserva', path: '/booking/local-booking-smoke' },
  { label: 'mapa de POIs', path: '/map' },
  { label: 'detalhe de POI', path: '/poi/estacao-teleferico-alemao' },
  { label: 'favoritos', path: '/favorites' },
  { label: 'reservas', path: '/bookings' },
  { label: 'notificacoes', path: '/notifications' },
  { label: 'perfil', path: '/profile' },
  { label: 'onboarding', path: '/onboarding' },
  { label: 'login/cadastro', path: '/sign-in' },
  { label: 'tipo de perfil', path: '/profile-type' },
  { label: 'cadastro de guia', path: '/guide-registration' },
  { label: 'agenda do guia', path: '/guide-bookings' },
  { label: 'detalhe de agendamento do guia', path: '/guide-booking/local-booking-smoke' },
  { label: 'meus tours guia', path: '/guide-tours' },
  { label: 'criar tour guia', path: '/guide-tours/new' },
  { label: 'hub de experiencia', path: '/experience' },
  { label: 'chats do turista', path: '/chats' },
  { label: 'recomendacoes', path: '/recommendations' },
  { label: 'galeria', path: '/community-gallery' },
  { label: 'cupons', path: '/coupons' },
  { label: 'offline', path: '/offline' },
  { label: 'marketplace', path: '/marketplace' },
  { label: 'realidade aumentada', path: '/ar-discovery' },
  { label: 'chats do guia', path: '/guide-chats' },
  { label: 'avaliacoes do guia', path: '/guide-reviews' },
  { label: 'financeiro do guia', path: '/guide-finance' },
  { label: 'estatisticas do guia', path: '/guide-statistics' },
  { label: 'perfil do guia', path: '/guide-profile' },
  { label: 'tour em andamento', path: '/guide-tour-live/local-booking-smoke' },
  { label: 'editar tour guia', path: '/guide-tours/new?tourId=memorias-do-teleferico' },
];

function normalizeBaseUrl(rawBaseUrl: string): URL {
  return new URL(rawBaseUrl.endsWith('/') ? rawBaseUrl : `${rawBaseUrl}/`);
}

function resolveBaseUrlCandidates(): readonly URL[] {
  const rawBaseUrl = process.env.SMOKE_BASE_URL;

  if (rawBaseUrl) {
    return [normalizeBaseUrl(rawBaseUrl)];
  }

  return defaultBaseUrls.map((baseUrl) => normalizeBaseUrl(baseUrl));
}

async function canReachBaseUrl(baseUrl: URL): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(baseUrl, {
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function selectBaseUrl(candidates: readonly URL[]): Promise<URL> {
  // Windows/Expo may bind Metro to IPv6 localhost while 127.0.0.1 refuses
  // connections, so the smoke keeps a deterministic fallback before testing routes.
  for (const candidate of candidates) {
    if (await canReachBaseUrl(candidate)) {
      return candidate;
    }
  }

  return candidates[0] ?? normalizeBaseUrl(defaultBaseUrls[0]);
}

async function probeRoute(baseUrl: URL, route: SmokeRoute): Promise<SmokeResult> {
  const url = new URL(route.path, baseUrl).toString();
  const controller = new AbortController();
  const timeoutId: ReturnType<typeof setTimeout> = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      headers: { accept: 'text/html,application/xhtml+xml' },
      signal: controller.signal,
    });
    const body = await response.text();
    const shellLoaded = body.includes('id="root"') || body.includes('__EXPO_ROUTER');

    return {
      label: route.label,
      url,
      status: response.status,
      ok: response.ok && shellLoaded,
      shellLoaded,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';

    return {
      label: route.label,
      url,
      status: null,
      ok: false,
      shellLoaded: false,
      error: message,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

const baseUrl = await selectBaseUrl(resolveBaseUrlCandidates());
const results: SmokeResult[] = [];

for (const route of routes) {
  results.push(await probeRoute(baseUrl, route));
}
const failures = results.filter((result) => !result.ok);

console.table(
  results.map((result) => ({
    rota: result.label,
    status: result.status ?? 'erro',
    shell: result.shellLoaded ? 'ok' : 'falhou',
    url: result.url,
  })),
);

if (failures.length > 0) {
  console.error('\nSmoke test mobile web falhou nas rotas:');
  failures.forEach((failure) => {
    const statusMessage =
      failure.status === null ? 'sem resposta' : `HTTP ${String(failure.status)}`;
    console.error(`- ${failure.label}: ${failure.error ?? statusMessage}`);
  });
  process.exitCode = 1;
}

export {};
