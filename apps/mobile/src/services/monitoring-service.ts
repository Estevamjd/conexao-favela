import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import type { ComponentType } from 'react';

import { resolveMonitoringConfig, type MonitoringConfig } from '@/services/monitoring-config';

type MonitoringUserContext = {
  readonly communityId: string;
  readonly guideVerified?: boolean;
  readonly type: 'admin' | 'guide' | 'tourist';
  readonly uid: string;
};

let initializedConfig: MonitoringConfig | null = null;

function currentAppVersion(): string | undefined {
  return Constants.expoConfig?.version;
}

export function initializeMonitoring(): MonitoringConfig {
  const config = resolveMonitoringConfig(process.env, currentAppVersion());

  if (!config.enabled || initializedConfig) {
    initializedConfig = initializedConfig ?? config;

    return initializedConfig;
  }

  Sentry.init({
    dsn: config.dsn ?? undefined,
    enableAutoSessionTracking: true,
    environment: config.environment,
    release: config.release,
    sendDefaultPii: false,
    tracesSampleRate: config.tracesSampleRate,
  });

  initializedConfig = config;

  return config;
}

export function withMonitoring<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  const config = initializeMonitoring();

  return config.enabled
    ? (Sentry.wrap(Component as ComponentType<Record<string, unknown>>) as ComponentType<P>)
    : Component;
}

export function setMonitoringUserContext(context: MonitoringUserContext | null): void {
  if (!initializedConfig?.enabled) {
    return;
  }

  if (!context) {
    Sentry.setUser(null);
    Sentry.setTag('account_type', null);
    Sentry.setTag('community_id', null);
    Sentry.setTag('guide_verified', null);

    return;
  }

  Sentry.setUser({ id: context.uid });
  Sentry.setTag('account_type', context.type);
  Sentry.setTag('community_id', context.communityId);
  Sentry.setTag(
    'guide_verified',
    context.type === 'guide' ? String(context.guideVerified === true) : null,
  );
}
