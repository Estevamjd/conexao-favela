import { INITIAL_COMMUNITY, resolveLocalizedText } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  BadgeCheck,
  Languages,
  MapPinned,
  Route,
  Star,
  UserRound,
} from 'lucide-react-native';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { formatGuideLanguages, formatGuideRating } from '@/features/guides/guide-formatters';
import { TourCard } from '@/features/tours/TourCard';
import { useCommunityGuides } from '@/hooks/useCommunityGuides';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function GuideDetailScreen() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('tours');
  const params = useLocalSearchParams<{ guideId?: string }>();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { guides } = useCommunityGuides(currentCommunityId);
  const { tours } = useCommunityTours(currentCommunityId);
  const guideId = typeof params.guideId === 'string' ? params.guideId : undefined;
  const guide = guides.find((item) => item.id === guideId);

  if (!guide) {
    return (
      <Screen>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('back')}
        </PrimaryButton>
        <InfoCard
          description={t('guideUnavailableDescription')}
          title={t('guideUnavailableTitle')}
        />
      </Screen>
    );
  }

  const guideTours = tours.filter(
    (tour) => tour.communityId === currentCommunityId && tour.guideId === guide.id,
  );
  const subAreaNames = guide.subAreaIds
    .map(
      (subAreaId) => INITIAL_COMMUNITY.subAreas.find((subArea) => subArea.id === subAreaId)?.name,
    )
    .filter((name): name is string => Boolean(name));

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
        <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceMuted }]}>
          <UserRound color={theme.colors.primary} size={32} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            <AppText variant="title">{guide.displayName}</AppText>
            <BadgeCheck color={theme.colors.success} size={22} />
          </View>
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('verifiedResident')}
          </AppText>
        </View>
      </View>

      <InfoCard description={resolveLocalizedText(guide.bio, language)} title={t('guideBio')} />

      <View style={styles.metricsGrid}>
        <InfoCard title={t('guideRating', { rating: formatGuideRating(guide.rating, language) })}>
          <View style={styles.inlineMeta}>
            <Star color={theme.colors.accent} size={16} />
            <AppText color={theme.colors.textSecondary} variant="caption">
              {t('guideReviews', { count: guide.totalReviews })}
            </AppText>
          </View>
        </InfoCard>
        <InfoCard title={t('guideYears', { count: guide.yearsOfExperience })}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('guideToursCompleted', { count: guide.totalToursCompleted })}
          </AppText>
        </InfoCard>
      </View>

      <InfoCard title={t('guideDetails')}>
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Languages color={theme.colors.primary} size={18} />
            <View style={styles.metaText}>
              <AppText variant="label">{t('guideLanguages')}</AppText>
              <AppText color={theme.colors.textSecondary} variant="body">
                {formatGuideLanguages(guide.languagesSpoken)}
              </AppText>
            </View>
          </View>
          <View style={styles.metaItem}>
            <MapPinned color={theme.colors.primary} size={18} />
            <View style={styles.metaText}>
              <AppText variant="label">{t('guideAreas')}</AppText>
              <AppText color={theme.colors.textSecondary} variant="body">
                {subAreaNames.join(' + ')}
              </AppText>
            </View>
          </View>
        </View>
      </InfoCard>

      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitle}>
          <Route color={theme.colors.primary} size={20} />
          <AppText variant="subtitle">{t('guideTours')}</AppText>
        </View>
      </View>
      <View style={styles.tourList}>
        {guideTours.map((tour) => (
          <TourCard
            key={tour.id}
            onPress={() => router.push(`/tour/${tour.id}`)}
            subAreas={INITIAL_COMMUNITY.subAreas}
            tour={tour}
          />
        ))}
      </View>
      {guideTours.length === 0 ? (
        <InfoCard description={t('guideEmptyTours')} title={t('guideTours')} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: 999,
    height: 72,
    justifyContent: 'center',
    width: 72,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  inlineMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaItem: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  metaRow: {
    gap: 14,
  },
  metaText: {
    flex: 1,
    gap: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionHeader: {
    marginBottom: -6,
  },
  sectionTitle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  tourList: {
    gap: 14,
  },
});
