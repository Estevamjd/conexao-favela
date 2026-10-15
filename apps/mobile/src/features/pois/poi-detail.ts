import type { Community, CommunitySubArea, PointOfInterest } from '@conexao-favela/shared';

export function findPoiForCommunity(
  pois: readonly PointOfInterest[],
  poiId: string | undefined,
  communityId: string,
): PointOfInterest | undefined {
  if (!poiId) {
    return undefined;
  }

  return pois.find((poi) => poi.id === poiId && poi.communityId === communityId);
}

export function findPoiSubArea(
  community: Pick<Community, 'subAreas'>,
  poi: Pick<PointOfInterest, 'subAreaId'>,
): CommunitySubArea | undefined {
  return community.subAreas.find((subArea) => subArea.id === poi.subAreaId);
}

export function formatPoiCoordinates(poi: Pick<PointOfInterest, 'coordinates'>): string {
  return `${poi.coordinates.lat.toFixed(5)}, ${poi.coordinates.lng.toFixed(5)}`;
}
