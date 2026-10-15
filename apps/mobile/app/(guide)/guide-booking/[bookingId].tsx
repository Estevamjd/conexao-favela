import { resolveLocalizedText, type BookingStatus } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheckBig,
  Link2,
  LogIn,
  LogOut,
  MapPinned,
  ShieldCheck,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { formatBookingDate, formatBookingPrice } from '@/features/bookings/booking-formatters';
import { findGuideBookingById, getGuideBookingActionState } from '@/features/guide/guide-bookings';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

function isCheckInPolicyVisible(status: BookingStatus): boolean {
  return status !== 'cancelled' && status !== 'completed' && status !== 'no_show';
}

export default function GuideBookingDetailScreen() {
  const { t } = useTranslation(['guide', 'bookings', 'tours', 'experience']);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { bookings } = useCurrentUserBookings();
  const { tours } = useCommunityTours(currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const cancelBooking = useBookingStore((state) => state.cancelBooking);
  const checkInBooking = useBookingStore((state) => state.checkInBooking);
  const checkOutBooking = useBookingStore((state) => state.checkOutBooking);
  const confirmBooking = useBookingStore((state) => state.confirmBooking);
  const booking = findGuideBookingById({
    bookingId,
    bookings,
    communityId: currentCommunityId,
    guideId,
  });

  if (!booking) {
    return (
      <Screen>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.push('/guide-bookings')}
          variant="ghost"
        >
          {t('guide:bookingsTitle')}
        </PrimaryButton>
        <InfoCard
          description={t('guide:bookingNotFoundBody')}
          title={t('guide:bookingNotFoundTitle')}
        />
      </Screen>
    );
  }

  const tour = tours.find((item) => item.id === booking.tourId);
  const tourTitle = tour ? resolveLocalizedText(tour.title, language) : booking.tourId;
  const actionState = getGuideBookingActionState(booking);
  const showCheckInPolicy = !booking.checkIn && isCheckInPolicyVisible(booking.status);

  return (
    <Screen>
      <PrimaryButton
        icon={<ArrowLeft color={theme.colors.primary} size={18} />}
        onPress={() => router.push('/guide-bookings')}
        variant="ghost"
      >
        {t('guide:bookingsTitle')}
      </PrimaryButton>

      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {t(`guide:status.${booking.status}`)}
        </AppText>
        <AppText variant="title">{t('guide:bookingDetailTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {tourTitle}
        </AppText>
      </View>

      <InfoCard title={t('guide:bookingSummaryTitle')}>
        <View style={styles.summaryGrid}>
          <SummaryTile
            icon={<CalendarDays color={theme.colors.primary} size={18} />}
            label={t('guide:scheduledFor')}
            value={formatBookingDate(booking.scheduledFor.toDate(), language)}
          />
          <SummaryTile
            icon={<UsersRound color={theme.colors.primary} size={18} />}
            label={t('guide:touristsCount', { count: booking.numberOfTourists })}
            value={formatBookingPrice(
              booking.pricing.totalPrice,
              booking.pricing.currency,
              language,
            )}
          />
          <SummaryTile
            icon={<CircleCheckBig color={theme.colors.primary} size={18} />}
            label={t('guide:statusLabel')}
            value={t(`guide:status.${booking.status}`)}
          />
          <SummaryTile
            icon={<Link2 color={theme.colors.primary} size={18} />}
            label={t('guide:bookingCode')}
            value={booking.id}
          />
        </View>
      </InfoCard>

      <InfoCard title={t('guide:meetingPoint')}>
        <View style={styles.iconRow}>
          <MapPinned color={theme.colors.primary} size={20} />
          <View style={styles.rowText}>
            <AppText variant="label">{booking.meetingPoint.name}</AppText>
            <AppText color={theme.colors.textSecondary} variant="body">
              {resolveLocalizedText(booking.meetingPoint.description, language)}
            </AppText>
          </View>
        </View>
      </InfoCard>

      <InfoCard title={t('guide:bookingParticipantsTitle')}>
        {booking.touristsInfo.map((tourist, index) => (
          <View key={`${tourist.name}-${index.toString()}`} style={styles.iconRow}>
            <UserRound color={theme.colors.primary} size={18} />
            <View style={styles.rowText}>
              <AppText variant="label">
                {tourist.name || t('guide:participantFallback', { count: index + 1 })}
              </AppText>
              {tourist.nationality || tourist.age ? (
                <AppText color={theme.colors.textSecondary} variant="caption">
                  {[
                    tourist.nationality,
                    tourist.age ? t('bookings:ageYears', { count: tourist.age }) : null,
                  ]
                    .filter((value): value is string => Boolean(value))
                    .join(' / ')}
                </AppText>
              ) : null}
            </View>
          </View>
        ))}
      </InfoCard>

      <InfoCard title={t('guide:shareableLink')}>
        <AppText color={theme.colors.textSecondary} style={styles.linkText} variant="caption">
          {booking.shareableLink}
        </AppText>
      </InfoCard>

      <InfoCard title={t('guide:bookingOperationsTitle')}>
        {booking.checkIn ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('guide:checkedInAt')}:{' '}
            {formatBookingDate(booking.checkIn.checkedInAt.toDate(), language)}
          </AppText>
        ) : null}
        {booking.checkOut ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('guide:checkedOutAt')}:{' '}
            {formatBookingDate(booking.checkOut.checkedOutAt.toDate(), language)}
          </AppText>
        ) : null}
        {booking.status === 'pending' || booking.status === 'confirmed' ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {actionState.canCancel
              ? t('guide:guideCancelPolicyAvailable')
              : t('guide:guideCancelPolicyLocked')}
          </AppText>
        ) : null}
        {showCheckInPolicy && !actionState.canCheckIn ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('guide:checkInPolicyLocked')}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {booking.status === 'in_progress' ? (
            <PrimaryButton
              icon={<MapPinned color="#ffffff" size={18} />}
              onPress={() => router.push(`/guide-tour-live/${booking.id}`)}
              style={styles.actionButton}
            >
              {t('experience:openLiveTour')}
            </PrimaryButton>
          ) : null}
          {actionState.canConfirm ? (
            <PrimaryButton
              icon={<ShieldCheck color="#ffffff" size={18} />}
              onPress={() => void confirmBooking(booking.id, booking)}
              style={styles.actionButton}
            >
              {t('guide:confirm')}
            </PrimaryButton>
          ) : null}
          {actionState.canCheckIn ? (
            <PrimaryButton
              icon={<LogIn color="#ffffff" size={18} />}
              onPress={() => void checkInBooking(booking.id, booking)}
              style={styles.actionButton}
            >
              {t('guide:checkIn')}
            </PrimaryButton>
          ) : null}
          {actionState.canCheckOut ? (
            <PrimaryButton
              icon={<LogOut color="#ffffff" size={18} />}
              onPress={() => void checkOutBooking(booking.id, booking)}
              style={styles.actionButton}
            >
              {t('guide:checkOut')}
            </PrimaryButton>
          ) : null}
          {actionState.canCancel ? (
            <PrimaryButton
              icon={<XCircle color={theme.colors.primary} size={18} />}
              onPress={() =>
                void cancelBooking(booking.id, t('guide:cancelReason'), 'guide', booking)
              }
              style={styles.actionButton}
              variant="ghost"
            >
              {t('guide:cancel')}
            </PrimaryButton>
          ) : null}
        </View>
      </InfoCard>
    </Screen>
  );
}

type SummaryTileProps = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
};

function SummaryTile({ icon, label, value }: SummaryTileProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.summaryTile, { backgroundColor: theme.colors.surfaceMuted }]}>
      {icon}
      <View style={styles.rowText}>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {label}
        </AppText>
        <AppText variant="label">{value}</AppText>
      </View>
    </View>
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
  header: {
    gap: 8,
  },
  iconRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  linkText: {
    flexWrap: 'wrap',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexBasis: 170,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    padding: 12,
  },
});
