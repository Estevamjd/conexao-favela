import { describe, expect, it } from 'vitest';

import { parseSentrySampleRate, resolveMonitoringConfig } from './monitoring-config';

describe('monitoring config', () => {
  it('keeps monitoring disabled until a Sentry DSN is configured', () => {
    expect(resolveMonitoringConfig({}, '0.1.0')).toEqual({
      dsn: null,
      enabled: false,
      environment: 'development',
      release: 'conexao-favela-mobile@0.1.0',
      tracesSampleRate: 0.05,
    });
  });

  it('resolves production Sentry settings from public env vars', () => {
    expect(
      resolveMonitoringConfig(
        {
          EXPO_PUBLIC_SENTRY_DSN: ' https://public@example.ingest.sentry.io/1 ',
          EXPO_PUBLIC_SENTRY_ENVIRONMENT: 'preview',
          EXPO_PUBLIC_SENTRY_TRACES_SAMPLE_RATE: '0.25',
          NODE_ENV: 'production',
        },
        '0.2.0',
      ),
    ).toEqual({
      dsn: 'https://public@example.ingest.sentry.io/1',
      enabled: true,
      environment: 'preview',
      release: 'conexao-favela-mobile@0.2.0',
      tracesSampleRate: 0.25,
    });
  });

  it('clamps invalid sample rates instead of trusting env text blindly', () => {
    expect(parseSentrySampleRate('oops')).toBe(0.05);
    expect(parseSentrySampleRate('-1')).toBe(0);
    expect(parseSentrySampleRate('2')).toBe(1);
  });
});
