export type GoogleOAuthClientIds = {
  readonly android?: string;
  readonly ios?: string;
  readonly web?: string;
};

function normalizeClientId(value: string | undefined): string | undefined {
  const normalized = value?.trim();

  if (normalized === '') {
    return undefined;
  }

  return normalized;
}

export function resolveGoogleOAuthClientIds(input: GoogleOAuthClientIds): GoogleOAuthClientIds {
  return {
    android: normalizeClientId(input.android),
    ios: normalizeClientId(input.ios),
    web: normalizeClientId(input.web),
  };
}

export const googleOAuthClientIds = resolveGoogleOAuthClientIds({
  android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  web: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
});

export function hasGoogleOAuthClientForPlatform(
  platform: 'android' | 'ios' | 'web',
  clientIds: GoogleOAuthClientIds = googleOAuthClientIds,
): boolean {
  return Boolean(clientIds[platform]);
}
