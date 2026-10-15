import { resolveLocalizedText, summarizeGuideActivity } from '@conexao-favela/shared';
import { router, type Href } from 'expo-router';
import {
  BadgeCheck,
  BarChart3,
  CalendarDays,
  Clock,
  ListChecks,
  MessageCircleMore,
  PlusCircle,
  Star,
  WalletCards,
  UserRound,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { GuideBookingCard } from '@/features/guide/GuideBookingCard';
import { GuideMetricGrid } from '@/features/guide/GuideMetricGrid';
import { isGuidePreviewMode, resolveActiveGuideId } from '@/features/guide/guide-session';
import { formatTourDuration, formatTourPrice } from '@/features/tours/tour-formatters';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useTourStore } from '@/stores/tour-store';
import { useAppTheme } from '@/theme/useAppTheme';

const guideRegistrationRoute = '/(auth)/guide-registration' as Href;
const createTourRoute = '/guide-tours/new' as Href;
const guideBookingsRoute = '/guide-bookings' as Href;
const guideToursRoute = '/guide-tours' as Href;
const guideChatsRoute = '/guide-chats' as Href;
const guideReviewsRoute = '/guide-reviews' as Href;
const guideFinanceRoute = '/guide-finance' as Href;
const guideStatisticsRoute = '/guide-statistics' as Href;
const guideProfileRoute = '/guide-profile' as Href;

export default function GuideDashboardScreen() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const localDrafts = useTourStore((state) => state.localDrafts);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { bookings } = useCurrentUserBookings();
  const { tours: allGuideTours } = useCommunityTours(currentCommunityId);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['experience', 'guide']);
  const isVerified = currentUser?.guideVerified === true;
  const guideId = resolveActiveGuideId(currentUser);
  const guideBookings = useMemo(
    () =>
      bookings
        .filter(
          (booking) => booking.communityId === currentCommunityId && booking.guideId === guideId,
        )
        .sort((first, second) => first.scheduledFor.seconds - second.scheduledFor.seconds),
    [bookings, currentCommunityId, guideId],
  );
  const nextBooking = guideBookings.find((booking) =>
    ['pending', 'confirmed', 'in_progress'].includes(booking.status),
  );
  const summary = useMemo(
    () =>
      summarizeGuideActivity({
        bookings,
        communityId: currentCommunityId,
        guideId,
        tours: allGuideTours,
      }),
    [allGuideTours, bookings, currentCommunityId, guideId],
  );

  return (
    <Screen>
      <AppText variant="title">{t('dashboardTitle')}</AppText>
      {isGuidePreviewMode(currentUser) ? (
        <InfoCard description={t('demoModeBody')} title={t('demoMode')} />
      ) : null}

      <GuideMetricGrid summary={summary} />

      <InfoCard
        description={isVerified ? t('verifiedDescription') : t('pendingDescription')}
        title={isVerified ? t('verifiedTitle') : t('pendingTitle')}
      >
        {isVerified ? (
          <BadgeCheck color={theme.colors.success} size={28} />
        ) : (
          <Clock color={theme.colors.warning} size={28} />
        )}
      </InfoCard>

      {nextBooking ? (
        <View style={styles.block}>
          <View style={styles.sectionTitleRow}>
            <CalendarDays color={theme.colors.primary} size={18} />
            <AppText variant="subtitle">{t('upcomingBookingTitle')}</AppText>
          </View>
          <GuideBookingCard
            booking={nextBooking}
            tour={allGuideTours.find((tour) => tour.id === nextBooking.tourId)}
          />
        </View>
      ) : (
        <InfoCard description={t('noUpcomingBody')} title={t('noUpcomingTitle')} />
      )}

      <View style={styles.actions}>
        <PrimaryButton
          icon={<CalendarDays color="#ffffff" size={18} />}
          onPress={() => router.push(guideBookingsRoute)}
          style={styles.actionButton}
        >
          {t('viewSchedule')}
        </PrimaryButton>
        <PrimaryButton
          icon={<PlusCircle color="#ffffff" size={18} />}
          onPress={() => router.push(createTourRoute)}
          style={styles.actionButton}
          variant="secondary"
        >
          {t('createDraft')}
        </PrimaryButton>
        <PrimaryButton
          icon={<ListChecks color={theme.colors.primary} size={18} />}
          onPress={() => router.push(guideToursRoute)}
          style={styles.actionButton}
          variant="ghost"
        >
          {t('manageTours')}
        </PrimaryButton>
      </View>

      <View style={styles.block}>
        <AppText variant="subtitle">{t('experience:guideTools')}</AppText>
        <View style={styles.actions}>
          <PrimaryButton
            icon={<MessageCircleMore color={theme.colors.primary} size={18} />}
            onPress={() => router.push(guideChatsRoute)}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('experience:chatListTitle')}
          </PrimaryButton>
          <PrimaryButton
            icon={<UserRound color={theme.colors.primary} size={18} />}
            onPress={() => router.push(guideProfileRoute)}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('experience:guideProfileTitle')}
          </PrimaryButton>
          <PrimaryButton
            icon={<Star color={theme.colors.primary} size={18} />}
            onPress={() => router.push(guideReviewsRoute)}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('experience:reviewsTitle')}
          </PrimaryButton>
          <PrimaryButton
            icon={<WalletCards color={theme.colors.primary} size={18} />}
            onPress={() => router.push(guideFinanceRoute)}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('experience:financeTitle')}
          </PrimaryButton>
          <PrimaryButton
            icon={<BarChart3 color={theme.colors.primary} size={18} />}
            onPress={() => router.push(guideStatisticsRoute)}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('experience:statisticsTitle')}
          </PrimaryButton>
        </View>
      </View>

      {currentUser?.type !== 'guide' ? (
        <PrimaryButton onPress={() => router.push(guideRegistrationRoute)} variant="secondary">
          {t('completeRegistration')}
        </PrimaryButton>
      ) : null}

      {localDrafts.length > 0 ? (
        <View style={styles.block}>
          <AppText variant="subtitle">{t('draftsTitle')}</AppText>
          {localDrafts.map((tour) => (
            <InfoCard
              key={tour.id}
              description={`${formatTourPrice(tour, language)} / ${formatTourDuration(
                tour.route.estimatedDuration,
              )}`}
              title={resolveLocalizedText(tour.title, language)}
            />
          ))}
        </View>
      ) : null}

      <PrimaryButton onPress={() => router.push('/(tourist)')} variant="ghost">
        {t('touristArea')}
      </PrimaryButton>
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
  block: {
    gap: 12,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
