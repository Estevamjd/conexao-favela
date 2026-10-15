import {
  SUPPORTED_LANGUAGE_CODES,
  type AppNotification,
  type Booking,
  type BookingStatus,
  type DraftLocalizedText,
  type FirestoreTimestamp,
  type MarketplaceItem,
  type NotificationType,
  type PaymentCurrency,
  type PaymentGateway,
  type PaymentMethod,
  type PaymentStatus,
  type PointOfInterest,
  type PublicGuide,
  type SupportedLanguageCode,
  type Tour,
  type TourCategory,
  type TourDifficulty,
  type TourStatus,
} from '@conexao-favela/shared';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isFirestoreTimestampLike(value: unknown): value is {
  readonly nanoseconds: number;
  readonly seconds: number;
  readonly toDate: () => unknown;
} {
  return (
    isRecord(value) &&
    typeof value.toDate === 'function' &&
    typeof value.seconds === 'number' &&
    typeof value.nanoseconds === 'number'
  );
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function readTimestamp(value: unknown): FirestoreTimestamp | null {
  if (!isFirestoreTimestampLike(value)) {
    return null;
  }

  const date = value.toDate();

  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return null;
  }

  return {
    nanoseconds: value.nanoseconds,
    seconds: value.seconds,
    toDate: () => date,
  };
}

function readDraftLocalizedText(value: unknown): DraftLocalizedText | null {
  if (!isRecord(value)) {
    return null;
  }

  const entries = SUPPORTED_LANGUAGE_CODES.map(
    (code) => [code, readString(value[code])] as const,
  ).filter((entry): entry is readonly [SupportedLanguageCode, string] => entry[1] !== null);
  const localized = Object.fromEntries(entries) as Partial<Record<SupportedLanguageCode, string>>;

  return localized.pt ? ({ ...localized, pt: localized.pt } satisfies DraftLocalizedText) : null;
}

function readCoordinates(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const lat = readNumber(value.lat);
  const lng = readNumber(value.lng);

  return lat === null || lng === null ? null : { lat, lng };
}

function readTourCategory(value: unknown): TourCategory | null {
  return value === 'arte' ||
    value === 'cultural' ||
    value === 'fotografico' ||
    value === 'gastronomico' ||
    value === 'historico' ||
    value === 'natureza'
    ? value
    : null;
}

function readTourDifficulty(value: unknown): TourDifficulty | null {
  return value === 'easy' || value === 'moderate' || value === 'hard' ? value : null;
}

function readTourStatus(value: unknown): TourStatus | null {
  return value === 'archived' || value === 'draft' || value === 'paused' || value === 'published'
    ? value
    : null;
}

function readBookingStatus(value: unknown): BookingStatus | null {
  return value === 'cancelled' ||
    value === 'completed' ||
    value === 'confirmed' ||
    value === 'in_progress' ||
    value === 'no_show' ||
    value === 'pending'
    ? value
    : null;
}

function readNotificationType(value: unknown): NotificationType | null {
  return value === 'booking_cancelled' ||
    value === 'booking_confirmed' ||
    value === 'booking_created' ||
    value === 'new_review' ||
    value === 'promotion' ||
    value === 'system' ||
    value === 'tour_reminder'
    ? value
    : null;
}

function readPaymentCurrency(value: unknown): PaymentCurrency | null {
  return value === 'BRL' || value === 'USD' || value === 'EUR' ? value : null;
}

function readPaymentGateway(value: unknown): PaymentGateway | null {
  return value === 'demo' || value === 'mercado_pago' || value === 'stripe' ? value : null;
}

function readPaymentMethod(value: unknown): PaymentMethod | null {
  return value === 'boleto' || value === 'card' || value === 'checkout' || value === 'pix'
    ? value
    : null;
}

function readPaymentStatus(value: unknown): PaymentStatus | null {
  return value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'cancelled' ||
    value === 'refunded' ||
    value === 'chargeback' ||
    value === 'expired'
    ? value
    : null;
}

function readSupportedLanguageArray(value: unknown): readonly SupportedLanguageCode[] {
  return readStringArray(value).filter((item): item is SupportedLanguageCode =>
    SUPPORTED_LANGUAGE_CODES.some((code) => code === item),
  );
}

function readNotificationData(value: unknown): AppNotification['data'] {
  if (!isRecord(value)) {
    return undefined;
  }

  const data = Object.entries(value).reduce<Record<string, string | number | boolean>>(
    (accumulator, [key, item]) => {
      if (typeof item === 'string' || typeof item === 'number' || typeof item === 'boolean') {
        return {
          ...accumulator,
          [key]: item,
        };
      }

      return accumulator;
    },
    {},
  );

  return Object.keys(data).length > 0 ? data : undefined;
}

