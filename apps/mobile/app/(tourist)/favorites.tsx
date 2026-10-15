import { INITIAL_COMMUNITY } from '@conexao-favela/shared';
import { router } from 'expo-router';
import { Heart, Search } from 'lucide-react-native';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { getFavoriteToursForCommunity } from '@/features/favorites/favorite-tours';
import { TourCard } from '@/features/tours/TourCard';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function FavoritesScreen() {
  const { t } = useTranslation(['common', 'tours']);
  const theme = useAppTheme();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const favoriteRecords = useFavoriteStore((state) => state.favoriteTours);
  const { tours } = useCommunityTours(currentCommunityId);
  const favoriteTours = useMemo(
    () => getFavoriteToursForCommunity(favoriteRecords, tours, currentCommunityId),
    [currentCommunityId, favoriteRecords, tours],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Heart color={theme.colors.primary} size={22} />
          <AppText variant="title">{t('common:favorites')}</AppText>
        </View>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('tours:favoritesDescription')}
        </AppText>
      </View>

      {favoriteTours.length === 0 ? (
        <InfoCard
          description={t('tours:favoritesEmptyBody')}
          title={t('tours:favoritesEmptyTitle')}
        >
          <PrimaryButton
            icon={<Search color="#ffffff" size={18} />}
            onPress={() => router.push('/explore')}
          >
            {t('tours:discoverTours')}
          </PrimaryButton>
        </InfoCard>
      ) : (
        <View style={styles.list}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('tours:favoritesCount', { count: favoriteTours.length })}
          </AppText>
          {favoriteTours.map((tour) => (
            <TourCard
              key={tour.id}
              onPress={() => router.push(`/tour/${tour.id}`)}
              subAreas={INITIAL_COMMUNITY.subAreas}
              tour={tour}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  list: {
    gap: 14,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
});
