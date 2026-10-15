import {
  filterPoisByCategory,
  filterPoisByCommunity,
  filterPoisBySubArea,
  INITIAL_COMMUNITY,
  INITIAL_POIS,
  resolveLocalizedText,
  type PoiCategory,
  type PointOfInterest,
} from '@conexao-favela/shared';
import { router } from 'expo-router';
import { Accessibility, Clock3, Eye, Layers3, MapPinned, Route } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { CommunityMap } from '@/features/pois/CommunityMap';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

const ALL_POI_SUB_AREAS = '__all_sub_areas__';
const ALL_POI_CATEGORIES = '__all_categories__';

type PoiSubAreaFilter = string;
type PoiCategoryFilter = typeof ALL_POI_CATEGORIES | PoiCategory;

const categoryOrder: readonly PoiCategory[] = [
  'teleferico',
  'mirante',
  'historico',
  'cultural',
  'natural',
  'gastronomico',
  'arte',
];

function formatCoordinates(poi: PointOfInterest): string {
  return `${poi.coordinates.lat.toFixed(5)}, ${poi.coordinates.lng.toFixed(5)}`;
}

export default function MapScreen() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['common', 'map']);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const [selectedSubAreaId, setSelectedSubAreaId] = useState<PoiSubAreaFilter>(ALL_POI_SUB_AREAS);
  const [selectedCategory, setSelectedCategory] = useState<PoiCategoryFilter>(ALL_POI_CATEGORIES);
  const [selectedPoiId, setSelectedPoiId] = useState<string | null>(null);

  const communityPois = useMemo(
    () => filterPoisByCommunity(INITIAL_POIS, currentCommunityId),
    [currentCommunityId],
  );
  const availableCategories = useMemo(
    () =>
      categoryOrder.filter((category) => communityPois.some((poi) => poi.category === category)),
    [communityPois],
  );
  const visiblePois = useMemo(() => {
    const subAreaPois =
      selectedSubAreaId === ALL_POI_SUB_AREAS
        ? communityPois
        : filterPoisBySubArea(communityPois, selectedSubAreaId);

    return selectedCategory === ALL_POI_CATEGORIES
      ? subAreaPois
      : filterPoisByCategory(subAreaPois, selectedCategory);
  }, [communityPois, selectedCategory, selectedSubAreaId]);
  const selectedPoi = useMemo(
    () => visiblePois.find((poi) => poi.id === selectedPoiId) ?? visiblePois[0],
    [selectedPoiId, visiblePois],
  );
  const selectedSubArea = selectedPoi
    ? INITIAL_COMMUNITY.subAreas.find((subArea) => subArea.id === selectedPoi.subAreaId)
    : undefined;

  const renderPoi = ({
    item,
    index,
  }: {
    readonly item: PointOfInterest;
    readonly index: number;
  }) => {
    const selected = item.id === selectedPoi?.id;
    const subArea = INITIAL_COMMUNITY.subAreas.find((area) => area.id === item.subAreaId);

    return (
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={() => setSelectedPoiId(item.id)}
        style={({ pressed }) => [
          styles.poiCard,
          {
            backgroundColor: selected ? theme.colors.surfaceMuted : theme.colors.surface,
            borderColor: selected ? theme.colors.primary : theme.colors.border,
            opacity: pressed ? 0.78 : 1,
          },
        ]}
      >
        <View style={styles.poiHeader}>
          <View style={[styles.poiIndex, { backgroundColor: theme.colors.primary }]}>
            <AppText color="#ffffff" variant="label">
              {String(index + 1)}
            </AppText>
          </View>
          <View style={styles.poiTitleBlock}>
            <AppText variant="subtitle">{resolveLocalizedText(item.name, language)}</AppText>
            <AppText color={theme.colors.textSecondary} variant="caption">
              {subArea?.name} · {t(`map:categoryLabels.${item.category}`)}
            </AppText>
          </View>
        </View>
        <AppText color={theme.colors.textSecondary} variant="body">
          {resolveLocalizedText(item.description, language)}
        </AppText>
      </Pressable>
    );
  };

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <FlatList
        ListEmptyComponent={
          <InfoCard description={t('map:noResultsBody')} title={t('map:noResultsTitle')} />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title">{t('map:title')}</AppText>

            <InfoCard
              description={t('map:summaryBody', {
                categories: availableCategories.length,
                subAreas: INITIAL_COMMUNITY.subAreas.length,
              })}
              title={t('map:summaryTitle', { count: communityPois.length })}
            >
              <View style={styles.summaryRow}>
                <View style={[styles.summaryIcon, { backgroundColor: theme.colors.surfaceMuted }]}>
                  <MapPinned color={theme.colors.primary} size={24} />
                </View>
                <View style={styles.summaryText}>
                  <AppText color={theme.colors.textSecondary} variant="caption">
                    {INITIAL_COMMUNITY.city}, {INITIAL_COMMUNITY.state}
                  </AppText>
                  <AppText variant="label">
                    {t('map:visiblePois', { count: visiblePois.length })}
                  </AppText>
                </View>
              </View>
            </InfoCard>

            <View style={styles.filterBlock}>
              <View style={styles.sectionTitleRow}>
                <Layers3 color={theme.colors.primary} size={18} />
                <AppText variant="label">{t('map:filters')}</AppText>
              </View>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {t('map:subAreas')}
              </AppText>
              <FlatList
                horizontal
                contentContainerStyle={styles.chipList}
                data={[
                  { id: ALL_POI_SUB_AREAS, label: t('map:allSubAreas') },
                  ...INITIAL_COMMUNITY.subAreas.map((subArea) => ({
                    id: subArea.id,
                    label: subArea.name,
                  })),
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item.label}
                    onPress={() => setSelectedSubAreaId(item.id)}
                    selected={selectedSubAreaId === item.id}
                  />
                )}
                showsHorizontalScrollIndicator={false}
              />

              <AppText color={theme.colors.textSecondary} variant="caption">
                {t('map:categories')}
              </AppText>
              <FlatList
                horizontal
                contentContainerStyle={styles.chipList}
                data={[
                  { id: ALL_POI_CATEGORIES, label: t('map:allCategories') },
                  ...availableCategories.map((category) => ({
                    id: category,
                    label: t(`map:categoryLabels.${category}`),
                  })),
                ]}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <FilterChip
                    label={item.label}
                    onPress={() => setSelectedCategory(item.id as PoiCategoryFilter)}
                    selected={selectedCategory === item.id}
                  />
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            <View
              style={[
                styles.mapPreview,
                {
                  backgroundColor: theme.colors.surfaceMuted,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <View style={styles.sectionTitleRow}>
                <Route color={theme.colors.primary} size={18} />
                <AppText variant="label">{t('map:mapPreview')}</AppText>
              </View>
              <CommunityMap
                center={INITIAL_COMMUNITY.centerCoordinates}
                getPoiLabel={(poi) => resolveLocalizedText(poi.name, language)}
                onSelectPoi={setSelectedPoiId}
                pois={visiblePois}
                selectedPoiId={selectedPoi?.id}
              />
            </View>

            {selectedPoi ? (
              <InfoCard
                description={resolveLocalizedText(selectedPoi.description, language)}
                title={resolveLocalizedText(selectedPoi.name, language)}
              >
                <View style={styles.detailGrid}>
                  <DetailItem
                    label={t('map:category')}
                    value={t(`map:categoryLabels.${selectedPoi.category}`)}
                  />
                  <DetailItem label={t('map:subArea')} value={selectedSubArea?.name ?? ''} />
                  <DetailItem label={t('map:coordinates')} value={formatCoordinates(selectedPoi)} />
                  <DetailItem
                    label={t('map:bestTime')}
                    value={selectedPoi.bestTimeToVisit ?? t('map:no')}
                  />
                </View>
                <View style={styles.accessibilityBlock}>
                  <View style={styles.sectionTitleRow}>
                    <Accessibility color={theme.colors.primary} size={18} />
                    <AppText variant="label">{t('map:accessibility')}</AppText>
                  </View>
                  <View style={styles.accessibilityRow}>
                    <StatusPill
                      active={selectedPoi.accessibility.wheelchairAccessible}
                      label={t('map:wheelchair')}
                    />
                    <StatusPill
                      active={selectedPoi.accessibility.hasRestrooms}
                      label={t('map:restrooms')}
                    />
                    <StatusPill
                      active={selectedPoi.accessibility.hasParking}
                      label={t('map:parking')}
                    />
                  </View>
                </View>
                <PrimaryButton
                  icon={<Eye color="#ffffff" size={18} />}
                  onPress={() => router.push(`/poi/${selectedPoi.id}`)}
                >
                  {t('map:openPoiDetail')}
                </PrimaryButton>
              </InfoCard>
            ) : null}

            <View style={styles.sectionTitleRow}>
              <Clock3 color={theme.colors.primary} size={18} />
              <AppText variant="label">{t('map:poiList')}</AppText>
            </View>
          </View>
        }
        contentContainerStyle={styles.listContent}
        data={visiblePois}
        keyExtractor={(item) => item.id}
        renderItem={renderPoi}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

type FilterChipProps = {
  readonly label: string;
  readonly onPress: () => void;
  readonly selected: boolean;
};

function FilterChip({ label, onPress, selected }: FilterChipProps) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.colors.primaryDark : theme.colors.surface,
          borderColor: selected ? theme.colors.primary : theme.colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <AppText color={selected ? '#ffffff' : theme.colors.textPrimary} variant="label">
        {label}
      </AppText>
    </Pressable>
  );
}

