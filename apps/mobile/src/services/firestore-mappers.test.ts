import {
  INITIAL_POIS,
  INITIAL_TOURS,
  bookingRequestSchema,
  buildBookingFromRequest,
  timestampFromDate,
} from '@conexao-favela/shared';
import { describe, expect, it } from 'vitest';
import {
  mapFirestoreBooking,
  mapFirestoreNotification,
  mapFirestoreTour,
} from './firestore-mappers';

const seedTour = INITIAL_TOURS[0];
const seedPoi = INITIAL_POIS.find((poi) => poi.id === seedTour?.route.points[0]?.poiId);

describe('Firestore domain mappers', () => {
  it('maps a published tour document into the shared Tour contract', () => {
    if (!seedTour) {
      throw new Error('Expected seed tour');
    }

    expect(
      mapFirestoreTour(seedTour.id, {
        ...seedTour,
        createdAt: timestampFromDate(new Date('2026-06-02T12:00:00.000Z')),
      }),
    ).toMatchObject({
      communityId: seedTour.communityId,
      guideId: seedTour.guideId,
      id: seedTour.id,
      status: 'published',
    });
  });

  it('maps a booking document with lifecycle fields', () => {
    if (!seedTour || !seedPoi) {
      throw new Error('Expected seed data');
    }

    const booking = buildBookingFromRequest(
      bookingRequestSchema.parse({
        communityId: seedTour.communityId,
        guideId: seedTour.guideId,
        numberOfTourists: 2,
        scheduledForIso: '2026-07-15T12:00:00.000Z',
        tourId: seedTour.id,
        touristId: 'tourist-1',
        touristsInfo: [{ name: 'Ana Souza' }, { name: 'Bruno Lima' }],
      }),
      seedTour,
      {
        id: 'booking-1',
        meetingPoint: seedPoi,
      },
    );

    expect(
      mapFirestoreBooking(booking.id, {
        ...booking,
        checkIn: {
          checkedInAt: timestampFromDate(new Date('2026-07-15T11:00:00.000Z')),
          location: { lat: -22.86, lng: -43.27 },
        },
        updatedAt: timestampFromDate(new Date('2026-07-15T11:00:00.000Z')),
      }),
    ).toMatchObject({
      checkIn: {
        location: { lat: -22.86, lng: -43.27 },
      },
      communityId: seedTour.communityId,
      id: booking.id,
      status: 'pending',
    });
  });

  it('rejects incomplete Firestore documents', () => {
    expect(mapFirestoreTour('tour-1', { status: 'published' })).toBeNull();
    expect(mapFirestoreBooking('booking-1', { status: 'pending' })).toBeNull();
  });

  it('maps notification documents and drops nested payload data', () => {
    const notification = mapFirestoreNotification('notification-1', {
      body: {
        en: 'The guide confirmed your booking.',
        pt: 'O guia confirmou sua reserva.',
      },
      createdAt: timestampFromDate(new Date('2026-06-03T12:00:00.000Z')),
      data: {
        bookingId: 'booking-1',
        nested: { private: true },
      },
      read: false,
      title: {
        en: 'Booking confirmed',
        pt: 'Reserva confirmada',
      },
      type: 'booking_confirmed',
      userId: 'tourist-1',
    });

    expect(notification).toMatchObject({
      data: {
        bookingId: 'booking-1',
      },
      id: 'notification-1',
      read: false,
      type: 'booking_confirmed',
      userId: 'tourist-1',
    });
  });
});
