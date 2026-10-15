import {
  filterTours,
  INITIAL_COMMUNITY,
  SUPPORTED_LANGUAGES,
  type SupportedLanguageCode,
  type TourCategory,
  type TourFilterCriteria,
} from '@conexao-favela/shared';
import { router } from 'expo-router';
import { XCircle } from 'lucide-react-native';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { FilterChipRow, type FilterChipOption } from '@/features/tours/FilterChipRow';
import {
  ALL_TOUR_SUB_AREAS,
  SubAreaFilterBar,
  type TourSubAreaFilter,
} from '@/features/tours/SubAreaFilterBar';
import { TourCard } from '@/features/tours/TourCard';
import { formatTourCategory } from '@/features/tours/tour-formatters';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

const ALL_EXPLORE_FILTERS = '__all__';

type TourDateFilter = typeof ALL_EXPLORE_FILTERS | 'today' | 'tomorrow' | 'weekend';
type TourLanguageFilter = typeof ALL_EXPLORE_FILTERS | SupportedLanguageCode;
type TourCategoryFilter = typeof ALL_EXPLORE_FILTERS | TourCategory;
type TourPriceFilter =
  | typeof ALL_EXPLORE_FILTERS
  | 'entry-up-to-80'
  | 'entry-up-to-120'
  | 'premium';

function getTomorrowDayOfWeek(now: Date): number {
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  return tomorrow.getDay();
}

function resolveScheduledDays(filter: TourDateFilter, now: Date): readonly number[] | undefined {
  if (filter === 'today') {
    return [now.getDay()];
  }

  if (filter === 'tomorrow') {
    return [getTomorrowDayOfWeek(now)];
  }

  if (filter === 'weekend') {
    return [0, 6];
  }

  return undefined;
}

function resolvePriceCriteria(
  filter: TourPriceFilter,
): TourFilterCriteria['pricePerPerson'] | undefined {
  if (filter === 'entry-up-to-80') {
    return { max: 80 };
  }

  if (filter === 'entry-up-to-120') {
    return { max: 120 };
  }

  if (filter === 'premium') {
    return { min: 121 };
  }

  return undefined;
}

