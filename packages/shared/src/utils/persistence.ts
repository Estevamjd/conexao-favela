import type { AppNotification, Booking } from '../types';
import { reviveTimestamp } from './timestamps';

export function reviveBookingTimestamps(booking: Booking): Booking {
  return {
    ...booking,
    cancellation: booking.cancellation
      ? {
          ...booking.cancellation,
          cancelledAt: reviveTimestamp(booking.cancellation.cancelledAt),
        }
      : undefined,
    checkIn: booking.checkIn
      ? {
          ...booking.checkIn,
          checkedInAt: reviveTimestamp(booking.checkIn.checkedInAt),
        }
      : undefined,
    checkOut: booking.checkOut
      ? {
          ...booking.checkOut,
          checkedOutAt: reviveTimestamp(booking.checkOut.checkedOutAt),
        }
      : undefined,
    createdAt: booking.createdAt ? reviveTimestamp(booking.createdAt) : undefined,
    scheduledFor: reviveTimestamp(booking.scheduledFor),
    updatedAt: booking.updatedAt ? reviveTimestamp(booking.updatedAt) : undefined,
  };
}

export function reviveNotificationTimestamps(notification: AppNotification): AppNotification {
  return {
    ...notification,
    createdAt: reviveTimestamp(notification.createdAt),
    readAt: notification.readAt ? reviveTimestamp(notification.readAt) : undefined,
  };
}