function readRoutePoints(value: unknown): Tour['route']['points'] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const points = value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const estimatedTime = readNumber(item.estimatedTime);
      const order = readNumber(item.order);
      const poiId = readString(item.poiId);

      if (!poiId || estimatedTime === null || order === null) {
        return null;
      }

      return { estimatedTime, order, poiId };
    })
    .filter((point): point is Tour['route']['points'][number] => point !== null);

  return points.length > 0 ? points : null;
}

function readPaymentPrices(value: unknown): Tour['paymentPrices'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return (['BRL', 'USD', 'EUR'] as const).reduce<Tour['paymentPrices']>((prices, currency) => {
    const entry = isRecord(value[currency]) ? value[currency] : null;
    const amountCents = readNumber(entry?.amountCents);

    if (amountCents === null || !Number.isInteger(amountCents) || amountCents < 0) {
      return prices;
    }

    return {
      ...prices,
      [currency]: {
        amountCents,
        currency,
      },
    };
  }, {});
}

function readTouristsInfo(value: unknown): Booking['touristsInfo'] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const tourists = value
    .map((item) => {
      if (!isRecord(item)) {
        return null;
      }

      const name = readString(item.name);
      const age = readNumber(item.age);
      const nationality = readString(item.nationality);

      if (!name) {
        return null;
      }

      return {
        ...(age !== null ? { age } : {}),
        name,
        ...(nationality ? { nationality } : {}),
      };
    })
    .filter((item): item is Booking['touristsInfo'][number] => item !== null);

  return tourists.length > 0 ? tourists : null;
}

export function mapFirestoreTour(id: string, data: Readonly<Record<string, unknown>>): Tour | null {
  const title = readDraftLocalizedText(data.title);
  const description = readDraftLocalizedText(data.description);
  const route = isRecord(data.route) ? data.route : null;
  const pricing = isRecord(data.pricing) ? data.pricing : null;
  const capacity = isRecord(data.capacity) ? data.capacity : null;
  const media = isRecord(data.media) ? data.media : null;
  const stats = isRecord(data.stats) ? data.stats : null;
  const schedule = isRecord(data.schedule) ? data.schedule : null;
  const routePoints = readRoutePoints(route?.points);
  const totalDistance = readNumber(route?.totalDistance);
  const estimatedDuration = readNumber(route?.estimatedDuration);
  const pricingType = pricing?.type;
  const minPrice = readNumber(pricing?.minPrice);
  const maxPrice = readNumber(pricing?.maxPrice);
  const minTourists = readNumber(capacity?.minTourists);
  const maxTourists = readNumber(capacity?.maxTourists);
  const category = readTourCategory(data.category);
  const difficulty = readTourDifficulty(data.difficulty);
  const status = readTourStatus(data.status);
  const guideId = readString(data.guideId);
  const communityId = readString(data.communityId);
  const subAreaIds = readStringArray(data.subAreaIds);
  const languages = readSupportedLanguageArray(data.languages);
  const coverImageUrl = readString(media?.coverImageUrl);
  const galleryUrls = readStringArray(media?.galleryUrls);
  const totalBookings = readNumber(stats?.totalBookings);
  const averageRating = readNumber(stats?.averageRating);
  const totalReviews = readNumber(stats?.totalReviews);

  if (
    !guideId ||
    !communityId ||
    subAreaIds.length === 0 ||
    !title ||
    !description ||
    !routePoints ||
    totalDistance === null ||
    estimatedDuration === null ||
    (pricingType !== 'fixed' && pricingType !== 'range' && pricingType !== 'free') ||
    minPrice === null ||
    maxPrice === null ||
    pricing?.currency !== 'BRL' ||
    minTourists === null ||
    maxTourists === null ||
    languages.length === 0 ||
    !category ||
    !difficulty ||
    !status
  ) {
    return null;
  }

  return {
    capacity: { maxTourists, minTourists },
    category,
    communityId,
    description,
    difficulty,
    guideId,
    id,
    languages,
    media: {
      coverImageUrl: coverImageUrl ?? '',
      galleryUrls,
      ...(readString(media?.videoUrl)
        ? { videoUrl: readString(media?.videoUrl) ?? undefined }
        : {}),
    },
    pricing: {
      currency: 'BRL',
      maxPrice,
      minPrice,
      type: pricingType,
    },
    paymentPrices: readPaymentPrices(data.paymentPrices),
    route: {
      estimatedDuration,
      points: routePoints,
      totalDistance,
    },
    schedule: {
      isRecurring: schedule?.isRecurring === true,
      ...(Array.isArray(schedule?.recurringDays)
        ? {
            recurringDays: schedule.recurringDays.filter(
              (item): item is number => typeof item === 'number',
            ),
          }
        : {}),
      ...(Array.isArray(schedule?.availableHours)
        ? { availableHours: readStringArray(schedule.availableHours) }
        : {}),
    },
    stats: {
      averageRating: averageRating ?? 0,
      totalBookings: totalBookings ?? 0,
      totalReviews: totalReviews ?? 0,
    },
    status,
    subAreaIds,
    title,
    ...(readTimestamp(data.createdAt)
      ? { createdAt: readTimestamp(data.createdAt) ?? undefined }
      : {}),
    ...(readTimestamp(data.updatedAt)
      ? { updatedAt: readTimestamp(data.updatedAt) ?? undefined }
      : {}),
  };
}

