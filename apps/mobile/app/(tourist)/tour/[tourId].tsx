import {
  INITIAL_COMMUNITY,
  INITIAL_POIS,
  resolveLocalizedText,
  summarizeReviews,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  Clock3,
  Heart,
  Languages,
  MapPinned,
  Star,
  UserRound,
  UsersRound,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { ReviewPhoto } from '@/features/experience/ReviewPhoto';
import { formatGuideLanguages, formatGuideRating } from '@/features/guides/guide-formatters';
import { isFavoriteTour } from '@/features/favorites/favorite-tours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useTourReviews } from '@/hooks/useExperienceReviews';
import { useCommunityGuides } from '@/hooks/useCommunityGuides';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import {
  formatTourCategory,
  formatTourDifficulty,
  formatTourDistance,
  formatTourDuration,
  formatTourPrice,
} from '@/features/tours/tour-formatters';
import { useFavoriteStore } from '@/stores/favorite-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function TourDetailScreen() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['tours', 'experience']);
  const params = useLocalSearchParams<{ tourId?: string }>();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const favoriteRecords = useFavoriteStore((state) => state.favoriteTours);
  const toggleFavoriteTour = useFavoriteStore((state) => state.toggleFavoriteTour);
  const { guides } = useCommunityGuides(currentCommunityId);
  const { tours } = useCommunityTours(currentCommunityId);
  const tourId = typeof params.tourId === 'string' ? params.tourId : undefined;
  const tour = tours.find((item) => item.id === tourId);
  const reviews = useTourReviews(tourId);

  if (!tour) {
    return (
      <Screen>
        <PrimaryButton onPress={() => router.back()} variant="ghost">
          {t('back')}
        </PrimaryButton>
        <InfoCard description={t('unavailableDescription')} title={t('unavailableTitle')} />
      </Screen>
    );
  }

  const title = resolveLocalizedText(tour.title, language);
  const description = resolveLocalizedText(tour.description, language);
  const routePoints = [...tour.route.points]
    .sort((left, right) => left.order - right.order)
    .map((point) => ({
      ...point,
      poi: INITIAL_POIS.find((poi) => poi.id === point.poiId),
    }))
    .filter((point) => point.poi !== undefined);
  const subAreaNames = tour.subAreaIds
    .map(
      (subAreaId) => INITIAL_COMMUNITY.subAreas.find((subArea) => subArea.id === subAreaId)?.name,
    )
    .filter((name): name is string => Boolean(name));
  const guide = guides.find((item) => item.id === tour.guideId);
  const favoriteInput = { communityId: tour.communityId, tourId: tour.id };
  const favorited = isFavoriteTour(favoriteRecords, favoriteInput);
  const reviewSummary = summarizeReviews(reviews);

  return (
    <Screen>
      <PrimaryButton
        icon={<ArrowLeft color={theme.colors.primary} size={18} />}
        onPress={() => router.back()}
        variant="ghost"
      >
        {t('back')}
      </PrimaryButton>

      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {formatTourCategory(tour.category, language)}
        </AppText>
        <AppText variant="hero">{title}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {description}
        </AppText>
      </View>

      <View style={styles.primaryActions}>
        <PrimaryButton
          icon={<CalendarCheck color="#ffffff" size={18} />}
          onPress={() => router.push(`/book/${tour.id}`)}
          style={styles.primaryActionButton}
        >
          {t('reserve')}
        </PrimaryButton>
        <PrimaryButton
          icon={
            <Heart
              color={favorited ? '#ffffff' : theme.colors.primary}
              fill={favorited ? '#ffffff' : 'transparent'}
              size={18}
            />
          }
          onPress={() => toggleFavoriteTour(favoriteInput)}
          style={styles.primaryActionButton}
          variant={favorited ? 'secondary' : 'ghost'}
        >
          {favorited ? t('savedTour') : t('saveTour')}
        </PrimaryButton>
      </View>

      {guide ? (
        <InfoCard title={t('guideProfileTitle')}>
          <View style={styles.guideHeader}>
            <View style={[styles.guideAvatar, { backgroundColor: theme.colors.surfaceMuted }]}>
              <UserRound color={theme.colors.primary} size={24} />
            </View>
            <View style={styles.guideSummary}>
              <View style={styles.guideNameRow}>
                <AppText variant="subtitle">{guide.displayName}</AppText>
                <BadgeCheck color={theme.colors.success} size={18} />
              </View>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {t('guideCardMeta', {
                  languages: formatGuideLanguages(guide.languagesSpoken),
                  rating: formatGuideRating(guide.rating, language),
                })}
              </AppText>
            </View>
          </View>
          <PrimaryButton
            icon={<UserRound color={theme.colors.primary} size={18} />}
            onPress={() => router.push(`/guide/${guide.id}`)}
            variant="ghost"
          >
            {t('viewGuideProfile')}
          </PrimaryButton>
        </InfoCard>
      ) : null}

      <View style={styles.metricsGrid}>
        <InfoCard title={formatTourPrice(tour, language)}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('pricePerPerson')}
          </AppText>
        </InfoCard>
        <InfoCard title={formatTourDuration(tour.route.estimatedDuration)}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('estimatedDuration')}
          </AppText>
        </InfoCard>
      </View>

      <InfoCard title={t('routeSummary')}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <MapPinned color={theme.colors.primary} size={18} />
            <AppText variant="body">{subAreaNames.join(' + ')}</AppText>
          </View>
          <View style={styles.metaItem}>
            <Clock3 color={theme.colors.primary} size={18} />
            <AppText variant="body">
              {formatTourDistance(tour.route.totalDistance, language)}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <UsersRound color={theme.colors.primary} size={18} />
            <AppText variant="body">
              {t('peopleRange', {
                max: tour.capacity.maxTourists,
                min: tour.capacity.minTourists,
              })}
            </AppText>
          </View>
          <View style={styles.metaItem}>
            <Languages color={theme.colors.primary} size={18} />
            <AppText variant="body">
              {tour.languages.map((code) => code.toUpperCase()).join(', ')}
            </AppText>
          </View>
        </View>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {formatTourDifficulty(tour.difficulty, language)}
        </AppText>
      </InfoCard>

      <InfoCard title={t('stops')}>
        {routePoints.map((point) => (
          <View key={point.poiId} style={styles.stopRow}>
            <View style={[styles.stopNumber, { backgroundColor: theme.colors.surfaceMuted }]}>
              <AppText color={theme.colors.primary} variant="label">
                {point.order.toString()}
              </AppText>
            </View>
            <View style={styles.stopText}>
              <AppText variant="label">
                {point.poi ? resolveLocalizedText(point.poi.name, language) : point.poiId}
              </AppText>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {point.estimatedTime.toString()}min
              </AppText>
            </View>
          </View>
        ))}
      </InfoCard>

      <InfoCard
        description={
          reviewSummary.totalReviews > 0
            ? `${reviewSummary.averageRating?.toFixed(1) ?? '-'} / 5`
            : t('experience:noReviews')
        }
        title={t('experience:reviewsTitle')}
      >
        <Star color={theme.colors.accent} fill={theme.colors.accent} size={24} />
        {reviews.slice(0, 3).map((review) => (
          <View key={review.id} style={styles.reviewRow}>
            <View style={styles.ratingRow}>
              {Array.from({ length: review.rating }, (_, index) => (
                <Star
                  color={theme.colors.accent}
                  fill={theme.colors.accent}
                  key={index}
                  size={15}
                />
              ))}
            </View>
            <AppText color={theme.colors.textSecondary} variant="body">
              {resolveLocalizedText(review.comment, language)}
            </AppText>
            {review.photos.length > 0 ? (
              <View style={styles.reviewPhotos}>
                {review.photos.slice(0, 3).map((photo) => (
                  <ReviewPhoto
                    key={photo}
                    label={resolveLocalizedText(review.comment, language)}
                    value={photo}
                  />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </InfoCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  guideAvatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  guideHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  guideNameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  guideSummary: {
    flex: 1,
    gap: 3,
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  metaRow: {
    gap: 12,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  primaryActionButton: {
    flexGrow: 1,
  },
  primaryActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reviewRow: {
    gap: 4,
  },
  ratingRow: { flexDirection: 'row', gap: 2 },
  reviewPhotos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stopNumber: {
    alignItems: 'center',
    borderRadius: 999,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stopRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  stopText: {
    flex: 1,
    gap: 2,
  },
});
