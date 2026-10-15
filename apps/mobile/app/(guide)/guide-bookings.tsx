import { router } from 'expo-router';
import { ArrowLeft, CalendarDays } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GuideBookingCard } from '@/features/guide/GuideBookingCard';
import { getGuideBookings } from '@/features/guide/guide-bookings';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideBookingsScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation('guide');
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const cancelBooking = useBookingStore((state) => state.cancelBooking);
  const checkInBooking = useBookingStore((state) => state.checkInBooking);
  const checkOutBooking = useBookingStore((state) => state.checkOutBooking);
  const confirmBooking = useBookingStore((state) => state.confirmBooking);
  const { bookings } = useCurrentUserBookings();
  const { tours } = useCommunityTours(currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const guideBookings = useMemo(
    () => getGuideBookings({ bookings, communityId: currentCommunityId, guideId }),
    [bookings, currentCommunityId, guideId],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.push('/(guide)')}
          variant="ghost"
        >
          {t('dashboardTitle')}
        </PrimaryButton>
        <View style={styles.sectionTitleRow}>
          <CalendarDays color={theme.colors.primary} size={22} />
          <AppText variant="title">{t('bookingsTitle')}</AppText>
        </View>
      </View>

      {guideBookings.length === 0 ? (
        <InfoCard description={t('bookingQueueEmptyBody')} title={t('bookingQueueEmptyTitle')} />
      ) : (
        <View style={styles.list}>
          <AppText variant="subtitle">{t('bookingQueueTitle')}</AppText>
          {guideBookings.map((booking) => (
            <GuideBookingCard
              booking={booking}
              key={booking.id}
              onCancel={() => void cancelBooking(booking.id, t('cancelReason'), 'guide', booking)}
              onCheckIn={() => void checkInBooking(booking.id, booking)}
              onCheckOut={() => void checkOutBooking(booking.id, booking)}
              onConfirm={() => void confirmBooking(booking.id, booking)}
              onViewDetails={() => router.push(`/guide-booking/${booking.id}`)}
              tour={tours.find((tour) => tour.id === booking.tourId)}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
  },
  list: {
    gap: 12,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
