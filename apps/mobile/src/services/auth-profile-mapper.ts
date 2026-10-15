import {
  SUPPORTED_CURRENCY_CODES,
  SUPPORTED_LANGUAGE_CODES,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import type { AuthenticatedProfile } from '@/stores/auth-store';

export type FirestoreUserData = {
  readonly displayName?: unknown;
  readonly email?: unknown;
  readonly guideProfile?: {
    readonly verified?: unknown;
  };
  readonly notificationsEnabled?: unknown;
  readonly preferredCurrency?: unknown;
  readonly preferredLanguage?: unknown;
  readonly type?: unknown;
};

const DEFAULT_CURRENCY = 'BRL';
const DEFAULT_LANGUAGE: SupportedLanguageCode = 'pt';
const DEFAULT_NOTIFICATIONS_ENABLED = true;

function resolvePreferredCurrency(value: unknown): AuthenticatedProfile['preferredCurrency'] {
  return SUPPORTED_CURRENCY_CODES.some((code) => code === value)
    ? (value as AuthenticatedProfile['preferredCurrency'])
    : DEFAULT_CURRENCY;
}

function resolvePreferredLanguage(value: unknown): SupportedLanguageCode {
  return SUPPORTED_LANGUAGE_CODES.some((code) => code === value)
    ? (value as SupportedLanguageCode)
    : DEFAULT_LANGUAGE;
}

export function mapFirestoreUserToAuthenticatedProfile(
  uid: string,
  data: FirestoreUserData,
): AuthenticatedProfile {
  const type = data.type === 'guide' ? 'guide' : 'tourist';

  return {
    uid,
    displayName: typeof data.displayName === 'string' ? data.displayName : 'Viajante',
    email: typeof data.email === 'string' ? data.email : '',
    guideVerified: data.guideProfile?.verified === true,
    notificationsEnabled:
      typeof data.notificationsEnabled === 'boolean'
        ? data.notificationsEnabled
        : DEFAULT_NOTIFICATIONS_ENABLED,
    preferredCurrency: resolvePreferredCurrency(data.preferredCurrency),
    preferredLanguage: resolvePreferredLanguage(data.preferredLanguage),
    type,
  };
}
