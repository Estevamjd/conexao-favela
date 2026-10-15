export type FunctionBookingRequestInput = {
  readonly communityId: string;
  readonly numberOfTourists: number;
  readonly scheduledForIso: string;
  readonly tourId: string;
  readonly touristsInfo: readonly {
    readonly age?: number;
    readonly name: string;
    readonly nationality?: string;
  }[];
};

export type FunctionTourForBooking = {
  readonly capacity: {
    readonly maxTourists: number;
    readonly minTourists: number;
  };
  readonly communityId: string;
  readonly guideId: string;
  readonly id: string;
  readonly pricing: {
    readonly currency: 'BRL';
    readonly maxPrice: number;
    readonly minPrice: number;
    readonly type: 'fixed' | 'range' | 'free';
  };
  readonly route: {
    readonly points: readonly {
      readonly estimatedTime: number;
      readonly order: number;
      readonly poiId: string;
    }[];
  };
  readonly status: 'draft' | 'published' | 'paused' | 'archived';
};

export type FunctionPoiForBooking = {
  readonly coordinates: {
    readonly lat: number;
    readonly lng: number;
  };
  readonly description: Readonly<Record<string, string>>;
  readonly id: string;
  readonly name: Readonly<Record<string, string>>;
};

export type BookingCreationPlan = {
  readonly booking: {
    readonly communityId: string;
    readonly createdAt: Date;
    readonly guideId: string;
    readonly id: string;
    readonly meetingPoint: {
      readonly description: Readonly<Record<string, string>>;
      readonly lat: number;
      readonly lng: number;
      readonly name: string;
    };
    readonly numberOfTourists: number;
    readonly pricing: {
      readonly currency: 'BRL';
      readonly pricePerPerson: number;
      readonly totalPrice: number;
    };
    readonly scheduledFor: Date;
    readonly shareableLink: string;
    readonly status: 'pending';
    readonly tourId: string;
    readonly touristId: string;
    readonly touristsInfo: FunctionBookingRequestInput['touristsInfo'];
    readonly updatedAt: Date;
  };
  readonly response: {
    readonly bookingId: string;
    readonly guideId: string;
    readonly scheduledForIso: string;
    readonly status: 'pending';
    readonly totalPrice: number;
  };
};

export class BookingCreationPlanError extends Error {
  constructor(
    readonly code: 'invalid_payload' | 'invalid_tour' | 'invalid_capacity' | 'invalid_schedule',
    message: string,
  ) {
    super(message);
    this.name = 'BookingCreationPlanError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readTouristInfo(value: unknown): FunctionBookingRequestInput['touristsInfo'] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) {
    return null;
  }

  const tourists = value.map((item) => {
    if (!isRecord(item)) {
      return null;
    }

    const name = readString(item.name);

    if (!name || name.length < 2 || name.length > 80) {
      return null;
    }

    const age = readNumber(item.age);
    const nationality = readString(item.nationality);

    return {
      ...(age !== null ? { age } : {}),
      name,
      ...(nationality !== null ? { nationality } : {}),
    };
  });

  return tourists.every((tourist): tourist is NonNullable<typeof tourist> => tourist !== null)
    ? tourists
    : null;
}

export function parseBookingCreationRequest(data: unknown): FunctionBookingRequestInput {
  if (!isRecord(data)) {
    throw new BookingCreationPlanError('invalid_payload', 'Booking payload is required.');
  }

  const keys = Object.keys(data);
  const allowedKeys = [
    'communityId',
    'numberOfTourists',
    'scheduledForIso',
    'tourId',
    'touristsInfo',
  ];

  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new BookingCreationPlanError('invalid_payload', 'Invalid booking payload.');
  }

  const communityId = readString(data.communityId);
  const tourId = readString(data.tourId);
  const numberOfTourists = readNumber(data.numberOfTourists);
  const scheduledForIso = readString(data.scheduledForIso);
  const touristsInfo = readTouristInfo(data.touristsInfo);

  if (!communityId || !tourId || !scheduledForIso || !touristsInfo) {
    throw new BookingCreationPlanError('invalid_payload', 'Booking fields are invalid.');
  }

  if (
    numberOfTourists === null ||
    !Number.isInteger(numberOfTourists) ||
    numberOfTourists < 1 ||
    numberOfTourists > 30
  ) {
    throw new BookingCreationPlanError('invalid_payload', 'Invalid booking capacity.');
  }

  if (touristsInfo.length !== numberOfTourists) {
    throw new BookingCreationPlanError('invalid_payload', 'Tourist details must match capacity.');
  }

  const scheduledFor = new Date(scheduledForIso);

  if (!Number.isFinite(scheduledFor.getTime())) {
    throw new BookingCreationPlanError('invalid_schedule', 'Invalid booking date.');
  }

  return {
    communityId,
    numberOfTourists,
    scheduledForIso,
    tourId,
    touristsInfo,
  };
}

