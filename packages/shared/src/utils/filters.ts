import type { SupportedLanguageCode } from '../languages';
import type { PoiCategory, PointOfInterest, Tour, TourCategory } from '../types';

export type TourFilterCriteria = {
  readonly category?: TourCategory;
  readonly communityId?: string;
  readonly language?: SupportedLanguageCode;
  readonly pricePerPerson?: {
    readonly max?: number;
    readonly min?: number;
  };
  readonly scheduledDays?: readonly number[];
  readonly subAreaId?: string;
};

export function filterToursByCommunity<TTour extends Pick<Tour, 'communityId'>>(
  tours: readonly TTour[],
  communityId: string,
): TTour[] {
  return tours.filter((tour) => tour.communityId === communityId);
}

export function filterToursBySubArea<TTour extends Pick<Tour, 'subAreaIds'>>(
  tours: readonly TTour[],
  subAreaId: string,
): TTour[] {
  return tours.filter((tour) => tour.subAreaIds.includes(subAreaId));
}

function tourMatchesScheduledDays(
  tour: Pick<Tour, 'schedule'>,
  scheduledDays: readonly number[] | undefined,
): boolean {
  if (!scheduledDays || scheduledDays.length === 0) {
    return true;
  }

  const validDays = scheduledDays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6);

  if (validDays.length === 0) {
    return true;
  }

  const recurringDays = tour.schedule.recurringDays ?? [];

  if (recurringDays.some((day) => validDays.includes(day))) {
    return true;
  }

  return (
    tour.schedule.specificDates?.some((date) => validDays.includes(date.toDate().getDay())) ?? false
  );
}

function tourMatchesPrice(
  tour: Pick<Tour, 'pricing'>,
  pricePerPerson: TourFilterCriteria['pricePerPerson'],
): boolean {
  if (!pricePerPerson) {
    return true;
  }

  const meetsMinimum =
    pricePerPerson.min === undefined || tour.pricing.maxPrice >= pricePerPerson.min;
  const meetsMaximum =
    pricePerPerson.max === undefined || tour.pricing.minPrice <= pricePerPerson.max;

  return meetsMinimum && meetsMaximum;
}

export function filterTours<
  TTour extends Pick<
    Tour,
    'category' | 'communityId' | 'languages' | 'pricing' | 'schedule' | 'subAreaIds'
  >,
>(tours: readonly TTour[], criteria: TourFilterCriteria): TTour[] {
  return tours.filter((tour) => {
    const matchesCommunity =
      criteria.communityId === undefined || tour.communityId === criteria.communityId;
    const matchesSubArea =
      criteria.subAreaId === undefined || tour.subAreaIds.includes(criteria.subAreaId);
    const matchesLanguage =
      criteria.language === undefined || tour.languages.includes(criteria.language);
    const matchesCategory = criteria.category === undefined || tour.category === criteria.category;

    return (
      matchesCommunity &&
      matchesSubArea &&
      matchesLanguage &&
      matchesCategory &&
      tourMatchesScheduledDays(tour, criteria.scheduledDays) &&
      tourMatchesPrice(tour, criteria.pricePerPerson)
    );
  });
}

export function filterPoisBySubArea<TPoi extends Pick<PointOfInterest, 'subAreaId'>>(
  pois: readonly TPoi[],
  subAreaId: string,
): TPoi[] {
  return pois.filter((poi) => poi.subAreaId === subAreaId);
}

export function filterPoisByCommunity<TPoi extends Pick<PointOfInterest, 'communityId'>>(
  pois: readonly TPoi[],
  communityId: string,
): TPoi[] {
  return pois.filter((poi) => poi.communityId === communityId);
}

export function filterPoisByCategory<TPoi extends Pick<PointOfInterest, 'category'>>(
  pois: readonly TPoi[],
  category: PoiCategory,
): TPoi[] {
  return pois.filter((poi) => poi.category === category);
}
