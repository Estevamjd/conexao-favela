import { INITIAL_COMMUNITY_ID, INITIAL_TOURS } from '@conexao-favela/shared';
import { describe, expect, it } from 'vitest';
import {
  getFavoriteToursForCommunity,
  isFavoriteTour,
  isFavoriteTourRecord,
  toggleFavoriteTour,
  type FavoriteTourRecord,
} from './favorite-tours';

describe('favorite tour helpers', () => {
  it('toggles a favorite inside a community scope', () => {
    const input = { communityId: INITIAL_COMMUNITY_ID, tourId: 'memorias-do-teleferico' };
    const saved = toggleFavoriteTour([], input, new Date('2026-06-16T12:00:00.000Z'));

    expect(isFavoriteTour(saved, input)).toBe(true);
    expect(toggleFavoriteTour(saved, input)).toEqual([]);
  });

  it('keeps favorites isolated by community', () => {
    const records: readonly FavoriteTourRecord[] = [
      {
        communityId: INITIAL_COMMUNITY_ID,
        savedAtIso: '2026-06-16T12:00:00.000Z',
        tourId: 'memorias-do-teleferico',
      },
      {
        communityId: 'future-community',
        savedAtIso: '2026-06-17T12:00:00.000Z',
        tourId: 'arte-becos-e-sabores',
      },
    ];

    expect(getFavoriteToursForCommunity(records, INITIAL_TOURS, INITIAL_COMMUNITY_ID)).toEqual([
      INITIAL_TOURS[0],
    ]);
  });

  it('guards persisted records before hydration', () => {
    expect(
      isFavoriteTourRecord({
        communityId: INITIAL_COMMUNITY_ID,
        savedAtIso: '2026-06-16T12:00:00.000Z',
        tourId: 'memorias-do-teleferico',
      }),
    ).toBe(true);
    expect(isFavoriteTourRecord({ communityId: INITIAL_COMMUNITY_ID })).toBe(false);
  });
});
