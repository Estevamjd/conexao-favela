import { INITIAL_COMMUNITY, recommendTours, resolveLocalizedText } from '@conexao-favela/shared';
import { router } from 'expo-router';
import { Sparkles } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { TourCard } from '@/features/tours/TourCard';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function RecommendationsRoute() {
  return (
    <RequireAuth role="tourist">
      <RecommendationsScreen />
    </RequireAuth>
  );
}

function RecommendationsScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const favoriteRecords = useFavoriteStore((state) => state.favoriteTours);
  const { tours } = useCommunityTours(communityId);
  const favoriteTourIds = favoriteRecords
    .filter((item) => item.communityId === communityId)
    .map((item) => item.tourId);
  const favoriteCategories = tours
    .filter((tour) => favoriteTourIds.includes(tour.id))
    .map((tour) => tour.category);
  const recommendations = recommendTours({
    communityId,
    favoriteTourIds,
    interests: favoriteCategories.length > 0 ? favoriteCategories : ['cultural', 'historico'],
    language,
    tours,
  });

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <Sparkles color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('recommendationsTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('recommendationsBody')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={recommendations}
        keyExtractor={(item) => item.tourId}
        renderItem={({ item }) => {
          const tour = tours.find((candidate) => candidate.id === item.tourId);
          if (!tour) return null;
          return (
            <View style={styles.item}>
              <TourCard
                onPress={() => router.push(`/tour/${tour.id}`)}
                subAreas={INITIAL_COMMUNITY.subAreas}
                tour={tour}
              />
              <AppText color={theme.colors.textSecondary} variant="caption">
                {item.reasons.map((reason) => t(`reason${reasonToKey(reason)}`)).join(' / ')}
              </AppText>
              <AppText color={theme.colors.primary} variant="caption">
                {resolveLocalizedText(tour.title, language)}
              </AppText>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

function reasonToKey(reason: 'category' | 'favorite' | 'language' | 'sub_area') {
  if (reason === 'sub_area') return 'SubArea';
  return `${reason.charAt(0).toUpperCase()}${reason.slice(1)}`;
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  item: { gap: 8 },
  list: { gap: 18, paddingBottom: 96 },
  screen: { flex: 1 },
});
