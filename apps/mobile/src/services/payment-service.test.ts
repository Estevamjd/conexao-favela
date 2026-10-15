import {
  buildBookingFromRequest,
  INITIAL_POIS,
  INITIAL_TOURS,
  type BookingRequestInput,
} from '@conexao-favela/shared';
import { describe, expect, it } from 'vitest';
import { createDemoPayment } from './payment-service';

describe('demo payment creation', () => {
  it('uses the fixed tour price for the selected currency', () => {
    const tour = INITIAL_TOURS[1];

    if (!tour) {
      throw new Error('Expected the second seeded tour.');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected a seeded meeting point.');
    }

    const request: BookingRequestInput = {
      communityId: tour.communityId,
      guideId: tour.guideId,
      numberOfTourists: 2,
      scheduledForIso: '2026-08-15T09:00:00-03:00',
      tourId: tour.id,
      touristId: 'tourist-1',
      touristsInfo: [{ name: 'Ana' }, { name: 'Bia' }],
    };
    const booking = buildBookingFromRequest(request, tour, {
      id: 'booking-1',
      meetingPoint,
    });
    const payment = createDemoPayment(
      {
        bookingId: booking.id,
        country: 'DE',
        currency: 'EUR',
        paymentMethod: 'card',
      },
      booking,
      tour,
    );

    expect(payment.amountCents).toBe(2800);
    expect(payment.currency).toBe('EUR');
    expect(payment.gateway).toBe('stripe');
  });

  it('applies a known coupon to the server-derived amount and rejects unknown codes', () => {
    const tour = INITIAL_TOURS[0];
    if (!tour) throw new Error('Expected a seeded tour.');
    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);
    if (!meetingPoint) throw new Error('Expected a seeded meeting point.');
    const booking = buildBookingFromRequest(
      {
        communityId: tour.communityId,
        guideId: tour.guideId,
        numberOfTourists: 2,
        scheduledForIso: '2026-08-15T09:00:00-03:00',
        tourId: tour.id,
        touristId: 'tourist-1',
        touristsInfo: [{ name: 'Ana' }, { name: 'Bia' }],
      },
      tour,
      { id: 'booking-coupon', meetingPoint },
    );

    const payment = createDemoPayment(
      {
        bookingId: booking.id,
        country: 'BR',
        couponCode: ' BEMVINDO10 ',
        currency: 'BRL',
        paymentMethod: 'pix',
      },
      booking,
      tour,
    );
    expect(payment.originalAmountCents).toBe(16_000);
    expect(payment.discountAmountCents).toBe(1600);
    expect(payment.amountCents).toBe(14_400);
    expect(() =>
      createDemoPayment(
        {
          bookingId: booking.id,
          country: 'BR',
          couponCode: 'NAOEXISTE',
          currency: 'BRL',
          paymentMethod: 'pix',
        },
        booking,
        tour,
      ),
    ).toThrow();
  });
});
