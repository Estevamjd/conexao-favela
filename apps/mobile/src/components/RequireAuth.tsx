import { Redirect, usePathname, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useAuthStore } from '@/stores/auth-store';
import { useAppTheme } from '@/theme/useAppTheme';

type RequireAuthProps = {
  readonly allowUnverifiedGuide?: boolean;
  readonly children: ReactNode;
  readonly role?: 'guide' | 'tourist';
};

function signInRoute(next: string): Href {
  return {
    params: {
      next,
    },
    pathname: '/(auth)/sign-in',
  };
}

export function RequireAuth({ allowUnverifiedGuide = false, children, role }: RequireAuthProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('common');
  const pathname = usePathname();
  const authReady = useAuthStore((state) => state.authReady);
  const currentUser = useAuthStore((state) => state.currentUser);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const ready = authReady && hasHydrated;

  if (!ready) {
    return (
      <Screen>
        <InfoCard description={t('sessionLoadingBody')} title={t('sessionLoadingTitle')}>
          <View>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        </InfoCard>
      </Screen>
    );
  }

  if (!currentUser) {
    return <Redirect href={signInRoute(pathname)} />;
  }

  if (role && currentUser.type !== role) {
    return <Redirect href={currentUser.type === 'guide' ? '/(guide)' : '/(tourist)'} />;
  }

  if (role === 'guide' && !allowUnverifiedGuide && !currentUser.guideVerified) {
    return (
      <Screen>
        <InfoCard description={t('guideVerificationBody')} title={t('guideVerificationTitle')} />
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('guideVerificationReason')}
        </AppText>
      </Screen>
    );
  }

  return <>{children}</>;
}
