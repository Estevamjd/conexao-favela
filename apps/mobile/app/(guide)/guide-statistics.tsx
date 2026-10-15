import { buildGuidePerformanceSeries, summarizeReviews } from '@conexao-favela/shared';
import { BarChart3 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { useReviewStore } from '@/stores/review-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideStatisticsRoute() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const { bookings } = useCurrentUserBookings();
  const reviews = useReviewStore((state) => state.localReviews).filter(
    (review) => review.communityId === communityId && review.guideId === guideId,
  );
  const series = buildGuidePerformanceSeries({ bookings, communityId, guideId });
  const reviewSummary = summarizeReviews(reviews);
  const maximumTourists = Math.max(1, ...series.map((point) => point.tourists));

  return (
    <Screen>
      <View style={styles.header}>
        <BarChart3 color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('statisticsTitle')}</AppText>
      </View>
      <InfoCard title={t('averageRating')}>
        <AppText variant="hero">{reviewSummary.averageRating?.toFixed(1) ?? '-'}</AppText>
      </InfoCard>
      <InfoCard title={t('tourists')}>
        <View style={styles.chart}>
          {series.map((point) => (
            <View key={point.label} style={styles.barColumn}>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {point.tourists.toString()}
              </AppText>
              <View style={[styles.barTrack, { backgroundColor: theme.colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      backgroundColor: theme.colors.primary,
                      height: Math.max(8, (point.tourists / maximumTourists) * 130),
                    },
                  ]}
                />
              </View>
              <AppText variant="caption">{point.label}</AppText>
            </View>
          ))}
        </View>
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bar: { width: '100%' },
  barColumn: { alignItems: 'center', flex: 1, gap: 6 },
  barTrack: { height: 130, justifyContent: 'flex-end', minWidth: 28, width: '70%' },
  chart: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  header: { gap: 8 },
});
