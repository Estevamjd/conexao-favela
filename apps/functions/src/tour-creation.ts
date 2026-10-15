const SUPPORTED_LANGUAGE_CODES = ['pt', 'en', 'es', 'fr', 'de', 'it', 'zh', 'ja'] as const;
const TOUR_CATEGORIES = [
  'arte',
  'cultural',
  'fotografico',
  'gastronomico',
  'historico',
  'natureza',
] as const;
const TOUR_DIFFICULTIES = ['easy', 'moderate', 'hard'] as const;

type FunctionSupportedLanguageCode = (typeof SUPPORTED_LANGUAGE_CODES)[number];
type FunctionTourCategory = (typeof TOUR_CATEGORIES)[number];
type FunctionTourDifficulty = (typeof TOUR_DIFFICULTIES)[number];
type FunctionLocalizedText = {
  readonly pt: string;
  readonly de?: string;
  readonly en?: string;
  readonly es?: string;
  readonly fr?: string;
  readonly it?: string;
  readonly ja?: string;
  readonly zh?: string;
};

export type FunctionTourCreationRequestInput = {
  readonly category: FunctionTourCategory;
  readonly communityId: string;
  readonly description: FunctionLocalizedText;
  readonly difficulty: FunctionTourDifficulty;
  readonly languages: readonly FunctionSupportedLanguageCode[];
  readonly maxPrice: number;
  readonly maxTourists: number;
  readonly minPrice: number;
  readonly poiIds: readonly string[];
  readonly subAreaIds: readonly string[];
  readonly title: FunctionLocalizedText;
};

export type FunctionGuideForTourCreation = {
  readonly guideProfile?: {
    readonly communityId: string;
    readonly languagesSpoken: readonly string[];
    readonly subAreaIds: readonly string[];
    readonly verified: boolean;
  };
  readonly id: string;
  readonly type: 'tourist' | 'guide' | 'admin';
};

export type FunctionPoiForTourCreation = {
  readonly communityId: string;
  readonly id: string;
  readonly subAreaId: string;
};

export type TourCreationPlan = {
  readonly response: {
    readonly guideId: string;
    readonly status: 'published';
    readonly tourId: string;
  };
  readonly tour: {
    readonly capacity: {
      readonly maxTourists: number;
      readonly minTourists: 1;
    };
    readonly category: FunctionTourCategory;
    readonly communityId: string;
    readonly createdAt: Date;
    readonly description: FunctionLocalizedText;
    readonly difficulty: FunctionTourDifficulty;
    readonly guideId: string;
    readonly id: string;
    readonly languages: readonly FunctionSupportedLanguageCode[];
    readonly media: {
      readonly coverImageUrl: string;
      readonly galleryUrls: readonly string[];
    };
    readonly pricing: {
      readonly currency: 'BRL';
      readonly maxPrice: number;
      readonly minPrice: number;
      readonly type: 'fixed' | 'free' | 'range';
    };
    readonly route: {
      readonly estimatedDuration: number;
      readonly points: readonly {
        readonly estimatedTime: number;
        readonly order: number;
        readonly poiId: string;
      }[];
      readonly totalDistance: number;
    };
    readonly schedule: {
      readonly isRecurring: false;
    };
    readonly stats: {
      readonly averageRating: 0;
      readonly totalBookings: 0;
      readonly totalReviews: 0;
    };
    readonly status: 'published';
    readonly subAreaIds: readonly string[];
    readonly title: FunctionLocalizedText;
    readonly updatedAt: Date;
  };
};

export class TourCreationPlanError extends Error {
  constructor(
    readonly code: 'invalid_payload' | 'invalid_guide' | 'invalid_route',
    message: string,
  ) {
    super(message);
    this.name = 'TourCreationPlanError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function hasDuplicates(values: readonly string[]): boolean {
  return new Set(values).size !== values.length;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(
  value: unknown,
  options: { readonly maxLength: number },
): readonly string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > options.maxLength) {
    return null;
  }

  const values = value.map(readString);

  return values.every((item): item is string => item !== null) && !hasDuplicates(values)
    ? values
    : null;
}

function isSupportedLanguageCode(value: string): value is FunctionSupportedLanguageCode {
  return SUPPORTED_LANGUAGE_CODES.some((code) => code === value);
}

function readSupportedLanguages(value: unknown): readonly FunctionSupportedLanguageCode[] | null {
  const values = readStringArray(value, { maxLength: SUPPORTED_LANGUAGE_CODES.length });

  if (!values) {
    return null;
  }

  return values.every(isSupportedLanguageCode) ? values : null;
}

function readLocalizedText(value: unknown): FunctionLocalizedText | null {
  if (!isRecord(value)) {
    return null;
  }

  const keys = Object.keys(value);

  if (!keys.every((key) => isSupportedLanguageCode(key))) {
    return null;
  }

  const pt = readString(value.pt);

  if (!pt || pt.length > 1400) {
    return null;
  }

  const localizedEntries = SUPPORTED_LANGUAGE_CODES.flatMap((code) => {
    const text = readString(value[code]);

    if (!text || text.length > 1400) {
      return [];
    }

    return [[code, text] as const];
  });

  return {
    ...Object.fromEntries(localizedEntries),
    pt,
  };
}

function readCategory(value: unknown): FunctionTourCategory | null {
  return typeof value === 'string' && TOUR_CATEGORIES.includes(value as FunctionTourCategory)
    ? (value as FunctionTourCategory)
    : null;
}

function readDifficulty(value: unknown): FunctionTourDifficulty | null {
  return typeof value === 'string' && TOUR_DIFFICULTIES.includes(value as FunctionTourDifficulty)
    ? (value as FunctionTourDifficulty)
    : null;
}