export function mapFirestorePublicGuide(
  id: string,
  data: Readonly<Record<string, unknown>>,
): PublicGuide | null {
  const displayName = readString(data.displayName);
  const communityId = readString(data.communityId);
  const subAreaIds = readStringArray(data.subAreaIds);
  const bio = readDraftLocalizedText(data.bio);
  const languagesSpoken = readSupportedLanguageArray(data.languagesSpoken);
  const yearsOfExperience = readNumber(data.yearsOfExperience);
  const rating = readNumber(data.rating);
  const totalReviews = readNumber(data.totalReviews);
  const totalToursCompleted = readNumber(data.totalToursCompleted);

  if (
    !displayName ||
    !communityId ||
    subAreaIds.length === 0 ||
    !bio ||
    languagesSpoken.length === 0 ||
    yearsOfExperience === null ||
    rating === null ||
    totalReviews === null ||
    totalToursCompleted === null ||
    typeof data.active !== 'boolean' ||
    typeof data.verified !== 'boolean'
  ) {
    return null;
  }

  return {
    active: data.active,
    bio,
    communityId,
    displayName,
    id,
    languagesSpoken,
    photoUrl: readString(data.photoUrl) ?? undefined,
    rating,
    subAreaIds,
    totalReviews,
    totalToursCompleted,
    verified: data.verified,
    verifiedAt: readTimestamp(data.verifiedAt) ?? undefined,
    yearsOfExperience,
  };
}

