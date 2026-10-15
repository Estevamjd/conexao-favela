import type { Tour, TourStatus } from '@conexao-favela/shared';

export const GUIDE_TOUR_FILTERS = ['all', 'published', 'draft', 'paused', 'archived'] as const;

export type GuideTourFilter = (typeof GUIDE_TOUR_FILTERS)[number];

type GuideTourInput = {
  readonly communityId: string;
  readonly guideId: string;
  readonly localDrafts: readonly Tour[];
  readonly remoteTours: readonly Tour[];
};

type GuideTourCounts = Readonly<Record<GuideTourFilter, number>>;

const statusSortWeight: Record<TourStatus, number> = {
  draft: 0,
  published: 1,
  paused: 2,
  archived: 3,
};

function belongsToGuideCommunity(tour: Tour, guideId: string, communityId: string): boolean {
  return tour.guideId === guideId && tour.communityId === communityId;
}

export function getGuideTours({
  communityId,
  guideId,
  localDrafts,
  remoteTours,
}: GuideTourInput): readonly Tour[] {
  const toursById = new Map<string, Tour>();

  for (const tour of remoteTours) {
    if (belongsToGuideCommunity(tour, guideId, communityId)) {
      toursById.set(tour.id, tour);
    }
  }

  for (const tour of localDrafts) {
    if (belongsToGuideCommunity(tour, guideId, communityId)) {
      // Local drafts can represent just-created optimistic tours, so they intentionally win by ID.
      toursById.set(tour.id, tour);
    }
  }

  return [...toursById.values()].sort((first, second) => {
    const statusDelta = statusSortWeight[first.status] - statusSortWeight[second.status];

    if (statusDelta !== 0) {
      return statusDelta;
    }

    return first.title.pt.localeCompare(second.title.pt);
  });
}

export function filterGuideTours(
  tours: readonly Tour[],
  selectedFilter: GuideTourFilter,
): readonly Tour[] {
  if (selectedFilter === 'all') {
    return tours;
  }

  return tours.filter((tour) => tour.status === selectedFilter);
}

export function countGuideToursByFilter(tours: readonly Tour[]): GuideTourCounts {
  const counts: Record<GuideTourFilter, number> = {
    all: tours.length,
    archived: 0,
    draft: 0,
    paused: 0,
    published: 0,
  };

  for (const tour of tours) {
    counts[tour.status] += 1;
  }

  return counts;
}
