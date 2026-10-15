import { INITIAL_COMMUNITY, INITIAL_POIS, resolveLocalizedText } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CheckCircle2, MapPinned, Navigation } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { CommunityMap } from '@/features/pois/CommunityMap';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { useSessionStore } from '@/stores/session-store';
import { useTourProgressStore } from '@/stores/tour-progress-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideLiveTourRoute() {
  const { t } = useTranslation(['experience', 'guide']);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : '';
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const currentUser = useAuthStore((state) => state.currentUser);
  const { bookings } = useCurrentUserBookings();
  const { tours } = useCommunityTours(communityId);
  const index = useTourProgressStore((state) => state.currentStopByBooking[bookingId] ?? 0);
  const advance = useTourProgressStore((state) => state.advance);
  const reset = useTourProgressStore((state) => state.reset);
  const checkOut = useBookingStore((state) => state.checkOutBooking);
  const booking = bookings.find(
    (item) => item.id === bookingId && item.guideId === resolveActiveGuideId(currentUser),
  );
  const tour = tours.find((item) => item.id === booking?.tourId);
  const routePois =
    tour?.route.points
      .slice()
      .sort((first, second) => first.order - second.order)
      .map((point) => INITIAL_POIS.find((poi) => poi.id === point.poiId))
      .filter((poi): poi is (typeof INITIAL_POIS)[number] => poi !== undefined) ?? [];
  const currentPoi = routePois[index];

  if (!booking || !tour || !currentPoi) {
    return (
      <Screen>
        <PrimaryButton onPress={() => router.back()} variant="ghost">
          {t('experience:back')}
        </PrimaryButton>
        <InfoCard
          description={t('guide:bookingNotFoundBody')}
          title={t('guide:bookingNotFoundTitle')}
        />
      </Screen>
    );
  }

  const isLast = index >= routePois.length - 1;
  return (
    <Screen>
      <PrimaryButton
        icon={<ArrowLeft color={theme.colors.primary} size={18} />}
        onPress={() => router.back()}
        variant="ghost"
      >
        {t('experience:back')}
      </PrimaryButton>
      <View style={styles.header}>
        <Navigation color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('experience:liveTourTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {resolveLocalizedText(tour.title, language)}
        </AppText>
      </View>
      <View style={[styles.map, { borderColor: theme.colors.border }]}>
        <CommunityMap
          center={INITIAL_COMMUNITY.centerCoordinates}
          getPoiLabel={(poi) => resolveLocalizedText(poi.name, language)}
          onSelectPoi={() => undefined}
          pois={routePois}
          selectedPoiId={currentPoi.id}
        />
      </View>
      <InfoCard
        description={resolveLocalizedText(currentPoi.description, language)}
        title={resolveLocalizedText(currentPoi.name, language)}
      >
        <AppText color={theme.colors.primary} variant="label">
          {t('experience:tourProgress', { current: index + 1, total: routePois.length })}
        </AppText>
        <View style={styles.actions}>
          {!isLast ? (
            <PrimaryButton
              icon={<MapPinned color="#ffffff" size={18} />}
              onPress={() => advance(booking.id, routePois.length - 1)}
            >
              {t('experience:nextStop')}
            </PrimaryButton>
          ) : (
            <PrimaryButton
              icon={<CheckCircle2 color="#ffffff" size={18} />}
              onPress={() => {
                void checkOut(booking.id, booking);
                reset(booking.id);
                router.replace(`/guide-booking/${booking.id}`);
              }}
            >
              {t('guide:checkOut')}
            </PrimaryButton>
          )}
        </View>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  header: { gap: 8 },
  map: { borderRadius: 8, borderWidth: 1, height: 300, overflow: 'hidden' },
});
