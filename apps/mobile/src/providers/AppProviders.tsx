import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import i18n from '@/i18n';
import { useAuthBootstrap } from '@/hooks/useAuthBootstrap';
import { setMonitoringUserContext } from '@/services/monitoring-service';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { ThemeContext } from '@/theme/ThemeContext';
import type { AppTheme } from '@/theme/tokens';

type AppProvidersProps = {
  readonly children: ReactNode;
  readonly theme: AppTheme;
};

export function AppProviders({ children, theme }: AppProvidersProps) {
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const preferredLanguage = useSessionStore((state) => state.preferredLanguage);
  useAuthBootstrap();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 30,
            retry: 1,
            staleTime: 1000 * 60,
          },
        },
      }),
  );

  useEffect(() => {
    if (i18n.resolvedLanguage !== preferredLanguage) {
      void i18n.changeLanguage(preferredLanguage);
    }
  }, [preferredLanguage]);

  useEffect(() => {
    setMonitoringUserContext(
      currentUser
        ? {
            communityId: currentCommunityId,
            guideVerified: currentUser.guideVerified,
            type: currentUser.type,
            uid: currentUser.uid,
          }
        : null,
    );
  }, [currentCommunityId, currentUser]);

  return (
    <SafeAreaProvider>
      <ThemeContext.Provider value={theme}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ThemeContext.Provider>
    </SafeAreaProvider>
  );
}
