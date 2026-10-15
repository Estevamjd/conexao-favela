import { INITIAL_COMMUNITY_ID, INITIAL_TOURS, type Tour } from '@conexao-favela/shared';
import { describe, expect, it } from 'vitest';
import { countGuideToursByFilter, filterGuideTours, getGuideTours } from './guide-tour-list';

const guideId = 'seed-guide-teleferico';

function getSeedTour(): Tour {
  const tour = INITIAL_TOURS[0];

  if (!tour) {
    throw new Error('Expected at least one seed tour for guide tour list tests.');
  }

  return tour;
}

function tourVariant(tour: Tour, overrides: Partial<Tour>): Tour {
  return {
    ...tour,
    ...overrides,
  };
}

describe('guide tour list helpers', () => {
  it('merges remote tours and local drafts inside the active guide community', () => {
    const remoteTour = getSeedTour();
    const localDraft = tourVariant(remoteTour, {
      id: 'local-draft',
      status: 'draft',
      title: { pt: 'Rascunho local' },
    });
    const otherGuideTour = tourVariant(remoteTour, {
      guideId: 'other-guide',
      id: 'other-guide-tour',
      status: 'draft',
    });

    const tours = getGuideTours({
      communityId: INITIAL_COMMUNITY_ID,
      guideId,
      localDrafts: [localDraft, otherGuideTour],
      remoteTours: [remoteTour],
    });

    expect(tours.map((tour) => tour.id)).toEqual(['local-draft', 'memorias-do-teleferico']);
  });

  it('filters and counts tours by operational status', () => {
    const baseTour = getSeedTour();
    const publishedTour = tourVariant(baseTour, {
      guideId,
      status: 'published',
    });
    const pausedTour = tourVariant(baseTour, {
      id: 'paused-tour',
      guideId,
      status: 'paused',
    });

    const tours = [publishedTour, pausedTour];

    expect(filterGuideTours(tours, 'paused')).toEqual([pausedTour]);
    expect(countGuideToursByFilter(tours)).toEqual({
      all: 2,
      archived: 0,
      draft: 0,
      paused: 1,
      published: 1,
    });
  });
});
