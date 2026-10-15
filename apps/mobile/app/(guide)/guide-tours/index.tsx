import { INITIAL_COMMUNITY, resolveLocalizedText, type Tour } from '@conexao-favela/shared';
import { router, type Href } from 'expo-router';
import {
  Clock3,
  Eye,
  Pencil,
  Languages,
  MapPinned,
  PlusCircle,
  Star,
  UsersRound,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import {
  countGuideToursByFilter,
  filterGuideTours,
  getGuideTours,
  GUIDE_TOUR_FILTERS,
  type GuideTourFilter,
} from '@/features/guide/guide-tour-list';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import {
  formatTourCategory,
  formatTourDifficulty,
  formatTourDuration,
  formatTourPrice,
} from '@/features/tours/tour-formatters';
import { FilterChipRow, type FilterChipOption } from '@/features/tours/FilterChipRow';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useTourStore } from '@/stores/tour-store';
import { useAppTheme } from '@/theme/useAppTheme';

const createTourRoute = '/guide-tours/new' as Href;

export default function GuideToursScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation('guide');
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const localDrafts = useTourStore((state) => state.localDrafts);
  const { tours: communityTours } = useCommunityTours(currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const [selectedFilter, setSelectedFilter] = useState<GuideTourFilter>('all');
  const guideTours = useMemo(
    () =>
      getGuideTours({
        communityId: currentCommunityId,
        guideId,
        localDrafts,
        remoteTours: communityTours,
      }),
    [communityTours, currentCommunityId, guideId, localDrafts],
  );
  const counts = useMemo(() => countGuideToursByFilter(guideTours), [guideTours]);
  const visibleTours = useMemo(
    () => filterGuideTours(guideTours, selectedFilter),
    [guideTours, selectedFilter],
  );
  const filterOptions = useMemo<readonly FilterChipOption<GuideTourFilter>[]>(
    () =>
      GUIDE_TOUR_FILTERS.map((filter) => ({
        id: filter,
        label: `${t(`tourTabs.${filter}`)} (${counts[filter].toString()})`,
      })),
    [counts, t],
  );

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <AppText color={theme.colors.primary} variant="label">
            {t('privateDraftLabel')}
          </AppText>
          <AppText variant="title">{t('toursTitle')}</AppText>
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('toursDescription')}
          </AppText>
        </View>
        <PrimaryButton
          icon={<PlusCircle color="#ffffff" size={18} />}
          onPress={() => router.push(createTourRoute)}
        >
          {t('newTourCta')}
        </PrimaryButton>
      </View>

      <FilterChipRow
        onSelect={setSelectedFilter}
        options={filterOptions}
        selectedId={selectedFilter}
      />

      {visibleTours.length === 0 ? (
        <InfoCard description={t('tourEmptyBody')} title={t('tourEmptyTitle')}>
          <PrimaryButton
            icon={<PlusCircle color="#ffffff" size={18} />}
            onPress={() => router.push(createTourRoute)}
          >
            {t('newTourCta')}
          </PrimaryButton>
        </InfoCard>
      ) : (
        <View style={styles.list}>
          {visibleTours.map((tour) => (
            <GuideTourCard key={tour.id} tour={tour} />
          ))}
        </View>
      )}
    </Screen>
  );
}

type GuideTourCardProps = {
  readonly tour: Tour;
};

function GuideTourCard({ tour }: GuideTourCardProps) {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('guide');
  const subAreaNames = tour.subAreaIds
    .map(
      (subAreaId) => INITIAL_COMMUNITY.subAreas.find((subArea) => subArea.id === subAreaId)?.name,
    )
    .filter((name): name is string => Boolean(name));
  const canOpenPublicDetail = tour.status === 'published';

  return (
    <InfoCard
      description={resolveLocalizedText(tour.description, language)}
      title={resolveLocalizedText(tour.title, language)}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.statusPill, { backgroundColor: theme.colors.surfaceMuted }]}>
          <AppText color={theme.colors.primary} variant="label">
            {t(`tourStatusLabels.${tour.status}`)}
          </AppText>
        </View>
        <AppText color={theme.colors.primary} variant="label">
          {formatTourPrice(tour, language)}
        </AppText>
      </View>

      <View style={styles.metaGrid}>
        <MetaItem
          icon={<MapPinned color={theme.colors.primary} size={16} />}
          value={subAreaNames.join(' + ')}
        />
        <MetaItem
          icon={<Clock3 color={theme.colors.primary} size={16} />}
          value={formatTourDuration(tour.route.estimatedDuration)}
        />
        <MetaItem
          icon={<UsersRound color={theme.colors.primary} size={16} />}
          value={t('tourCapacity', { count: tour.capacity.maxTourists })}
        />
        <MetaItem
          icon={<Languages color={theme.colors.primary} size={16} />}
          value={tour.languages.map((item) => item.toUpperCase()).join(', ')}
        />
        <MetaItem
          icon={<Star color={theme.colors.primary} size={16} />}
          value={`${formatTourCategory(tour.category, language)} / ${formatTourDifficulty(
            tour.difficulty,
            language,
          )}`}
        />
      </View>

      <View style={styles.statsRow}>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {t('tourStops', { count: tour.route.points.length })}
        </AppText>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {t('tourStats', {
            bookings: tour.stats.totalBookings,
            reviews: tour.stats.totalReviews,
          })}
        </AppText>
      </View>

      {canOpenPublicDetail ? (
        <PrimaryButton
          icon={<Eye color="#ffffff" size={18} />}
          onPress={() => router.push(`/tour/${tour.id}`)}
          variant="secondary"
        >
          {t('openTour')}
        </PrimaryButton>
      ) : null}
      <PrimaryButton
        icon={<Pencil color={theme.colors.primary} size={18} />}
        onPress={() => router.push(`/guide-tours/new?tourId=${encodeURIComponent(tour.id)}`)}
        variant="ghost"
      >
        {t('editTour')}
      </PrimaryButton>
    </InfoCard>
  );
}

type MetaItemProps = {
  readonly icon: ReactNode;
  readonly value: string;
};

function MetaItem({ icon, value }: MetaItemProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.metaItem, { backgroundColor: theme.colors.surfaceMuted }]}>
      {icon}
      <AppText variant="caption">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  cardHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  header: {
    gap: 14,
  },
  headerCopy: {
    gap: 7,
  },
  list: {
    gap: 14,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaItem: {
    alignItems: 'center',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
