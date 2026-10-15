import { resolveLocalizedText } from '@conexao-favela/shared';
import { router } from 'expo-router';
import { CalendarDays, CreditCard, Eye, MapPinned } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import {
  formatBookingDate,
  formatBookingPrice,
  resolveBookingStatusKey,
  shouldContinueBookingPayment,
} from '@/features/bookings/booking-formatters';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function BookingsScreen() {
  return (
    <RequireAuth role="tourist">
      <BookingsContent />
    </RequireAuth>
  );
}

function BookingsContent() {
  const { t } = useTranslation(['common', 'bookings']);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { tours } = useCommunityTours(currentCommunityId);
  const { bookings } = useCurrentUserBookings();

  return (
    <Screen>
      <AppText variant="title">{t('common:bookings')}</AppText>
      {bookings.length === 0 ? (
        <InfoCard description={t('bookings:empty')} title={t('bookings:upcoming')} />
      ) : (
        bookings.map((booking) => {
          const tour = tours.find((item) => item.id === booking.tourId);
          const title = tour ? resolveLocalizedText(tour.title, language) : booking.tourId;

          return (
            <InfoCard
              key={booking.id}
              description={`${formatBookingDate(
                booking.scheduledFor.toDate(),
                language,
              )} / ${formatBookingPrice(booking.pricing.totalPrice, booking.pricing.currency, language)}`}
              title={title}
            >
              <View style={styles.metaRow}>
                <View style={[styles.metaItem, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <CalendarDays color={theme.colors.primary} size={16} />
                  <AppText variant="caption">
                    {t(`bookings:${resolveBookingStatusKey(booking)}`)}
                  </AppText>
                </View>
                <View style={[styles.metaItem, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <MapPinned color={theme.colors.primary} size={16} />
                  <AppText variant="caption">{booking.meetingPoint.name}</AppText>
                </View>
              </View>
              <AppText color={theme.colors.textSecondary} variant="body">
                {t('bookings:pendingTitle', { count: booking.numberOfTourists })}
              </AppText>
              <View style={styles.actions}>
                {shouldContinueBookingPayment(booking) ? (
                  <PrimaryButton
                    icon={<CreditCard color={theme.colors.primary} size={18} />}
                    onPress={() => router.push(`/(tourist)/payment/${booking.id}`)}
                    style={styles.actionButton}
                    variant="ghost"
                  >
                    {t('bookings:continuePayment')}
                  </PrimaryButton>
                ) : null}
                <PrimaryButton
                  icon={<Eye color="#ffffff" size={18} />}
                  onPress={() => router.push(`/booking/${booking.id}`)}
                  style={styles.actionButton}
                >
                  {t('bookings:viewDetails')}
                </PrimaryButton>
              </View>
            </InfoCard>
          );
        })
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
});
