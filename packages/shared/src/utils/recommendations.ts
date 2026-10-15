import type { SupportedLanguageCode } from '../languages';
import type { Tour, TourCategory, TourRecommendation } from '../types';

const interestToCategory: Readonly<Record<string, TourCategory>> = {
  arte: 'arte',
  cultural: 'cultural',
  cultura: 'cultural',
  fotografia: 'fotografico',
  gastronomia: 'gastronomico',
  historico: 'historico',
  natureza: 'natureza',
};

export function recommendTours(input: {
  readonly communityId: string;
  readonly favoriteTourIds: readonly string[];
  readonly interests: readonly string[];
  readonly language: SupportedLanguageCode;
  readonly preferredSubAreaIds?: readonly string[];
  readonly tours: readonly Tour[];
}): readonly TourRecommendation[] {
  const interestCategories = new Set(
    input.interests
      .map((interest) => interestToCategory[interest.trim().toLowerCase()])
      .filter((category): category is TourCategory => Boolean(category)),
  );
  const preferredSubAreas = new Set(input.preferredSubAreaIds ?? []);

  return input.tours
    .filter((tour) => tour.communityId === input.communityId && tour.status === 'published')
    .map((tour) => {
      const reasons: TourRecommendation['reasons'][number][] = [];
      let score = tour.stats.averageRating * 5 + Math.min(tour.stats.totalBookings, 20);

      if (interestCategories.has(tour.category)) {
        score += 35;
        reasons.push('category');
      }
      if (tour.languages.includes(input.language)) {
        score += 20;
        reasons.push('language');
      }
      if (tour.subAreaIds.some((subAreaId) => preferredSubAreas.has(subAreaId))) {
        score += 15;
        reasons.push('sub_area');
      }
      if (input.favoriteTourIds.includes(tour.id)) {
        score += 10;
        reasons.push('favorite');
      }

      return { communityId: tour.communityId, reasons, score, tourId: tour.id };
    })
    .sort(
      (first, second) => second.score - first.score || first.tourId.localeCompare(second.tourId),
    );
}
