export type MonitoringConfig = {
  readonly dsn: string | null;
  readonly enabled: boolean;
  readonly environment: string;
  readonly release: string;
  readonly tracesSampleRate: number;
};

type MonitoringEnv = {
  readonly EXPO_PUBLIC_SENTRY_DSN?: string;
  readonly EXPO_PUBLIC_SENTRY_ENVIRONMENT?: string;
  readonly EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE?: string;
  readonly NODE_ENV?: string;
};

const defaultRelease = 'conexao-favela-mobile@0.0.0';

export function parseSentrySampleRate(value: string | undefined, fallback = 0.05): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, parsed));
}

function normalizeEnvValue(value: string | undefined): string | null {
  const normalized = value?.trim();

  return normalized && normalized.length > 0 ? normalized : null;
}

function resolveEnvironment(env: MonitoringEnv): string {
  return (
    normalizeEnvValue(env.EXPO_PUBLIC_SENTRY_ENVIRONMENT) ??
    (env.NODE_ENV === 'production' ? 'production' : 'development')
  );
}

export function resolveMonitoringConfig(
  env: MonitoringEnv,
  appVersion: string | undefined,
): MonitoringConfig {
  const dsn = normalizeEnvValue(env.EXPO_PUBLIC_SENTRY_DSN);
  const release = appVersion ? `conexao-favela-mobile@${appVersion}` : defaultRelease;

  return {
    dsn,
    enabled: dsn !== null,
    environment: resolveEnvironment(env),
    release,
    tracesSampleRate: parseSentrySampleRate(env.EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE),
  };
}
