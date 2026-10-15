import type { SupportedLanguageCode } from '../languages';
import type { OfflineCommunityPack, PointOfInterest, Tour } from '../types';
import { timestampFromDate } from './timestamps';

export function buildOfflineCommunityPack(input: {
  readonly communityId: string;
  readonly languageCodes: readonly SupportedLanguageCode[];
  readonly pois: readonly PointOfInterest[];
  readonly tours: readonly Tour[];
  readonly version: number;
  readonly now?: Date;
}): OfflineCommunityPack {
  const timestamp = timestampFromDate(input.now ?? new Date());

  return {
    communityId: input.communityId,
    downloadedAt: timestamp,
    id: `${input.communityId}-v${input.version.toString()}`,
    languageCodes: input.languageCodes,
    poiIds: input.pois.filter((poi) => poi.communityId === input.communityId).map((poi) => poi.id),
    pois: input.pois.filter((poi) => poi.communityId === input.communityId),
    status: 'ready',
    tourIds: input.tours
      .filter((tour) => tour.communityId === input.communityId && tour.status === 'published')
      .map((tour) => tour.id),
    tours: input.tours.filter(
      (tour) => tour.communityId === input.communityId && tour.status === 'published',
    ),
    updatedAt: timestamp,
    version: input.version,
  };
}

export function isOfflinePackStale(pack: OfflineCommunityPack, latestVersion: number): boolean {
  return pack.version < latestVersion || pack.status === 'stale';
}
