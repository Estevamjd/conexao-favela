import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  SUPPORTED_CURRENCY_CODES,
  SUPPORTED_LANGUAGE_CODES,
  type CurrencyCode,
  type SupportedLanguageCode,
  type UserType,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';

export type AuthenticatedProfile = {
  readonly uid: string;
  readonly displayName: string;
  readonly email: string;
  readonly guideVerified: boolean;
  readonly notificationsEnabled: boolean;
  readonly preferredCurrency: CurrencyCode;
  readonly preferredLanguage: SupportedLanguageCode;
  readonly type: Exclude<UserType, 'admin'>;
};

type AuthState = {
  readonly authReady: boolean;
  readonly currentUser: AuthenticatedProfile | null;
  readonly error: string | null;
  readonly hasHydrated: boolean;
  readonly clearCurrentUser: () => void;
  readonly loading: boolean;
  readonly setAuthReady: (ready: boolean) => void;
  readonly setCurrentUser: (user: AuthenticatedProfile | null) => void;
  readonly setError: (error: string | null) => void;
  readonly setHasHydrated: (hydrated: boolean) => void;
  readonly setLoading: (loading: boolean) => void;
};

type PersistedAuthState = Pick<AuthState, 'currentUser'>;

const inMemoryAuthStorage = new Map<string, string>();

function getAuthStorage(): StateStorage {
  if (typeof window !== 'undefined') {
    return AsyncStorage;
  }

  return {
    getItem: (name) => inMemoryAuthStorage.get(name) ?? null,
    removeItem: (name) => {
      inMemoryAuthStorage.delete(name);
    },
    setItem: (name, value) => {
      inMemoryAuthStorage.set(name, value);
    },
  };
}

function isSupportedLanguage(language: unknown): language is SupportedLanguageCode {
  return typeof language === 'string' && SUPPORTED_LANGUAGE_CODES.some((code) => code === language);
}

function isSupportedCurrency(currency: unknown): currency is CurrencyCode {
  return typeof currency === 'string' && SUPPORTED_CURRENCY_CODES.some((code) => code === currency);
}

export function isAuthenticatedProfileSnapshot(value: unknown): value is AuthenticatedProfile {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const profile = value as Partial<AuthenticatedProfile>;

  return (
    typeof profile.uid === 'string' &&
    profile.uid.length > 0 &&
    typeof profile.displayName === 'string' &&
    profile.displayName.length > 0 &&
    typeof profile.email === 'string' &&
    typeof profile.guideVerified === 'boolean' &&
    typeof profile.notificationsEnabled === 'boolean' &&
    isSupportedCurrency(profile.preferredCurrency) &&
    isSupportedLanguage(profile.preferredLanguage) &&
    (profile.type === 'tourist' || profile.type === 'guide')
  );
}

function isPersistedAuthState(value: unknown): value is Partial<PersistedAuthState> {
  return typeof value === 'object' && value !== null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      authReady: false,
      currentUser: null,
      error: null,
      hasHydrated: false,
      loading: false,
      clearCurrentUser: () => set({ currentUser: null, error: null, loading: false }),
      setAuthReady: (ready) => set({ authReady: ready }),
      setCurrentUser: (user) => set({ currentUser: user, error: null }),
      setError: (error) => set({ error }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setLoading: (loading) => set({ loading }),
    }),
    {
      merge: (persistedState, currentState) => {
        if (!isPersistedAuthState(persistedState)) {
          return currentState;
        }

        return {
          ...currentState,
          currentUser: isAuthenticatedProfileSnapshot(persistedState.currentUser)
            ? persistedState.currentUser
            : null,
        };
      },
      name: 'conexao-favela:auth:v1',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state): PersistedAuthState => ({
        currentUser: state.currentUser,
      }),
      storage: createJSONStorage(getAuthStorage),
    },
  ),
);
