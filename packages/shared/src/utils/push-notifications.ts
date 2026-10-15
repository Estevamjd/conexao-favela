export const PUSH_REGISTRATION_STATUSES = [
  'idle',
  'requesting',
  'granted',
  'denied',
  'unsupported',
  'unavailable',
  'error',
] as const;

export type PushRegistrationStatus = (typeof PUSH_REGISTRATION_STATUSES)[number];

export type PushRegistrationProvider = 'expo' | 'none' | 'web-preview';

export type PushRegistrationSnapshot = {
  readonly errorMessage?: string;
  readonly provider: PushRegistrationProvider;
  readonly status: PushRegistrationStatus;
  readonly token?: string;
  readonly updatedAtIso?: string;
};

export const DEFAULT_PUSH_REGISTRATION: PushRegistrationSnapshot = {
  provider: 'none',
  status: 'idle',
};

export function isPushRegistrationSnapshot(value: unknown): value is PushRegistrationSnapshot {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as {
    readonly provider?: unknown;
    readonly status?: unknown;
  };

  return (
    typeof candidate.provider === 'string' &&
    ['expo', 'none', 'web-preview'].includes(candidate.provider) &&
    typeof candidate.status === 'string' &&
    PUSH_REGISTRATION_STATUSES.some((status) => status === candidate.status)
  );
}

export function hasUsablePushToken(registration: PushRegistrationSnapshot): boolean {
  return (
    registration.status === 'granted' &&
    typeof registration.token === 'string' &&
    registration.token.length > 0
  );
}
