import {
  canReviewBooking,
  getBookingCancellationState,
  getBookingCheckInState,
  resolveLocalizedText,
  type BookingStatus,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarDays,
  CircleCheckBig,
  CreditCard,
  Link2,
  LogIn,
  LogOut,
  MapPinned,
  MessageCircleMore,
  Star,
  UserRound,
  UsersRound,
  XCircle,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import type { ReactNode } from 'react';
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
import { useBookingStore } from '@/stores/booking-store';
import { useChatStore } from '@/stores/chat-store';
import { useReviewStore } from '@/stores/review-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

function isCheckInPolicyVisible(status: BookingStatus): boolean {
  return status !== 'cancelled' && status !== 'completed' && status !== 'no_show';
}

export default function BookingDetailScreen() {
  return (
    <RequireAuth role="tourist">
      <BookingDetailContent />
    </RequireAuth>
  );
}

function BookingDetailContent() {
  const { t } = useTranslation(['bookings', 'experience', 'tours']);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { tours } = useCommunityTours(currentCommunityId);
  const { bookings } = useCurrentUserBookings();
  const cancelBooking = useBookingStore((state) => state.cancelBooking);
  const checkInBooking = useBookingStore((state) => state.checkInBooking);
  const checkOutBooking = useBookingStore((state) => state.checkOutBooking);
  const ensureChat = useChatStore((state) => state.ensureChat);
  const reviews = useReviewStore((state) => state.localReviews);
  const booking = bookings.find((item) => item.id === bookingId);

  if (!booking) {
    return (
      <Screen>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('tours:back')}
        </PrimaryButton>
        <InfoCard
          description={t('bookings:notFoundDescription')}
          title={t('bookings:notFoundTitle')}
        />
      </Screen>
    );
  }

  const tour = tours.find((item) => item.id === booking.tourId);
  const title = tour ? resolveLocalizedText(tour.title, language) : booking.tourId;
  const cancellationState = getBookingCancellationState(booking, 'tourist');
  const checkInState = getBookingCheckInState(booking);
  const canCheckOut =
    booking.status === 'in_progress' && Boolean(booking.checkIn) && !booking.checkOut;
  const shouldShowPaymentCta = shouldContinueBookingPayment(booking);
  const showCheckInPolicy = !booking.checkIn && isCheckInPolicyVisible(booking.status);
  const existingReview = reviews.find((review) => review.bookingId === booking.id);

  return (
    <Screen>
      <PrimaryButton
        icon={<ArrowLeft color={theme.colors.primary} size={18} />}
        onPress={() => router.back()}
        variant="ghost"
      >
        {t('tours:back')}
      </PrimaryButton>

      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {t(`bookings:${resolveBookingStatusKey(booking)}`)}
        </AppText>
        <AppText variant="title">{t('bookings:detailTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {title}
        </AppText>
      </View>

      <InfoCard title={t('bookings:summaryTitle')}>
        <View style={styles.summaryGrid}>
          <SummaryTile
            icon={<CalendarDays color={theme.colors.primary} size={18} />}
            label={t('bookings:scheduledFor')}
            value={formatBookingDate(booking.scheduledFor.toDate(), language)}
          />
          <SummaryTile
            icon={<UsersRound color={theme.colors.primary} size={18} />}
            label={t('bookings:participants')}
            value={t('bookings:pendingTitle', { count: booking.numberOfTourists })}
          />
          <SummaryTile
            icon={<CircleCheckBig color={theme.colors.primary} size={18} />}
            label={t('bookings:statusLabel')}
            value={t(`bookings:${resolveBookingStatusKey(booking)}`)}
          />
          <SummaryTile
            icon={<Link2 color={theme.colors.primary} size={18} />}
            label={t('bookings:bookingCode')}
            value={booking.id}
          />
        </View>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('bookings:totalPrice')}:{' '}
          {formatBookingPrice(booking.pricing.totalPrice, booking.pricing.currency, language)}
        </AppText>
      </InfoCard>

      <InfoCard title={t('bookings:meetingPoint')}>
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

      <InfoCard title={t('bookings:participants')}>
        {booking.touristsInfo.map((tourist, index) => (
          <View key={`${tourist.name}-${index.toString()}`} style={styles.iconRow}>
            <UserRound color={theme.colors.primary} size={18} />
            <View style={styles.rowText}>
              <AppText variant="label">
                {tourist.name || t('bookings:participantFallback', { count: index + 1 })}
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

      <InfoCard title={t('bookings:shareableLink')}>
        <AppText color={theme.colors.textSecondary} style={styles.linkText} variant="caption">
          {booking.shareableLink}
        </AppText>
      </InfoCard>

      <InfoCard title={t('bookings:operationsTitle')}>
        {booking.checkIn ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('bookings:checkedInAt')}:{' '}
            {formatBookingDate(booking.checkIn.checkedInAt.toDate(), language)}
          </AppText>
        ) : null}
        {booking.checkOut ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('bookings:checkedOutAt')}:{' '}
            {formatBookingDate(booking.checkOut.checkedOutAt.toDate(), language)}
          </AppText>
        ) : null}
        {booking.status === 'pending' || booking.status === 'confirmed' ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {cancellationState.canCancel
              ? t('bookings:cancelPolicyAvailable', {
                  hours: cancellationState.minimumHoursBeforeStart,
                })
              : t('bookings:cancelPolicyLocked', {
                  hours: cancellationState.minimumHoursBeforeStart,
                })}
          </AppText>
        ) : null}
        {showCheckInPolicy && !checkInState.canCheckIn ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('bookings:checkInPolicyLocked', {
              hours: checkInState.opensHoursBeforeStart,
            })}
          </AppText>
        ) : null}
        {shouldShowPaymentCta ? (
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('bookings:paymentPendingNotice')}
          </AppText>
        ) : null}
        <View style={styles.actions}>
          {booking.status !== 'cancelled' ? (
            <PrimaryButton
              icon={<MessageCircleMore color={theme.colors.primary} size={18} />}
              onPress={() => {
                const chat = ensureChat(booking);
                router.push(`/chat/${chat.id}`);
              }}
              style={styles.actionButton}
              variant="ghost"
            >
              {t('experience:openChat')}
            </PrimaryButton>
          ) : null}
          {shouldShowPaymentCta ? (
            <PrimaryButton
              icon={<CreditCard color="#ffffff" size={18} />}
              onPress={() => router.push(`/(tourist)/payment/${booking.id}`)}
              style={styles.actionButton}
            >
              {t('bookings:continuePayment')}
            </PrimaryButton>
          ) : null}
          {cancellationState.canCancel ? (
            <PrimaryButton
              icon={<XCircle color={theme.colors.primary} size={18} />}
              onPress={() =>
                void cancelBooking(
                  booking.id,
                  t('bookings:touristCancelReason'),
                  'tourist',
                  booking,
                )
              }
              style={styles.actionButton}
              variant="ghost"
            >
              {t('bookings:cancelBooking')}
            </PrimaryButton>
          ) : null}
          {checkInState.canCheckIn ? (
            <PrimaryButton
              icon={<LogIn color="#ffffff" size={18} />}
              onPress={() => void checkInBooking(booking.id, booking)}
              style={styles.actionButton}
            >
              {t('bookings:checkIn')}
            </PrimaryButton>
          ) : null}
          {canCheckOut ? (
            <PrimaryButton
              icon={<LogOut color="#ffffff" size={18} />}
              onPress={() => void checkOutBooking(booking.id, booking)}
              style={styles.actionButton}
            >
              {t('bookings:checkOut')}
            </PrimaryButton>
          ) : null}
          {booking.status === 'completed' ? (
            <>
              <PrimaryButton
                disabled
                icon={<CircleCheckBig color="#ffffff" size={18} />}
                onPress={() => undefined}
                style={styles.actionButton}
                variant="secondary"
              >
                {t('bookings:completedAction')}
              </PrimaryButton>
              <PrimaryButton
                icon={<Star color={theme.colors.primary} size={18} />}
                onPress={() => router.push(`/review/${booking.id}`)}
                style={styles.actionButton}
                variant="ghost"
              >
                {existingReview || !canReviewBooking(booking)
                  ? t('experience:reviewSuccess')
                  : t('experience:reviewTitle')}
              </PrimaryButton>
            </>
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