export default function ExploreScreen() {
  const { t } = useTranslation(['common', 'tours']);
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const [selectedSubAreaId, setSelectedSubAreaId] = useState<TourSubAreaFilter>(ALL_TOUR_SUB_AREAS);
  const [selectedDateFilter, setSelectedDateFilter] = useState<TourDateFilter>(ALL_EXPLORE_FILTERS);
  const [selectedLanguageFilter, setSelectedLanguageFilter] =
    useState<TourLanguageFilter>(ALL_EXPLORE_FILTERS);
  const [selectedCategoryFilter, setSelectedCategoryFilter] =
    useState<TourCategoryFilter>(ALL_EXPLORE_FILTERS);
  const [selectedPriceFilter, setSelectedPriceFilter] =
    useState<TourPriceFilter>(ALL_EXPLORE_FILTERS);
  const [referenceDate] = useState(() => new Date());
  const { tours: communityTours } = useCommunityTours(currentCommunityId);
  const activeLanguageOptions = useMemo(() => {
    const tourLanguages = new Set<SupportedLanguageCode>();

    for (const tour of communityTours) {
      for (const tourLanguage of tour.languages) {
        tourLanguages.add(tourLanguage);
      }
    }

    return SUPPORTED_LANGUAGES.filter((supportedLanguage) =>
      tourLanguages.has(supportedLanguage.code),
    );
  }, [communityTours]);
  const activeCategoryOptions = useMemo(
    () =>
      [...new Set<TourCategory>(communityTours.map((tour) => tour.category))].sort(
        (first, second) =>
          formatTourCategory(first, language).localeCompare(formatTourCategory(second, language)),
      ),
    [communityTours, language],
  );
  const dateOptions: readonly FilterChipOption<TourDateFilter>[] = [
    { id: ALL_EXPLORE_FILTERS, label: t('tours:allDates') },
    { id: 'today', label: t('tours:today') },
    { id: 'tomorrow', label: t('tours:tomorrow') },
    { id: 'weekend', label: t('tours:weekend') },
  ];
  const languageOptions: readonly FilterChipOption<TourLanguageFilter>[] = [
    { id: ALL_EXPLORE_FILTERS, label: t('tours:allLanguages') },
    ...activeLanguageOptions.map((supportedLanguage) => ({
      id: supportedLanguage.code,
      label: supportedLanguage.nativeName,
    })),
  ];
  const categoryOptions: readonly FilterChipOption<TourCategoryFilter>[] = [
    { id: ALL_EXPLORE_FILTERS, label: t('tours:allCategories') },
    ...activeCategoryOptions.map((category) => ({
      id: category,
      label: formatTourCategory(category, language),
    })),
  ];
  const priceOptions: readonly FilterChipOption<TourPriceFilter>[] = [
    { id: ALL_EXPLORE_FILTERS, label: t('tours:allPrices') },
    { id: 'entry-up-to-80', label: t('tours:entryUpTo80') },
    { id: 'entry-up-to-120', label: t('tours:entryUpTo120') },
    { id: 'premium', label: t('tours:premiumPrice') },
  ];
  const hasActiveFilters =
    selectedSubAreaId !== ALL_TOUR_SUB_AREAS ||
    selectedDateFilter !== ALL_EXPLORE_FILTERS ||
    selectedLanguageFilter !== ALL_EXPLORE_FILTERS ||
    selectedCategoryFilter !== ALL_EXPLORE_FILTERS ||
    selectedPriceFilter !== ALL_EXPLORE_FILTERS;
  const visibleTours = useMemo(
    () =>
      filterTours(communityTours, {
        category:
          selectedCategoryFilter === ALL_EXPLORE_FILTERS ? undefined : selectedCategoryFilter,
        communityId: currentCommunityId,
        language:
          selectedLanguageFilter === ALL_EXPLORE_FILTERS ? undefined : selectedLanguageFilter,
        pricePerPerson: resolvePriceCriteria(selectedPriceFilter),
        scheduledDays: resolveScheduledDays(selectedDateFilter, referenceDate),
        subAreaId: selectedSubAreaId === ALL_TOUR_SUB_AREAS ? undefined : selectedSubAreaId,
      }),
    [
      communityTours,
      currentCommunityId,
      referenceDate,
      selectedCategoryFilter,
      selectedDateFilter,
      selectedLanguageFilter,
      selectedPriceFilter,
      selectedSubAreaId,
    ],
  );

  function clearFilters(): void {
    setSelectedSubAreaId(ALL_TOUR_SUB_AREAS);
    setSelectedDateFilter(ALL_EXPLORE_FILTERS);
    setSelectedLanguageFilter(ALL_EXPLORE_FILTERS);
    setSelectedCategoryFilter(ALL_EXPLORE_FILTERS);
    setSelectedPriceFilter(ALL_EXPLORE_FILTERS);
  }

  return (
    <Screen>
      <AppText variant="title">{t('common:explore')}</AppText>
      <View style={styles.filterBlock}>
        <View style={styles.filterHeader}>
          <View style={styles.filterTitleBlock}>
            <AppText variant="label">{t('tours:filters')}</AppText>
            <AppText color={theme.colors.textSecondary} variant="caption">
              {t('tours:resultsCount', { count: visibleTours.length })}
            </AppText>
          </View>
          <PrimaryButton
            disabled={!hasActiveFilters}
            icon={<XCircle color={theme.colors.primary} size={18} />}
            onPress={clearFilters}
            style={styles.clearButton}
            variant="ghost"
          >
            {t('tours:clearFilters')}
          </PrimaryButton>
        </View>
        <FilterSection title={t('tours:filterArea')}>
          <SubAreaFilterBar
            allLabel={t('tours:allAreas')}
            onSelect={setSelectedSubAreaId}
            selectedSubAreaId={selectedSubAreaId}
            subAreas={INITIAL_COMMUNITY.subAreas}
          />
        </FilterSection>
        <FilterSection title={t('tours:filterDate')}>
          <FilterChipRow
            onSelect={setSelectedDateFilter}
            options={dateOptions}
            selectedId={selectedDateFilter}
          />
        </FilterSection>
        <FilterSection title={t('tours:filterLanguage')}>
          <FilterChipRow
            onSelect={setSelectedLanguageFilter}
            options={languageOptions}
            selectedId={selectedLanguageFilter}
          />
        </FilterSection>
        <FilterSection title={t('tours:filterCategory')}>
          <FilterChipRow
            onSelect={setSelectedCategoryFilter}
            options={categoryOptions}
            selectedId={selectedCategoryFilter}
          />
        </FilterSection>
        <FilterSection title={t('tours:filterPrice')}>
          <FilterChipRow
            onSelect={setSelectedPriceFilter}
            options={priceOptions}
            selectedId={selectedPriceFilter}
          />
        </FilterSection>
      </View>
      <View style={styles.list}>
        {visibleTours.map((tour) => (
          <TourCard
            key={tour.id}
            onPress={() => router.push(`/tour/${tour.id}`)}
            subAreas={INITIAL_COMMUNITY.subAreas}
            tour={tour}
          />
        ))}
      </View>
      {visibleTours.length === 0 ? (
        <InfoCard description={t('tours:empty')} title={t('tours:featuredTours')} />
      ) : null}
    </Screen>
  );
}

type FilterSectionProps = {
  readonly children: ReactNode;
  readonly title: string;
};

function FilterSection({ children, title }: FilterSectionProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.filterSection}>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {title}
      </AppText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  clearButton: {
    minHeight: 40,
    paddingHorizontal: 12,
  },
  filterBlock: {
    gap: 14,
  },
  filterHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  filterSection: {
    gap: 8,
  },
  filterTitleBlock: {
    flex: 1,
    gap: 2,
  },
  list: {
    gap: 14,
  },
});
