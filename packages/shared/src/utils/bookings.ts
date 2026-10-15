import type { BookingRequestInput } from '../schemas/domain';
import type { Booking, Coordinates, PointOfInterest, Tour } from '../types';
import { getBookingCancellationState, getBookingCheckInState } from './booking-policy';
import { timestampFromDate } from './timestamps';

type BuildBookingFromRequestOptions = {
  readonly id: string;
  readonly meetingPoint: PointOfInterest;
  readonly shareableBaseUrl?: string;
};

function timestampFromIso(iso: string) {
  return timestampFromDate(new Date(iso));
}

export function buildBookingFromRequest(
  input: BookingRequestInput,
  tour: Tour,
  options: BuildBookingFromRequestOptions,
): Booking {
  const pricePerPerson = tour.pricing.type === 'free' ? 0 : tour.pricing.minPrice;

  return {
    id: options.id,
    tourId: input.tourId,
    guideId: input.guideId,
    touristId: input.touristId,
    communityId: input.communityId,
    scheduledFor: timestampFromIso(input.scheduledForIso),
    numberOfTourists: input.numberOfTourists,
    touristsInfo: input.touristsInfo,
    status: 'pending',
    pricing: {
      pricePerPerson,
      totalPrice: pricePerPerson * input.numberOfTourists,
      currency: tour.pricing.currency,
    },
    meetingPoint: {
      name: options.meetingPoint.name.pt,
      lat: options.meetingPoint.coordinates.lat,
      lng: options.meetingPoint.coordinates.lng,
      description: options.meetingPoint.description,
    },
    shareableLink: `${options.shareableBaseUrl ?? 'dev://bookings'}/${options.id}`,
  };
}

export function checkInBooking(
  booking: Booking,
  options: { readonly location: Coordinates; readonly checkedInAt?: Date },
): Booking {
  const checkedInAtDate = options.checkedInAt ?? new Date();

  if (!getBookingCheckInState(booking, checkedInAtDate).canCheckIn) {
    return booking;
  }

  const checkedInAt = timestampFromDate(checkedInAtDate);

  return {
    ...booking,
    status: 'in_progress',
    checkIn: {
      checkedInAt,
      location: options.location,
    },
    updatedAt: checkedInAt,
  };
}

export function checkOutBooking(
  booking: Booking,
  options: { readonly location: Coordinates; readonly checkedOutAt?: Date },
): Booking {
  if (booking.checkOut || !booking.checkIn || booking.status === 'cancelled') {
    return booking;
  }

  const checkedOutAt = timestampFromDate(options.checkedOutAt ?? new Date());

  return {
    ...booking,
    status: 'completed',
    checkOut: {
      checkedOutAt,
      location: options.location,
    },
    updatedAt: checkedOutAt,
  };
}

export function confirmBooking(
  booking: Booking,
  options?: { readonly confirmedAt?: Date },
): Booking {
  if (booking.status !== 'pending') {
    return booking;
  }

  const confirmedAt = timestampFromDate(options?.confirmedAt ?? new Date());

  return {
    ...booking,
    status: 'confirmed',
    updatedAt: confirmedAt,
  };
}

export function cancelBooking(
  booking: Booking,
  options: {
    readonly cancelledAt?: Date;
    readonly cancelledBy: 'tourist' | 'guide' | 'admin';
    readonly reason: string;
  },
): Booking {
  const cancelledAtDate = options.cancelledAt ?? new Date();

  if (!getBookingCancellationState(booking, options.cancelledBy, cancelledAtDate).canCancel) {
    return booking;
  }

  const cancelledAt = timestampFromDate(cancelledAtDate);

  return {
    ...booking,
    cancellation: {
      cancelledAt,
      cancelledBy: options.cancelledBy,
      reason: options.reason,
      refundIssued: false,
    },
    status: 'cancelled',
    updatedAt: cancelledAt,
  };
}
