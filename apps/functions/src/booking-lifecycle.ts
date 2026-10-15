export type BookingLifecycleAction = 'cancel' | 'check_in' | 'check_out' | 'confirm';

export type BookingLifecycleActor = 'admin' | 'guide' | 'tourist';

export type FunctionBookingStatus =
  | 'cancelled'
  | 'completed'
  | 'confirmed'
  | 'in_progress'
  | 'no_show'
  | 'pending';

export type FunctionCoordinates = {
  readonly lat: number;
  readonly lng: number;
};

export type FunctionBookingForLifecycle = {
  readonly cancellation?: {
    readonly cancelledAt: Date;
    readonly cancelledBy: BookingLifecycleActor;
    readonly reason: string;
    readonly refundIssued: boolean;
  };
  readonly checkIn?: {
    readonly checkedInAt: Date;
    readonly location: FunctionCoordinates;
  };
  readonly checkOut?: {
    readonly checkedOutAt: Date;
    readonly location: FunctionCoordinates;
  };
  readonly communityId: string;
  readonly guideId: string;
  readonly id: string;
  readonly meetingPoint: FunctionCoordinates;
  readonly scheduledFor: Date;
  readonly status: FunctionBookingStatus;
  readonly touristId: string;
  readonly tourId: string;
};

export type BookingLifecycleRequestInput = {
  readonly action: BookingLifecycleAction;
  readonly bookingId: string;
  readonly location?: FunctionCoordinates;
  readonly reason?: string;
};

export type BookingLifecyclePatch = {
  readonly cancellation?: {
    readonly cancelledAt: Date;
    readonly cancelledBy: BookingLifecycleActor;
    readonly reason: string;
    readonly refundIssued: boolean;
  };
  readonly checkIn?: {
    readonly checkedInAt: Date;
    readonly location: FunctionCoordinates;
  };
  readonly checkOut?: {
    readonly checkedOutAt: Date;
    readonly location: FunctionCoordinates;
  };
  readonly status: FunctionBookingStatus;
  readonly updatedAt: Date;
};

export type BookingLifecyclePlan = {
  readonly patch: BookingLifecyclePatch;
  readonly response: {
    readonly action: BookingLifecycleAction;
    readonly bookingId: string;
    readonly status: FunctionBookingStatus;
    readonly updatedAtIso: string;
  };
};

export class BookingLifecyclePlanError extends Error {
  constructor(
    readonly code:
      | 'invalid_booking'
      | 'invalid_payload'
      | 'invalid_transition'
      | 'permission_denied',
    message: string,
  ) {
    super(message);
    this.name = 'BookingLifecyclePlanError';
  }
}

const cancellableStatuses = new Set<FunctionBookingStatus>(['confirmed', 'pending']);

const BOOKING_CANCELLATION_POLICY = {
  guideMinimumHoursBeforeStart: 0,
  touristMinimumHoursBeforeStart: 24,
} as const;

const BOOKING_CHECK_IN_POLICY = {
  closesHoursAfterStart: 8,
  opensHoursBeforeStart: 2,
} as const;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isTimestampLike(value: unknown): value is { readonly toDate: () => unknown } {
  return isRecord(value) && typeof value.toDate === 'function';
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (isTimestampLike(value)) {
    const date = value.toDate();

    return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
  }

  return null;
}

function readCoordinates(value: unknown): FunctionCoordinates | null {
  if (!isRecord(value)) {
    return null;
  }

  const lat = readNumber(value.lat);
  const lng = readNumber(value.lng);

  if (lat === null || lng === null || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return null;
  }

  return { lat, lng };
}

function readStatus(value: unknown): FunctionBookingStatus | null {
  if (
    value === 'cancelled' ||
    value === 'completed' ||
    value === 'confirmed' ||
    value === 'in_progress' ||
    value === 'no_show' ||
    value === 'pending'
  ) {
    return value;
  }

  return null;
}

function readCheckIn(value: unknown): FunctionBookingForLifecycle['checkIn'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const checkedInAt = readDate(value.checkedInAt);
  const location = readCoordinates(value.location);

  return checkedInAt && location ? { checkedInAt, location } : undefined;
}

function readCheckOut(value: unknown): FunctionBookingForLifecycle['checkOut'] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const checkedOutAt = readDate(value.checkedOutAt);
  const location = readCoordinates(value.location);

  return checkedOutAt && location ? { checkedOutAt, location } : undefined;
}

function minimumCancellationHours(actor: BookingLifecycleActor) {
  return actor === 'tourist'
    ? BOOKING_CANCELLATION_POLICY.touristMinimumHoursBeforeStart
    : BOOKING_CANCELLATION_POLICY.guideMinimumHoursBeforeStart;
}

