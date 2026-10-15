import { describe, expect, it } from 'vitest';
import { mapFirestoreUserToAuthenticatedProfile } from './auth-profile-mapper';

describe('auth service profile mapping', () => {
  it('maps a Firestore guide profile into the authenticated session shape', () => {
    const profile = mapFirestoreUserToAuthenticatedProfile('guide-1', {
      displayName: 'Luana Martins',
      email: 'luana@example.com',
      guideProfile: { verified: true },
      notificationsEnabled: false,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      type: 'guide',
    });

    expect(profile).toEqual({
      uid: 'guide-1',
      displayName: 'Luana Martins',
      email: 'luana@example.com',
      guideVerified: true,
      notificationsEnabled: false,
      preferredCurrency: 'USD',
      preferredLanguage: 'en',
      type: 'guide',
    });
  });

  it('falls back defensively when Firestore preferences are missing or invalid', () => {
    const profile = mapFirestoreUserToAuthenticatedProfile('tourist-1', {
      displayName: 'Visitante',
      email: 'visitante@example.com',
      notificationsEnabled: 'yes',
      preferredCurrency: 'BTC',
      preferredLanguage: 'xx',
      type: 'tourist',
    });

    expect(profile).toMatchObject({
      guideVerified: false,
      notificationsEnabled: true,
      preferredCurrency: 'BRL',
      preferredLanguage: 'pt',
      type: 'tourist',
    });
  });
});
