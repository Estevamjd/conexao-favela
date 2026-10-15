import type { TourDraftInput } from '../schemas/domain';
import type { Tour, TourStatus } from '../types';

type BuildTourFromDraftOptions = {
  readonly estimatedTimePerStop?: number;
  readonly id: string;
  readonly status?: TourStatus;
  readonly totalDistance?: number;
};

export function buildTourFromDraft(
  input: TourDraftInput,
  options: BuildTourFromDraftOptions,
): Tour {
  const estimatedTimePerStop = options.estimatedTimePerStop ?? 25;
  const pricingType: Tour['pricing']['type'] =
    input.minPrice === 0 && input.maxPrice === 0
      ? 'free'
      : input.minPrice === input.maxPrice
        ? 'fixed'
        : 'range';

  return {
    id: options.id,
    guideId: input.guideId,
    communityId: input.communityId,
    subAreaIds: input.subAreaIds,
    title: input.title,
    description: input.description,
    route: {
      points: input.poiIds.map((poiId, index) => ({
        estimatedTime: estimatedTimePerStop,
        order: index + 1,
        poiId,
      })),
      totalDistance: options.totalDistance ?? Math.max(input.poiIds.length - 1, 1) * 700,
      estimatedDuration: input.poiIds.length * estimatedTimePerStop,
    },
    pricing: {
      type: pricingType,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      currency: 'BRL',
    },
    capacity: {
      minTourists: 1,
      maxTourists: input.maxTourists,
    },
    languages: input.languages,
    category: input.category,
    difficulty: input.difficulty,
    schedule: {
      isRecurring: false,
    },
    status: options.status ?? 'draft',
    media: {
      coverImageUrl: `dev://tour-drafts/${options.id}/cover.jpg`,
      galleryUrls: [],
    },
    stats: {
      totalBookings: 0,
      averageRating: 0,
      totalReviews: 0,
    },
  };
}