function hoursUntilStart(booking: FunctionBookingForLifecycle, now: Date) {
  return (booking.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function responseFor(
  input: BookingLifecycleRequestInput,
  patch: BookingLifecyclePatch,
): BookingLifecyclePlan {
  return {
    patch,
    response: {
      action: input.action,
      bookingId: input.bookingId,
      status: patch.status,
      updatedAtIso: patch.updatedAt.toISOString(),
    },
  };
}

export function parseBookingLifecycleRequest(data: unknown): BookingLifecycleRequestInput {
  if (!isRecord(data)) {
    throw new BookingLifecyclePlanError(
      'invalid_payload',
      'Booking lifecycle payload is required.',
    );
  }

  const keys = Object.keys(data);
  const allowedKeys = ['action', 'bookingId', 'location', 'reason'];

  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new BookingLifecyclePlanError('invalid_payload', 'Invalid booking lifecycle payload.');
  }

  const bookingId = readString(data.bookingId);
  const action = data.action;
  const reason = readString(data.reason) ?? undefined;
  const location = readCoordinates(data.location) ?? undefined;

  if (
    !bookingId ||
    (action !== 'cancel' && action !== 'check_in' && action !== 'check_out' && action !== 'confirm')
  ) {
    throw new BookingLifecyclePlanError('invalid_payload', 'Booking lifecycle fields are invalid.');
  }

  if (action === 'cancel' && (!reason || reason.length < 3 || reason.length > 280)) {
    throw new BookingLifecyclePlanError('invalid_payload', 'Cancellation reason is required.');
  }

  return {
    action,
    bookingId,
    ...(location ? { location } : {}),
    ...(reason ? { reason } : {}),
  };
}

export function mapBookingForLifecycle(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionBookingForLifecycle | null {
  const guideId = readString(data.guideId);
  const touristId = readString(data.touristId);
  const tourId = readString(data.tourId);
  const communityId = readString(data.communityId);
  const status = readStatus(data.status);
  const scheduledFor = readDate(data.scheduledFor);
  const meetingPointRecord = isRecord(data.meetingPoint) ? data.meetingPoint : null;
  const meetingPoint = readCoordinates(meetingPointRecord);

  if (
    !guideId ||
    !touristId ||
    !tourId ||
    !communityId ||
    !status ||
    !scheduledFor ||
    !meetingPoint
  ) {
    return null;
  }

  return {
    communityId,
    guideId,
    id,
    meetingPoint,
    scheduledFor,
    status,
    touristId,
    tourId,
    ...(readCheckIn(data.checkIn) ? { checkIn: readCheckIn(data.checkIn) } : {}),
    ...(readCheckOut(data.checkOut) ? { checkOut: readCheckOut(data.checkOut) } : {}),
  };
}

export function resolveBookingLifecycleActor(
  booking: FunctionBookingForLifecycle,
  uid: string,
  isAdmin: boolean,
): BookingLifecycleActor | null {
  if (isAdmin) {
    return 'admin';
  }

  if (booking.guideId === uid) {
    return 'guide';
  }

  if (booking.touristId === uid) {
    return 'tourist';
  }

  return null;
}

export function buildBookingLifecyclePlan(
  input: BookingLifecycleRequestInput,
  booking: FunctionBookingForLifecycle,
  options: {
    readonly actor: BookingLifecycleActor;
    readonly now?: Date;
  },
): BookingLifecyclePlan {
  if (booking.id !== input.bookingId) {
    throw new BookingLifecyclePlanError('invalid_booking', 'Booking id mismatch.');
  }

  const now = options.now ?? new Date();

  if (input.action === 'confirm') {
    if (options.actor === 'tourist') {
      throw new BookingLifecyclePlanError('permission_denied', 'Only guides can confirm bookings.');
    }

    if (booking.status !== 'pending') {
      throw new BookingLifecyclePlanError('invalid_transition', 'Booking cannot be confirmed.');
    }

    return responseFor(input, {
      status: 'confirmed',
      updatedAt: now,
    });
  }

  if (input.action === 'cancel') {
    const minimumHoursBeforeStart = minimumCancellationHours(options.actor);

    if (!cancellableStatuses.has(booking.status)) {
      throw new BookingLifecyclePlanError('invalid_transition', 'Booking cannot be cancelled.');
    }

    if (hoursUntilStart(booking, now) < minimumHoursBeforeStart) {
      throw new BookingLifecyclePlanError('invalid_transition', 'Cancellation window is closed.');
    }

    return responseFor(input, {
      cancellation: {
        cancelledAt: now,
        cancelledBy: options.actor,
        reason: input.reason ?? 'Cancelled by participant',
        refundIssued: false,
      },
      status: 'cancelled',
      updatedAt: now,
    });
  }

  if (input.action === 'check_in') {
    const hours = hoursUntilStart(booking, now);

    if (booking.checkIn) {
      throw new BookingLifecyclePlanError('invalid_transition', 'Booking already has check-in.');
    }

    if (booking.status !== 'confirmed') {
      throw new BookingLifecyclePlanError('invalid_transition', 'Booking must be confirmed first.');
    }

    if (
      hours > BOOKING_CHECK_IN_POLICY.opensHoursBeforeStart ||
      hours < -BOOKING_CHECK_IN_POLICY.closesHoursAfterStart
    ) {
      throw new BookingLifecyclePlanError('invalid_transition', 'Check-in window is closed.');
    }

    return responseFor(input, {
      checkIn: {
        checkedInAt: now,
        location: input.location ?? booking.meetingPoint,
      },
      status: 'in_progress',
      updatedAt: now,
    });
  }

  if (booking.status !== 'in_progress' || !booking.checkIn || booking.checkOut) {
    throw new BookingLifecyclePlanError('invalid_transition', 'Booking cannot be checked out.');
  }

  return responseFor(input, {
    checkOut: {
      checkedOutAt: now,
      location: input.location ?? booking.meetingPoint,
    },
    status: 'completed',
    updatedAt: now,
  });
}
