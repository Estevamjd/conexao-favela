import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  INITIAL_COMMUNITY_ID,
  SUPPORTED_CURRENCY_CODES,
  SUPPORTED_LANGUAGE_CODES,
  type CurrencyCode,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { detectInitialLanguage } from '@/i18n/language-detection';

export type ActiveProfile = 'tourist' | 'guide';

type SessionState = {
  readonly activeProfile: ActiveProfile;
  readonly currentCommunityId: string;
  readonly hasHydrated: boolean;
  readonly notificationsEnabled: boolean;
  readonly onboardingCompleted: boolean;
  readonly markOnboardingCompleted: () => void;
  readonly preferredCurrency: CurrencyCode;
  readonly preferredLanguage: SupportedLanguageCode;
  readonly setActiveProfile: (profile: ActiveProfile) => void;
  readonly setCurrentCommunityId: (communityId: string) => void;
  readonly setHasHydrated: (hydrated: boolean) => void;
  readonly setNotificationsEnabled: (enabled: boolean) => void;
  readonly setPreferredCurrency: (currency: CurrencyCode) => void;
  readonly setPreferredLanguage: (language: SupportedLanguageCode) => void;
};

type PersistedSessionState = Pick<
  SessionState,
  | 'activeProfile'
  | 'currentCommunityId'
  | 'notificationsEnabled'
  | 'onboardingCompleted'
  | 'preferredCurrency'
  | 'preferredLanguage'
>;

function isSupportedLanguage(language: unknown): language is SupportedLanguageCode {
  return typeof language === 'string' && SUPPORTED_LANGUAGE_CODES.some((code) => code === language);
}

function isSupportedCurrency(currency: unknown): currency is CurrencyCode {
  return typeof currency === 'string' && SUPPORTED_CURRENCY_CODES.some((code) => code === currency);
}

function isPersistedSessionState(value: unknown): value is Partial<PersistedSessionState> {
  return typeof value === 'object' && value !== null;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activeProfile: 'tourist',
      currentCommunityId: INITIAL_COMMUNITY_ID,
      hasHydrated: false,
      notificationsEnabled: true,
      onboardingCompleted: false,
      markOnboardingCompleted: () => set({ onboardingCompleted: true }),
      preferredCurrency: 'BRL',
      preferredLanguage: detectInitialLanguage(),
      setActiveProfile: (profile) => set({ activeProfile: profile }),
      setCurrentCommunityId: (communityId) => set({ currentCommunityId: communityId }),
      setHasHydrated: (hydrated) => set({ hasHydrated: hydrated }),
      setNotificationsEnabled: (enabled) => set({ notificationsEnabled: enabled }),
      setPreferredCurrency: (currency) => set({ preferredCurrency: currency }),
      setPreferredLanguage: (language) => set({ preferredLanguage: language }),
    }),
    {
      merge: (persistedState, currentState) => {
        if (!isPersistedSessionState(persistedState)) {
          return currentState;
        }

        return {
          ...currentState,
          activeProfile:
            persistedState.activeProfile === 'guide' || persistedState.activeProfile === 'tourist'
              ? persistedState.activeProfile
              : currentState.activeProfile,
          currentCommunityId:
            typeof persistedState.currentCommunityId === 'string'
              ? persistedState.currentCommunityId
              : currentState.currentCommunityId,
          notificationsEnabled:
            typeof persistedState.notificationsEnabled === 'boolean'
              ? persistedState.notificationsEnabled
              : currentState.notificationsEnabled,
          onboardingCompleted:
            typeof persistedState.onboardingCompleted === 'boolean'
              ? persistedState.onboardingCompleted
              : currentState.onboardingCompleted,
          preferredCurrency: isSupportedCurrency(persistedState.preferredCurrency)
            ? persistedState.preferredCurrency
            : currentState.preferredCurrency,
          preferredLanguage: isSupportedLanguage(persistedState.preferredLanguage)
            ? persistedState.preferredLanguage
            : currentState.preferredLanguage,
        };
      },
      name: 'conexao-favela:session:v1',
      // The root route waits for hydration so returning users do not briefly see onboarding again.
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
      partialize: (state): PersistedSessionState => ({
        activeProfile: state.activeProfile,
        currentCommunityId: state.currentCommunityId,
        notificationsEnabled: state.notificationsEnabled,
        onboardingCompleted: state.onboardingCompleted,
        preferredCurrency: state.preferredCurrency,
        preferredLanguage: state.preferredLanguage,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