export function mapFirestoreBooking(
  id: string,
  data: Readonly<Record<string, unknown>>,
): Booking | null {
  const tourId = readString(data.tourId);
  const guideId = readString(data.guideId);
  const touristId = readString(data.touristId);
  const communityId = readString(data.communityId);
  const scheduledFor = readTimestamp(data.scheduledFor);
  const numberOfTourists = readNumber(data.numberOfTourists);
  const touristsInfo = readTouristsInfo(data.touristsInfo);
  const status = readBookingStatus(data.status);
  const pricing = isRecord(data.pricing) ? data.pricing : null;
  const pricePerPerson = readNumber(pricing?.pricePerPerson);
  const totalPrice = readNumber(pricing?.totalPrice);
  const meetingPoint = isRecord(data.meetingPoint) ? data.meetingPoint : null;
  const meetingPointName = readString(meetingPoint?.name);
  const meetingPointCoordinates = readCoordinates(meetingPoint);
  const meetingPointDescription = readDraftLocalizedText(meetingPoint?.description);
  const shareableLink = readString(data.shareableLink);
  const payment = isRecord(data.payment) ? data.payment : null;
  const paymentId = readString(payment?.paymentId);
  const paymentStatus = readPaymentStatus(payment?.status);
  const paymentGateway = readPaymentGateway(payment?.gateway);
  const paymentMethod = readPaymentMethod(payment?.method);
  const paymentCurrency = readPaymentCurrency(payment?.currency);

  if (
    !tourId ||
    !guideId ||
    !touristId ||
    !communityId ||
    !scheduledFor ||
    numberOfTourists === null ||
    !touristsInfo ||
    !status ||
    pricePerPerson === null ||
    totalPrice === null ||
    pricing?.currency !== 'BRL' ||
    !meetingPointName ||
    !meetingPointCoordinates ||
    !meetingPointDescription ||
    !shareableLink
  ) {
    return null;
  }

  const checkIn = isRecord(data.checkIn) ? data.checkIn : null;
  const checkOut = isRecord(data.checkOut) ? data.checkOut : null;
  const cancellation = isRecord(data.cancellation) ? data.cancellation : null;
  const checkedInAt = readTimestamp(checkIn?.checkedInAt);
  const checkInLocation = readCoordinates(checkIn?.location);
  const checkedOutAt = readTimestamp(checkOut?.checkedOutAt);
  const checkOutLocation = readCoordinates(checkOut?.location);
  const cancelledAt = readTimestamp(cancellation?.cancelledAt);
  const cancelledBy = cancellation?.cancelledBy;
  const cancellationReason = readString(cancellation?.reason);

  return {
    communityId,
    guideId,
    id,
    meetingPoint: {
      description: meetingPointDescription as PointOfInterest['description'],
      lat: meetingPointCoordinates.lat,
      lng: meetingPointCoordinates.lng,
      name: meetingPointName,
    },
    numberOfTourists,
    pricing: {
      currency: 'BRL',
      pricePerPerson,
      totalPrice,
    },
    ...(paymentId && paymentStatus && paymentGateway && paymentMethod && paymentCurrency
      ? {
          payment: {
            currency: paymentCurrency,
            gateway: paymentGateway,
            method: paymentMethod,
            paymentId,
            status: paymentStatus,
          },
        }
      : {}),
    scheduledFor,
    shareableLink,
    status,
    tourId,
    touristId,
    touristsInfo,
    ...(checkedInAt && checkInLocation
      ? { checkIn: { checkedInAt, location: checkInLocation } }
      : {}),
    ...(checkedOutAt && checkOutLocation
      ? { checkOut: { checkedOutAt, location: checkOutLocation } }
      : {}),
    ...(cancelledAt &&
    cancellationReason &&
    (cancelledBy === 'admin' || cancelledBy === 'guide' || cancelledBy === 'tourist')
      ? {
          cancellation: {
            cancelledAt,
            cancelledBy,
            reason: cancellationReason,
            refundIssued: cancellation?.refundIssued === true,
          },
        }
      : {}),
    ...(readTimestamp(data.createdAt)
      ? { createdAt: readTimestamp(data.createdAt) ?? undefined }
      : {}),
    ...(readTimestamp(data.updatedAt)
      ? { updatedAt: readTimestamp(data.updatedAt) ?? undefined }
      : {}),
  };
}

export function mapFirestoreNotification(
  id: string,
  data: Readonly<Record<string, unknown>>,
): AppNotification | null {
  const userId = readString(data.userId);
  const type = readNotificationType(data.type);
  const title = readDraftLocalizedText(data.title);
  const body = readDraftLocalizedText(data.body);
  const createdAt = readTimestamp(data.createdAt);
  const readAt = readTimestamp(data.readAt);

  if (!userId || !type || !title || !body || !createdAt || typeof data.read !== 'boolean') {
    return null;
  }

  return {
    body,
    createdAt,
    data: readNotificationData(data.data),
    id,
    read: data.read,
    ...(readAt ? { readAt } : {}),
    title,
    type,
    userId,
  };
}

export function mapFirestoreMarketplaceItem(
  id: string,
  data: Readonly<Record<string, unknown>>,
): MarketplaceItem | null {
  const communityId = readString(data.communityId);
  const providerId = readString(data.providerId);
  const title = readDraftLocalizedText(data.title);
  const description = readDraftLocalizedText(data.description);
  const priceLabel = readDraftLocalizedText(data.priceLabel);
  const createdAt = readTimestamp(data.createdAt);
  const updatedAt = readTimestamp(data.updatedAt);
  const category =
    data.category === 'accommodation' ||
    data.category === 'art' ||
    data.category === 'gastronomy' ||
    data.category === 'workshop'
      ? data.category
      : null;
  const imageKey =
    data.imageKey === 'art' || data.imageKey === 'food' || data.imageKey === 'tour'
      ? data.imageKey
      : null;
  const status =
    data.status === 'draft' || data.status === 'published' || data.status === 'paused'
      ? data.status
      : null;
  if (
    !communityId ||
    !providerId ||
    !title ||
    !description ||
    !priceLabel ||
    !createdAt ||
    !updatedAt ||
    !category ||
    !imageKey ||
    !status
  ) {
    return null;
  }
  return {
    category,
    communityId,
    createdAt,
    description,
    id,
    imageKey,
    priceLabel,
    providerId,
    status,
    title,
    updatedAt,
  };
}
