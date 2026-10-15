import { describe, expect, it } from 'vitest';
import {
  buildBookingCancelledNotifications,
  buildBookingConfirmedNotifications,
  buildBookingCreatedNotifications,
  type FunctionBookingNotificationContext,
} from './booking-notifications.js';

const context: FunctionBookingNotificationContext = {
  bookingId: 'booking-1',
  communityId: 'alemao',
  guideId: 'guide-1',
  touristId: 'tourist-1',
  tourId: 'tour-1',
};

describe('booking notification planning', () => {
  it('creates notifications for guide and tourist without personal payload fields', () => {
    const notifications = buildBookingCreatedNotifications(context, {
      createdAt: new Date('2026-06-03T10:00:00.000Z'),
    });

    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.userId)).toEqual([
      'guide-1',
      'tourist-1',
    ]);
    expect(notifications[0]?.data).toEqual({
      bookingId: 'booking-1',
      communityId: 'alemao',
      tourId: 'tour-1',
    });
    expect(JSON.stringify(notifications)).not.toContain('Ana Souza');
  });

  it('notifies the tourist when a guide confirms a booking', () => {
    const notifications = buildBookingConfirmedNotifications(context);

    expect(notifications).toMatchObject([
      {
        type: 'booking_confirmed',
        userId: 'tourist-1',
      },
    ]);
  });

  it('notifies both participants when a booking is cancelled', () => {
    const notifications = buildBookingCancelledNotifications(context);

    expect(notifications).toHaveLength(2);
    expect(notifications.map((notification) => notification.userId)).toEqual([
      'tourist-1',
      'guide-1',
    ]);
  });
});
