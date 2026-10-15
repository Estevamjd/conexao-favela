import { INITIAL_COMMUNITY, INITIAL_COMMUNITY_ID, INITIAL_POIS } from '@conexao-favela/shared';
import { describe, expect, it } from 'vitest';
import { findPoiForCommunity, findPoiSubArea, formatPoiCoordinates } from './poi-detail';

describe('poi detail helpers', () => {
  it('finds a POI only inside the active community', () => {
    expect(
      findPoiForCommunity(INITIAL_POIS, 'estacao-teleferico-alemao', INITIAL_COMMUNITY_ID)?.id,
    ).toBe('estacao-teleferico-alemao');
    expect(findPoiForCommunity(INITIAL_POIS, 'estacao-teleferico-alemao', 'other')).toBeUndefined();
  });

  it('resolves the POI subarea from the community document', () => {
    const poi = findPoiForCommunity(INITIAL_POIS, 'mirante-do-adeus', INITIAL_COMMUNITY_ID);

    if (!poi) {
      throw new Error('Expected seed POI to exist.');
    }

    expect(findPoiSubArea(INITIAL_COMMUNITY, poi)?.id).toBe('morro-adeus');
  });

  it('formats coordinates with stable precision', () => {
    const poi = findPoiForCommunity(INITIAL_POIS, 'mirante-do-alemao', INITIAL_COMMUNITY_ID);

    if (!poi) {
      throw new Error('Expected seed POI to exist.');
    }

    expect(formatPoiCoordinates(poi)).toBe('-22.85760, -43.27510');
  });
});