function resolvePricingType(
  input: FunctionTourCreationRequestInput,
): TourCreationPlan['tour']['pricing']['type'] {
  if (input.minPrice === 0 && input.maxPrice === 0) {
    return 'free';
  }

  return input.minPrice === input.maxPrice ? 'fixed' : 'range';
}

function includesAll(
  availableValues: readonly string[],
  requestedValues: readonly string[],
): boolean {
  return requestedValues.every((value) => availableValues.includes(value));
}

export function parseTourCreationRequest(data: unknown): FunctionTourCreationRequestInput {
  if (!isRecord(data)) {
    throw new TourCreationPlanError('invalid_payload', 'Tour payload is required.');
  }

  const allowedKeys = [
    'category',
    'communityId',
    'description',
    'difficulty',
    'languages',
    'maxPrice',
    'maxTourists',
    'minPrice',
    'poiIds',
    'subAreaIds',
    'title',
  ];

  if (Object.keys(data).some((key) => !allowedKeys.includes(key))) {
    throw new TourCreationPlanError('invalid_payload', 'Invalid tour payload.');
  }

  const category = readCategory(data.category);
  const communityId = readString(data.communityId);
  const description = readLocalizedText(data.description);
  const difficulty = readDifficulty(data.difficulty);
  const languages = readSupportedLanguages(data.languages);
  const maxPrice = readNumber(data.maxPrice);
  const maxTourists = readNumber(data.maxTourists);
  const minPrice = readNumber(data.minPrice);
  const poiIds = readStringArray(data.poiIds, { maxLength: 24 });
  const subAreaIds = readStringArray(data.subAreaIds, { maxLength: 12 });
  const title = readLocalizedText(data.title);

  if (
    !category ||
    !communityId ||
    !description ||
    !difficulty ||
    !languages ||
    maxPrice === null ||
    maxTourists === null ||
    minPrice === null ||
    !poiIds ||
    !subAreaIds ||
    !title
  ) {
    throw new TourCreationPlanError('invalid_payload', 'Tour fields are invalid.');
  }

  if (
    minPrice < 0 ||
    maxPrice < minPrice ||
    maxPrice > 50_000 ||
    !Number.isInteger(maxTourists) ||
    maxTourists < 1 ||
    maxTourists > 30
  ) {
    throw new TourCreationPlanError('invalid_payload', 'Tour pricing or capacity is invalid.');
  }

  return {
    category,
    communityId,
    description,
    difficulty,
    languages,
    maxPrice,
    maxTourists,
    minPrice,
    poiIds,
    subAreaIds,
    title,
  };
}

export function mapPoiForTourCreation(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionPoiForTourCreation | null {
  const communityId = readString(data.communityId);
  const subAreaId = readString(data.subAreaId);

  if (!communityId || !subAreaId) {
    return null;
  }

  return {
    communityId,
    id,
    subAreaId,
  };
}

export function buildTourCreationPlan(
  input: FunctionTourCreationRequestInput,
  guide: FunctionGuideForTourCreation,
  pois: readonly FunctionPoiForTourCreation[],
  options: {
    readonly createdAt?: Date;
    readonly estimatedTimePerStop?: number;
    readonly tourId: string;
  },
): TourCreationPlan {
  const guideProfile = guide.guideProfile;

  if (
    guide.type !== 'guide' ||
    !guideProfile?.verified ||
    guideProfile.communityId !== input.communityId ||
    !includesAll(guideProfile.subAreaIds, input.subAreaIds) ||
    !includesAll(guideProfile.languagesSpoken, input.languages)
  ) {
    throw new TourCreationPlanError(
      'invalid_guide',
      'Only verified guides can publish tours for their approved community, subareas, and languages.',
    );
  }

  const poiById = new Map(pois.map((poi) => [poi.id, poi]));
  const orderedPois = input.poiIds.map((poiId) => poiById.get(poiId));

  if (
    orderedPois.some((poi) => !poi) ||
    orderedPois.some(
      (poi) => poi?.communityId !== input.communityId || !input.subAreaIds.includes(poi.subAreaId),
    )
  ) {
    throw new TourCreationPlanError(
      'invalid_route',
      'Tour route must use POIs from the selected community and subareas.',
    );
  }

  const createdAt = options.createdAt ?? new Date();
  const estimatedTimePerStop = options.estimatedTimePerStop ?? 25;

  return {
    response: {
      guideId: guide.id,
      status: 'published',
      tourId: options.tourId,
    },
    tour: {
      capacity: {
        maxTourists: input.maxTourists,
        minTourists: 1,
      },
      category: input.category,
      communityId: input.communityId,
      createdAt,
      description: input.description,
      difficulty: input.difficulty,
      guideId: guide.id,
      id: options.tourId,
      languages: input.languages,
      media: {
        coverImageUrl: `dev://tours/${options.tourId}/cover.jpg`,
        galleryUrls: [],
      },
      pricing: {
        currency: 'BRL',
        maxPrice: input.maxPrice,
        minPrice: input.minPrice,
        type: resolvePricingType(input),
      },
      route: {
        estimatedDuration: input.poiIds.length * estimatedTimePerStop,
        points: input.poiIds.map((poiId, index) => ({
          estimatedTime: estimatedTimePerStop,
          order: index + 1,
          poiId,
        })),
        totalDistance: Math.max(input.poiIds.length - 1, 1) * 700,
      },
      schedule: {
        isRecurring: false,
      },
      stats: {
        averageRating: 0,
        totalBookings: 0,
        totalReviews: 0,
      },
      status: 'published',
      subAreaIds: input.subAreaIds,
      title: input.title,
      updatedAt: createdAt,
    },
  };
}
