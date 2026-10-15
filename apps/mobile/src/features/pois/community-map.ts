import type { Coordinates, PointOfInterest } from '@conexao-favela/shared';

export type CommunityMapRegion = {
  readonly latitude: number;
  readonly latitudeDelta: number;
  readonly longitude: number;
  readonly longitudeDelta: number;
};

export type CommunityMapProps = {
  readonly center: Coordinates;
  readonly getPoiLabel: (poi: PointOfInterest) => string;
  readonly onSelectPoi: (poiId: string) => void;
  readonly pois: readonly PointOfInterest[];
  readonly selectedPoiId?: string;
};

const MINIMUM_DELTA = 0.012;
const REGION_PADDING = 1.55;

export function buildCommunityMapRegion(
  center: Coordinates,
  pois: readonly Pick<PointOfInterest, 'coordinates'>[],
): CommunityMapRegion {
  if (pois.length === 0) {
    return {
      latitude: center.lat,
      latitudeDelta: MINIMUM_DELTA,
      longitude: center.lng,
      longitudeDelta: MINIMUM_DELTA,
    };
  }

  const latitudes = pois.map((poi) => poi.coordinates.lat);
  const longitudes = pois.map((poi) => poi.coordinates.lng);
  const minimumLatitude = Math.min(...latitudes);
  const maximumLatitude = Math.max(...latitudes);
  const minimumLongitude = Math.min(...longitudes);
  const maximumLongitude = Math.max(...longitudes);

  return {
    latitude: (minimumLatitude + maximumLatitude) / 2,
    latitudeDelta: Math.max((maximumLatitude - minimumLatitude) * REGION_PADDING, MINIMUM_DELTA),
    longitude: (minimumLongitude + maximumLongitude) / 2,
    longitudeDelta: Math.max((maximumLongitude - minimumLongitude) * REGION_PADDING, MINIMUM_DELTA),
  };
}

export function positionPoiInRegion(
  coordinates: Coordinates,
  region: CommunityMapRegion,
): { readonly leftPercent: number; readonly topPercent: number } {
  const longitudeStart = region.longitude - region.longitudeDelta / 2;
  const latitudeStart = region.latitude + region.latitudeDelta / 2;
  const leftPercent = ((coordinates.lng - longitudeStart) / region.longitudeDelta) * 100;
  const topPercent = ((latitudeStart - coordinates.lat) / region.latitudeDelta) * 100;

  return {
    leftPercent: Math.min(Math.max(leftPercent, 5), 95),
    topPercent: Math.min(Math.max(topPercent, 8), 92),
  };
}
