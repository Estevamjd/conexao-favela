import type { Tour } from '@conexao-favela/shared';

export type FavoriteTourRecord = {
  readonly communityId: string;
  readonly savedAtIso: string;
  readonly tourId: string;
};

export type FavoriteTourInput = Pick<FavoriteTourRecord, 'communityId' | 'tourId'>;

function sameFavorite(left: FavoriteTourInput, right: FavoriteTourInput): boolean {
  return left.communityId === right.communityId && left.tourId === right.tourId;
}

export function isFavoriteTourRecord(value: unknown): value is FavoriteTourRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<FavoriteTourRecord>;

  return (
    typeof candidate.communityId === 'string' &&
    typeof candidate.savedAtIso === 'string' &&
    typeof candidate.tourId === 'string'
  );
}

export function isFavoriteTour(
  records: readonly FavoriteTourRecord[],
  input: FavoriteTourInput,
): boolean {
  return records.some((record) => sameFavorite(record, input));
}

export function toggleFavoriteTour(
  records: readonly FavoriteTourRecord[],
  input: FavoriteTourInput,
  now = new Date(),
): readonly FavoriteTourRecord[] {
  if (isFavoriteTour(records, input)) {
    return records.filter((record) => !sameFavorite(record, input));
  }

  // Keep communityId on the record so the same tourist can favorite tours across
  // future communities without mixing catalogs in the local MVP cache.
  return [
    {
      ...input,
      savedAtIso: now.toISOString(),
    },
    ...records,
  ];
}

export function getFavoriteToursForCommunity(
  records: readonly FavoriteTourRecord[],
  tours: readonly Tour[],
  communityId: string,
): readonly Tour[] {
  const tourById = new Map(tours.map((tour) => [tour.id, tour]));
  const scopedRecords = records
    .filter((record) => record.communityId === communityId)
    .sort((first, second) => second.savedAtIso.localeCompare(first.savedAtIso));

  return scopedRecords
    .map((record) => tourById.get(record.tourId))
    .filter((tour): tour is Tour => tour !== undefined);
}