export function mapTourForBooking(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionTourForBooking | null {
  const capacity = isRecord(data.capacity) ? data.capacity : null;
  const pricing = isRecord(data.pricing) ? data.pricing : null;
  const route = isRecord(data.route) ? data.route : null;
  const points = Array.isArray(route?.points) ? route.points : [];
  const mappedPoints = points
    .map((point) => {
      if (!isRecord(point)) {
        return null;
      }

      const poiId = readString(point.poiId);
      const order = readNumber(point.order);
      const estimatedTime = readNumber(point.estimatedTime);

      if (
        !poiId ||
        order === null ||
        estimatedTime === null ||
        !Number.isInteger(order) ||
        !Number.isInteger(estimatedTime)
      ) {
        return null;
      }

      return { estimatedTime, order, poiId };
    })
    .filter((point): point is NonNullable<typeof point> => point !== null);
  const communityId = readString(data.communityId);
  const guideId = readString(data.guideId);
  const minTourists = readNumber(capacity?.minTourists);
  const maxTourists = readNumber(capacity?.maxTourists);
  const minPrice = readNumber(pricing?.minPrice);
  const maxPrice = readNumber(pricing?.maxPrice);
  const pricingType = pricing?.type;
  const status = data.status;

  if (
    !communityId ||
    !guideId ||
    minTourists === null ||
    maxTourists === null ||
    !Number.isInteger(minTourists) ||
    !Number.isInteger(maxTourists) ||
    minPrice === null ||
    maxPrice === null ||
    (pricingType !== 'fixed' && pricingType !== 'range' && pricingType !== 'free') ||
    pricing?.currency !== 'BRL' ||
    (status !== 'draft' &&
      status !== 'published' &&
      status !== 'paused' &&
      status !== 'archived') ||
    mappedPoints.length === 0
  ) {
    return null;
  }

  return {
    capacity: {
      maxTourists,
      minTourists,
    },
    communityId,
    guideId,
    id,
    pricing: {
      currency: 'BRL',
      maxPrice,
      minPrice,
      type: pricingType,
    },
    route: {
      points: mappedPoints,
    },
    status,
  };
}

export function mapPoiForBooking(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionPoiForBooking | null {
  const coordinates = isRecord(data.coordinates) ? data.coordinates : null;
  const name = isRecord(data.name) ? data.name : null;
  const description = isRecord(data.description) ? data.description : null;
  const lat = readNumber(coordinates?.lat);
  const lng = readNumber(coordinates?.lng);

  if (lat === null || lng === null || !name || !description) {
    return null;
  }

  return {
    coordinates: { lat, lng },
    description: Object.fromEntries(
      Object.entries(description).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
    id,
    name: Object.fromEntries(
      Object.entries(name).filter(
        (entry): entry is [string, string] => typeof entry[1] === 'string',
      ),
    ),
  };
}

export function buildBookingCreationPlan(
  input: FunctionBookingRequestInput,
  tour: FunctionTourForBooking,
  meetingPoint: FunctionPoiForBooking,
  options: {
    readonly bookingId: string;
    readonly createdAt?: Date;
    readonly shareableBaseUrl?: string;
    readonly touristId: string;
  },
): BookingCreationPlan {
  if (tour.status !== 'published' || tour.communityId !== input.communityId) {
    throw new BookingCreationPlanError('invalid_tour', 'Tour is not available for booking.');
  }

  if (
    input.numberOfTourists < tour.capacity.minTourists ||
    input.numberOfTourists > tour.capacity.maxTourists
  ) {
    throw new BookingCreationPlanError(
      'invalid_capacity',
      'Booking capacity is outside tour limits.',
    );
  }

  const scheduledFor = new Date(input.scheduledForIso);

  if (!Number.isFinite(scheduledFor.getTime())) {
    throw new BookingCreationPlanError('invalid_schedule', 'Invalid booking date.');
  }

  const createdAt = options.createdAt ?? new Date();
  const pricePerPerson = tour.pricing.type === 'free' ? 0 : tour.pricing.minPrice;
  const totalPrice = pricePerPerson * input.numberOfTourists;

  return {
    booking: {
      communityId: tour.communityId,
      createdAt,
      guideId: tour.guideId,
      id: options.bookingId,
      meetingPoint: {
        description: meetingPoint.description,
        lat: meetingPoint.coordinates.lat,
        lng: meetingPoint.coordinates.lng,
        name: meetingPoint.name.pt ?? Object.values(meetingPoint.name)[0] ?? 'Ponto de encontro',
      },
      numberOfTourists: input.numberOfTourists,
      pricing: {
        currency: 'BRL',
        pricePerPerson,
        totalPrice,
      },
      scheduledFor,
      shareableLink: `${options.shareableBaseUrl ?? 'https://conexaofavela.app/bookings'}/${options.bookingId}`,
      status: 'pending',
      tourId: tour.id,
      touristId: options.touristId,
      touristsInfo: input.touristsInfo,
      updatedAt: createdAt,
    },
    response: {
      bookingId: options.bookingId,
      guideId: tour.guideId,
      scheduledForIso: scheduledFor.toISOString(),
      status: 'pending',
      totalPrice,
    },
  };
}
