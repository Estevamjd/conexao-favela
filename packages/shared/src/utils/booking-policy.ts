import type { Booking } from '../types';

export type BookingCancellationActor = 'tourist' | 'guide' | 'admin';

export type BookingCancellationBlockReason =
  | 'already_finished'
  | 'not_self_service_status'
  | 'past_start'
  | 'inside_minimum_window';

export type BookingCancellationState = {
  readonly canCancel: boolean;
  readonly hoursUntilStart: number;
  readonly minimumHoursBeforeStart: number;
  readonly reason?: BookingCancellationBlockReason;
};

export type BookingCheckInBlockReason =
  | 'already_checked_in'
  | 'not_confirmed'
  | 'too_early'
  | 'too_late';

export type BookingCheckInState = {
  readonly canCheckIn: boolean;
  readonly closesHoursAfterStart: number;
  readonly hoursUntilStart: number;
  readonly opensHoursBeforeStart: number;
  readonly reason?: BookingCheckInBlockReason;
};

export const BOOKING_CANCELLATION_POLICY = {
  // Keep self-service windows in shared code so mobile UI and future Functions block the same cases.
  guideMinimumHoursBeforeStart: 0,
  touristMinimumHoursBeforeStart: 24,
} as const;

export const BOOKING_CHECK_IN_POLICY = {
  closesHoursAfterStart: 8,
  opensHoursBeforeStart: 2,
} as const;

const selfServiceCancellableStatuses = new Set<Booking['status']>(['pending', 'confirmed']);

function resolveMinimumHoursBeforeStart(actor: BookingCancellationActor) {
  if (actor === 'tourist') {
    return BOOKING_CANCELLATION_POLICY.touristMinimumHoursBeforeStart;
  }

  return BOOKING_CANCELLATION_POLICY.guideMinimumHoursBeforeStart;
}

export function getHoursUntilBookingStart(booking: Booking, now = new Date()) {
  const millisecondsUntilStart = booking.scheduledFor.toDate().getTime() - now.getTime();

  return millisecondsUntilStart / (1000 * 60 * 60);
}

export function getBookingCancellationState(
  booking: Booking,
  actor: BookingCancellationActor,
  now = new Date(),
): BookingCancellationState {
  const minimumHoursBeforeStart = resolveMinimumHoursBeforeStart(actor);
  const hoursUntilStart = getHoursUntilBookingStart(booking, now);

  if (booking.status === 'completed' || booking.status === 'cancelled') {
    return {
      canCancel: false,
      hoursUntilStart,
      minimumHoursBeforeStart,
      reason: 'already_finished',
    };
  }

  if (!selfServiceCancellableStatuses.has(booking.status)) {
    return {
      canCancel: false,
      hoursUntilStart,
      minimumHoursBeforeStart,
      reason: 'not_self_service_status',
    };
  }

  if (hoursUntilStart < 0) {
    return {
      canCancel: false,
      hoursUntilStart,
      minimumHoursBeforeStart,
      reason: 'past_start',
    };
  }

  if (hoursUntilStart < minimumHoursBeforeStart) {
    return {
      canCancel: false,
      hoursUntilStart,
      minimumHoursBeforeStart,
      reason: 'inside_minimum_window',
    };
  }

  return {
    canCancel: true,
    hoursUntilStart,
    minimumHoursBeforeStart,
  };
}

export function getBookingCheckInState(booking: Booking, now = new Date()): BookingCheckInState {
  const hoursUntilStart = getHoursUntilBookingStart(booking, now);
  const { closesHoursAfterStart, opensHoursBeforeStart } = BOOKING_CHECK_IN_POLICY;

  if (booking.checkIn) {
    return {
      canCheckIn: false,
      closesHoursAfterStart,
      hoursUntilStart,
      opensHoursBeforeStart,
      reason: 'already_checked_in',
    };
  }

  if (booking.status !== 'confirmed') {
    return {
      canCheckIn: false,
      closesHoursAfterStart,
      hoursUntilStart,
      opensHoursBeforeStart,
      reason: 'not_confirmed',
    };
  }

  if (hoursUntilStart > opensHoursBeforeStart) {
    return {
      canCheckIn: false,
      closesHoursAfterStart,
      hoursUntilStart,
      opensHoursBeforeStart,
      reason: 'too_early',
    };
  }

  if (hoursUntilStart < -closesHoursAfterStart) {
    return {
      canCheckIn: false,
      closesHoursAfterStart,
      hoursUntilStart,
      opensHoursBeforeStart,
      reason: 'too_late',
    };
  }

  return {
    canCheckIn: true,
    closesHoursAfterStart,
    hoursUntilStart,
    opensHoursBeforeStart,
  };
}
