import {
  getBookingCancellationState,
  getBookingCheckInState,
  type Booking,
} from '@conexao-favela/shared';

type GuideBookingScope = {
  readonly bookings: readonly Booking[];
  readonly communityId: string;
  readonly guideId: string;
};

export type GuideBookingActionState = {
  readonly canCancel: boolean;
  readonly canCheckIn: boolean;
  readonly canCheckOut: boolean;
  readonly canConfirm: boolean;
};

export function getGuideBookings({
  bookings,
  communityId,
  guideId,
}: GuideBookingScope): readonly Booking[] {
  return bookings
    .filter((booking) => booking.communityId === communityId && booking.guideId === guideId)
    .sort((first, second) => first.scheduledFor.seconds - second.scheduledFor.seconds);
}

export function findGuideBookingById(
  scope: GuideBookingScope & { readonly bookingId: string | undefined },
): Booking | undefined {
  if (!scope.bookingId) {
    return undefined;
  }

  // The detail screen uses the same scoped selector as the list so a guide cannot
  // open another guide's booking by typing a URL in the web shell.
  return getGuideBookings(scope).find((booking) => booking.id === scope.bookingId);
}

export function getGuideBookingActionState(booking: Booking): GuideBookingActionState {
  return {
    canCancel: getBookingCancellationState(booking, 'guide').canCancel,
    canCheckIn: getBookingCheckInState(booking).canCheckIn,
    canCheckOut: booking.status === 'in_progress' && Boolean(booking.checkIn) && !booking.checkOut,
    canConfirm: booking.status === 'pending',
  };
}
