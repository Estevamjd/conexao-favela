import { describe, expect, it } from 'vitest';
import {
  BookingCreationPlanError,
  buildBookingCreationPlan,
  mapPoiForBooking,
  mapTourForBooking,
  parseBookingCreationRequest,
  type FunctionPoiForBooking,
  type FunctionTourForBooking,
} from './booking-creation.js';

const publishedTour: FunctionTourForBooking = {
  capacity: {
    maxTourists: 8,
    minTourists: 2,
  },
  communityId: 'alemao',
  guideId: 'guide-1',
  id: 'tour-1',
  pricing: {
    currency: 'BRL',
    maxPrice: 120,
    minPrice: 80,
    type: 'range',
  },
  route: {
    points: [{ estimatedTime: 25, order: 1, poiId: 'poi-1' }],
  },
  status: 'published',
};

const meetingPoint: FunctionPoiForBooking = {
  coordinates: {
    lat: -22.861,
    lng: -43.273,
  },
  description: {
    en: 'Former cable car station.',
    pt: 'Antiga estacao do teleferico.',
  },
  id: 'poi-1',
  name: {
    en: 'Cable car station',
    pt: 'Estacao do Teleferico',
  },
};

const validRequest = {
  communityId: 'alemao',
  numberOfTourists: 2,
  scheduledForIso: '2026-07-15T12:00:00.000Z',
  tourId: 'tour-1',
  touristsInfo: [{ name: 'Ana Souza' }, { name: 'Bruno Lima' }],
};

describe('booking creation function planning', () => {
  it('parses a strict client payload without trusting guide or price fields', () => {
    expect(parseBookingCreationRequest(validRequest)).toEqual(validRequest);
    expect(() =>
      parseBookingCreationRequest({
        ...validRequest,
        guideId: 'client-controlled-guide',
      }),
    ).toThrow(BookingCreationPlanError);
    expect(() =>
      parseBookingCreationRequest({
        ...validRequest,
        pricing: { totalPrice: 1 },
      }),
    ).toThrow(BookingCreationPlanError);
  });

  it('maps Firestore tour and POI documents into the booking contract', () => {
    expect(
      mapTourForBooking('tour-1', {
        ...publishedTour,
        capacity: { maxTourists: 8, minTourists: 2 },
        pricing: { currency: 'BRL', maxPrice: 120, minPrice: 80, type: 'range' },
      }),
    ).toEqual(publishedTour);
    expect(mapPoiForBooking('poi-1', meetingPoint)).toEqual(meetingPoint);
    expect(mapTourForBooking('bad-tour', { ...publishedTour, status: 'paused' })?.status).toBe(
      'paused',
    );
  });

  it('builds a pending booking with server-side guide, price, and meeting point', () => {
    const plan = buildBookingCreationPlan(validRequest, publishedTour, meetingPoint, {
      bookingId: 'booking-1',
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      shareableBaseUrl: 'https://app.example/bookings',
      touristId: 'tourist-1',
    });

    expect(plan.booking.id).toBe('booking-1');
    expect(plan.booking.guideId).toBe('guide-1');
    expect(plan.booking.touristId).toBe('tourist-1');
    expect(plan.booking.status).toBe('pending');
    expect(plan.booking.pricing).toEqual({
      currency: 'BRL',
      pricePerPerson: 80,
      totalPrice: 160,
    });
    expect(plan.booking.meetingPoint.name).toBe('Estacao do Teleferico');
    expect(plan.booking.shareableLink).toBe('https://app.example/bookings/booking-1');
    expect(plan.response).toEqual({
      bookingId: 'booking-1',
      guideId: 'guide-1',
      scheduledForIso: '2026-07-15T12:00:00.000Z',
      status: 'pending',
      totalPrice: 160,
    });
  });

  it('rejects unavailable tours and capacity outside tour limits', () => {
    expect(() =>
      buildBookingCreationPlan(validRequest, { ...publishedTour, status: 'draft' }, meetingPoint, {
        bookingId: 'booking-1',
        touristId: 'tourist-1',
      }),
    ).toThrow(BookingCreationPlanError);
    expect(() =>
      buildBookingCreationPlan(
        {
          ...validRequest,
          numberOfTourists: 9,
          touristsInfo: Array.from({ length: 9 }, (_, index) => ({
            name: `Traveler ${index.toString()}`,
          })),
        },
        publishedTour,
        meetingPoint,
        {
          bookingId: 'booking-1',
          touristId: 'tourist-1',
        },
      ),
    ).toThrow(BookingCreationPlanError);
  });
});
