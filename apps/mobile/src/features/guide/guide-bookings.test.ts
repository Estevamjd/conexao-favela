import { describe, expect, it } from 'vitest';
import { timestampFromDate, type Booking } from '@conexao-favela/shared';
import {
  findGuideBookingById,
  getGuideBookingActionState,
  getGuideBookings,
} from './guide-bookings';

function makeBooking(overrides: Partial<Booking> = {}): Booking {
  return {
    id: 'booking-a',
    tourId: 'tour-a',
    guideId: 'guide-a',
    touristId: 'tourist-a',
    communityId: 'community-a',
    scheduledFor: timestampFromDate(new Date('2099-06-15T12:00:00.000Z')),
    numberOfTourists: 2,
    touristsInfo: [{ name: 'Visitante QA' }],
    status: 'pending',
    pricing: {
      currency: 'BRL',
      pricePerPerson: 80,
      totalPrice: 160,
    },
    meetingPoint: {
      description: {
        de: 'Treffpunkt',
        en: 'Meeting point',
        es: 'Punto de encuentro',
        fr: 'Point de rendez-vous',
        it: 'Punto di incontro',
        ja: '集合場所',
        pt: 'Ponto de encontro',
        zh: '集合点',
      },
      lat: -22.8592,
      lng: -43.2759,
      name: 'Estacao seed',
    },
    shareableLink: 'dev://bookings/booking-a',
    ...overrides,
  };
}

describe('guide booking selectors', () => {
  it('filters bookings by guide and community and sorts by schedule', () => {
    const laterBooking = makeBooking({
      id: 'later',
      scheduledFor: timestampFromDate(new Date('2099-06-16T12:00:00.000Z')),
    });
    const earlierBooking = makeBooking({
      id: 'earlier',
      scheduledFor: timestampFromDate(new Date('2099-06-14T12:00:00.000Z')),
    });
    const otherGuideBooking = makeBooking({
      guideId: 'guide-b',
      id: 'other-guide',
    });
    const otherCommunityBooking = makeBooking({
      communityId: 'community-b',
      id: 'other-community',
    });

    const result = getGuideBookings({
      bookings: [laterBooking, otherGuideBooking, otherCommunityBooking, earlierBooking],
      communityId: 'community-a',
      guideId: 'guide-a',
    });

    expect(result.map((booking) => booking.id)).toEqual(['earlier', 'later']);
  });

  it('finds a booking only inside the active guide scope', () => {
    const scopedBooking = makeBooking({ id: 'visible' });
    const otherGuideBooking = makeBooking({ guideId: 'guide-b', id: 'hidden' });

    expect(
      findGuideBookingById({
        bookingId: 'visible',
        bookings: [otherGuideBooking, scopedBooking],
        communityId: 'community-a',
        guideId: 'guide-a',
      })?.id,
    ).toBe('visible');
    expect(
      findGuideBookingById({
        bookingId: 'hidden',
        bookings: [otherGuideBooking, scopedBooking],
        communityId: 'community-a',
        guideId: 'guide-a',
      }),
    ).toBeUndefined();
  });

  it('exposes the expected action state for pending and in-progress bookings', () => {
    expect(getGuideBookingActionState(makeBooking())).toMatchObject({
      canCancel: true,
      canCheckOut: false,
      canConfirm: true,
    });

    expect(
      getGuideBookingActionState(
        makeBooking({
          checkIn: {
            checkedInAt: timestampFromDate(new Date('2099-06-15T12:00:00.000Z')),
            location: { lat: -22.8592, lng: -43.2759 },
          },
          status: 'in_progress',
        }),
      ),
    ).toMatchObject({
      canCancel: false,
      canCheckOut: true,
      canConfirm: false,
    });
  });
});
