import { describe, expect, it } from 'vitest';
import { buildCommunityMapRegion, positionPoiInRegion } from './community-map';

const center = { lat: -22.861, lng: -43.273 };

describe('community map geometry', () => {
  it('uses a stable minimum region when no POIs are visible', () => {
    expect(buildCommunityMapRegion(center, [])).toEqual({
      latitude: center.lat,
      latitudeDelta: 0.012,
      longitude: center.lng,
      longitudeDelta: 0.012,
    });
  });

  it('fits every visible POI without depending on a specific community', () => {
    const region = buildCommunityMapRegion(center, [
      { coordinates: { lat: -22.87, lng: -43.28 } },
      { coordinates: { lat: -22.85, lng: -43.26 } },
    ]);

    expect(region.latitude).toBeCloseTo(-22.86);
    expect(region.longitude).toBeCloseTo(-43.27);
    expect(region.latitudeDelta).toBeCloseTo(0.031);
    expect(region.longitudeDelta).toBeCloseTo(0.031);
  });

  it('projects POIs into bounded web map percentages', () => {
    const region = buildCommunityMapRegion(center, [
      { coordinates: { lat: -22.87, lng: -43.28 } },
      { coordinates: { lat: -22.85, lng: -43.26 } },
    ]);

    const centerPosition = positionPoiInRegion({ lat: -22.86, lng: -43.27 }, region);

    expect(centerPosition.leftPercent).toBeCloseTo(50);
    expect(centerPosition.topPercent).toBeCloseTo(50);
    expect(positionPoiInRegion({ lat: 90, lng: -180 }, region)).toEqual({
      leftPercent: 5,
      topPercent: 8,
    });
  });
});
