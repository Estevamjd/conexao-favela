import { describe, expect, it } from 'vitest';
import {
  TourCreationPlanError,
  buildTourCreationPlan,
  mapPoiForTourCreation,
  parseTourCreationRequest,
  type FunctionGuideForTourCreation,
  type FunctionPoiForTourCreation,
  type FunctionTourCreationRequestInput,
} from './tour-creation.js';

const verifiedGuideProfile: NonNullable<FunctionGuideForTourCreation['guideProfile']> = {
  communityId: 'alemao',
  languagesSpoken: ['pt', 'en'],
  subAreaIds: ['morro-alemao', 'morro-adeus'],
  verified: true,
};

const verifiedGuide: FunctionGuideForTourCreation = {
  guideProfile: verifiedGuideProfile,
  id: 'guide-1',
  type: 'guide',
};

const routePois: readonly FunctionPoiForTourCreation[] = [
  {
    communityId: 'alemao',
    id: 'poi-1',
    subAreaId: 'morro-alemao',
  },
  {
    communityId: 'alemao',
    id: 'poi-2',
    subAreaId: 'morro-adeus',
  },
];

const validRequest: FunctionTourCreationRequestInput = {
  category: 'historico',
  communityId: 'alemao',
  description: {
    en: 'Cable car memories with local context.',
    pt: 'Memorias do teleferico com contexto local.',
  },
  difficulty: 'easy',
  languages: ['pt', 'en'],
  maxPrice: 120,
  maxTourists: 8,
  minPrice: 80,
  poiIds: ['poi-1', 'poi-2'],
  subAreaIds: ['morro-alemao', 'morro-adeus'],
  title: {
    en: 'Cable car memories',
    pt: 'Memorias do teleferico',
  },
};

describe('tour creation function planning', () => {
  it('parses a strict payload without trusting guide, status, or pricing type fields', () => {
    expect(parseTourCreationRequest(validRequest)).toEqual(validRequest);
    expect(() =>
      parseTourCreationRequest({
        ...validRequest,
        guideId: 'client-controlled-guide',
      }),
    ).toThrow(TourCreationPlanError);
    expect(() =>
      parseTourCreationRequest({
        ...validRequest,
        status: 'published',
      }),
    ).toThrow(TourCreationPlanError);
    expect(() =>
      parseTourCreationRequest({
        ...validRequest,
        pricing: { type: 'free' },
      }),
    ).toThrow(TourCreationPlanError);
  });

  it('maps POI documents into route validation inputs', () => {
    expect(
      mapPoiForTourCreation('poi-1', {
        communityId: 'alemao',
        subAreaId: 'morro-alemao',
      }),
    ).toEqual({
      communityId: 'alemao',
      id: 'poi-1',
      subAreaId: 'morro-alemao',
    });
    expect(mapPoiForTourCreation('poi-bad', { communityId: 'alemao' })).toBeNull();
  });

  it('builds a published tour for a verified guide scoped to the selected community', () => {
    const plan = buildTourCreationPlan(validRequest, verifiedGuide, routePois, {
      createdAt: new Date('2026-06-02T12:00:00.000Z'),
      tourId: 'tour-1',
    });

    expect(plan.response).toEqual({
      guideId: 'guide-1',
      status: 'published',
      tourId: 'tour-1',
    });
    expect(plan.tour.guideId).toBe('guide-1');
    expect(plan.tour.communityId).toBe('alemao');
    expect(plan.tour.status).toBe('published');
    expect(plan.tour.pricing.type).toBe('range');
    expect(plan.tour.route.points).toEqual([
      { estimatedTime: 25, order: 1, poiId: 'poi-1' },
      { estimatedTime: 25, order: 2, poiId: 'poi-2' },
    ]);
  });

  it('rejects unverified guides and guide scope mismatches', () => {
    expect(() =>
      buildTourCreationPlan(
        validRequest,
        {
          ...verifiedGuide,
          guideProfile: {
            ...verifiedGuideProfile,
            verified: false,
          },
        },
        routePois,
        { tourId: 'tour-1' },
      ),
    ).toThrow(TourCreationPlanError);
    expect(() =>
      buildTourCreationPlan(
        {
          ...validRequest,
          languages: ['es'],
        },
        verifiedGuide,
        routePois,
        { tourId: 'tour-1' },
      ),
    ).toThrow(TourCreationPlanError);
  });

  it('rejects POIs outside the selected community or subareas', () => {
    expect(() =>
      buildTourCreationPlan(
        validRequest,
        verifiedGuide,
        [
          routePois[0],
          {
            communityId: 'mare',
            id: 'poi-2',
            subAreaId: 'subarea-mare',
          },
        ].filter((poi): poi is FunctionPoiForTourCreation => poi !== undefined),
        { tourId: 'tour-1' },
      ),
    ).toThrow(TourCreationPlanError);
    expect(() =>
      buildTourCreationPlan(
        {
          ...validRequest,
          poiIds: ['poi-1', 'missing-poi'],
        },
        verifiedGuide,
        routePois,
        { tourId: 'tour-1' },
      ),
    ).toThrow(TourCreationPlanError);
  });
});
