import { resolveLocalizedText, summarizeReviews } from '@conexao-favela/shared';
import { Star } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useGuideReviews } from '@/hooks/useExperienceReviews';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideReviewsRoute() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const reviews = useGuideReviews(guideId).filter((review) => review.communityId === communityId);
  const summary = summarizeReviews(reviews);

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <Star color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('reviewsTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {summary.averageRating?.toFixed(1) ?? '-'} / 5 | {summary.totalReviews.toString()}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={reviews}
        keyExtractor={(review) => review.id}
        ListEmptyComponent={<InfoCard description={t('noReviews')} title={t('reviewsTitle')} />}
        renderItem={({ item }) => (
          <InfoCard
            description={resolveLocalizedText(item.comment, language)}
            title={`${item.rating.toString()} / 5`}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  list: { gap: 12, paddingBottom: 96 },
  screen: { flex: 1 },
});
