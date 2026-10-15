import { describe, expect, it } from 'vitest';
import { hasGoogleOAuthClientForPlatform, resolveGoogleOAuthClientIds } from './google-auth-config';

describe('Google OAuth configuration', () => {
  it('normalizes empty environment values without inventing credentials', () => {
    expect(
      resolveGoogleOAuthClientIds({ android: ' ', ios: 'ios-client', web: undefined }),
    ).toEqual({
      android: undefined,
      ios: 'ios-client',
      web: undefined,
    });
  });

  it('requires a client id for the current native platform', () => {
    const clientIds = { android: 'android-client', ios: 'ios-client' };

    expect(hasGoogleOAuthClientForPlatform('android', clientIds)).toBe(true);
    expect(hasGoogleOAuthClientForPlatform('ios', clientIds)).toBe(true);
    expect(hasGoogleOAuthClientForPlatform('web', clientIds)).toBe(false);
  });
});
