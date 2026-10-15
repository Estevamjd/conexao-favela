import { beforeEach, describe, expect, it } from 'vitest';
import {
  isAuthenticatedProfileSnapshot,
  useAuthStore,
  type AuthenticatedProfile,
} from './auth-store';

const touristProfile: AuthenticatedProfile = {
  uid: 'tourist-1',
  displayName: 'Ana Silva',
  email: 'ana@example.com',
  guideVerified: false,
  notificationsEnabled: true,
  preferredCurrency: 'BRL',
  preferredLanguage: 'pt',
  type: 'tourist',
};

describe('auth store', () => {
  beforeEach(() => {
    useAuthStore.setState({
      authReady: false,
      currentUser: null,
      error: null,
      hasHydrated: true,
      loading: false,
    });
  });

  it('guards persisted profiles before rehydrating a session', () => {
    const legacyProfileWithoutPreferences: unknown = {
      uid: 'legacy-user',
      displayName: 'Legacy User',
      email: 'legacy@example.com',
      guideVerified: false,
      preferredLanguage: 'pt',
      type: 'tourist',
    };

    expect(isAuthenticatedProfileSnapshot(touristProfile)).toBe(true);
    expect(isAuthenticatedProfileSnapshot(legacyProfileWithoutPreferences)).toBe(false);
  });

  it('clears authenticated user state without touching auth readiness', () => {
    useAuthStore.getState().setAuthReady(true);
    useAuthStore.getState().setCurrentUser(touristProfile);

    useAuthStore.getState().clearCurrentUser();

    expect(useAuthStore.getState().currentUser).toBeNull();
    expect(useAuthStore.getState().authReady).toBe(true);
    expect(useAuthStore.getState().error).toBeNull();
  });
});
