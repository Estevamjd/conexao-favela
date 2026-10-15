import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '@/components/RequireAuth';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideLayout() {
  const theme = useAppTheme();
  const { t } = useTranslation(['guide', 'experience']);

  return (
    <RequireAuth allowUnverifiedGuide role="guide">
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: theme.colors.background },
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.background },
          headerTintColor: theme.colors.textPrimary,
        }}
      >
        <Stack.Screen name="index" options={{ title: t('guide:dashboardTitle') }} />
        <Stack.Screen name="guide-bookings" options={{ title: t('guide:bookingsTitle') }} />
        <Stack.Screen
          name="guide-booking/[bookingId]"
          options={{ title: t('guide:bookingDetailTitle') }}
        />
        <Stack.Screen name="guide-tours/index" options={{ title: t('guide:toursTitle') }} />
        <Stack.Screen name="guide-tours/new" options={{ title: t('guide:createTourTitle') }} />
        <Stack.Screen name="guide-chats" options={{ title: t('experience:chatListTitle') }} />
        <Stack.Screen name="guide-chat/[chatId]" options={{ title: t('experience:chatTitle') }} />
        <Stack.Screen name="guide-reviews" options={{ title: t('experience:reviewsTitle') }} />
        <Stack.Screen name="guide-finance" options={{ title: t('experience:financeTitle') }} />
        <Stack.Screen
          name="guide-statistics"
          options={{ title: t('experience:statisticsTitle') }}
        />
        <Stack.Screen name="guide-profile" options={{ title: t('experience:guideProfileTitle') }} />
        <Stack.Screen
          name="guide-tour-live/[bookingId]"
          options={{ title: t('experience:liveTourTitle') }}
        />
      </Stack>
    </RequireAuth>
  );
}