type DetailItemProps = {
  readonly label: string;
  readonly value: string;
};

function DetailItem({ label, value }: DetailItemProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.detailItem, { backgroundColor: theme.colors.surfaceMuted }]}>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

type StatusPillProps = {
  readonly active: boolean;
  readonly label: string;
};

function StatusPill({ active, label }: StatusPillProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('map');
  const statusLabel = active ? t('yes') : t('no');

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: active ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: active ? theme.colors.success : theme.colors.border,
        },
      ]}
    >
      <AppText color={active ? theme.colors.success : theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{statusLabel}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  accessibilityBlock: {
    gap: 10,
  },
  accessibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  chipList: {
    gap: 10,
    paddingRight: 20,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    borderRadius: 12,
    flexBasis: 150,
    flexGrow: 1,
    gap: 3,
    padding: 12,
  },
  filterBlock: {
    gap: 10,
  },
  header: {
    gap: 18,
  },
  listContent: {
    gap: 12,
    paddingBottom: 24,
  },
  mapPreview: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  poiCard: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  poiHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  poiIndex: {
    alignItems: 'center',
    borderRadius: 999,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  poiTitleBlock: {
    flex: 1,
    gap: 3,
  },
  screen: {
    paddingBottom: 0,
  },
  sectionTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  statusPill: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  summaryIcon: {
    alignItems: 'center',
    borderRadius: 14,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  summaryRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  summaryText: {
    flex: 1,
    gap: 3,
  },
});
