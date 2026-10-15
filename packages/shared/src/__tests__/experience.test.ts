import { describe, expect, it } from 'vitest';
import {
  applyMessageToChat,
  buildChatFromBooking,
  buildChatMessage,
  buildOfflineCommunityPack,
  buildTourReview,
  canReviewBooking,
  INITIAL_COMMUNITY_ID,
  INITIAL_COUPONS,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_POIS,
  INITIAL_TOURS,
  recommendTours,
  summarizeGuideFinance,
  summarizeReviews,
  timestampFromDate,
  validateCoupon,
  createMarketplaceInquirySchema,
  type Booking,
  type Payment,
} from '..';

const firstPoi = INITIAL_POIS[0];
const welcomeCoupon = INITIAL_COUPONS[0];

if (!firstPoi || !welcomeCoupon) {
  throw new Error('Experience seeds must include a POI and a coupon.');
}

const completedBooking: Booking = {
  communityId: INITIAL_COMMUNITY_ID,
  guideId: 'seed-guide-teleferico',
  id: 'booking-experience-test',
  meetingPoint: {
    description: firstPoi.description,
    lat: firstPoi.coordinates.lat,
    lng: firstPoi.coordinates.lng,
    name: 'Meeting point',
  },
  numberOfTourists: 2,
  pricing: { currency: 'BRL', pricePerPerson: 80, totalPrice: 160 },
  scheduledFor: timestampFromDate(new Date('2026-06-01T12:00:00.000Z')),
  shareableLink: 'https://example.test/booking',
  status: 'completed',
  tourId: 'memorias-do-teleferico',
  touristId: 'tourist-test',
  touristsInfo: [{ name: 'A' }, { name: 'B' }],
};

describe('complete experience domain', () => {
  it('builds a deterministic participant chat and updates its preview', () => {
    const chat = buildChatFromBooking(completedBooking, new Date('2026-06-01T10:00:00.000Z'));
    const message = buildChatMessage({
      chatId: chat.id,
      id: 'message-1',
      senderId: completedBooking.touristId,
      text: '  Ola, onde nos encontramos?  ',
    });

    expect(chat.id).toBe('seed-guide-teleferico_tourist-test');
    expect(message.text).toBe('Ola, onde nos encontramos?');
    expect(applyMessageToChat(chat, message).lastMessage?.text).toBe(message.text);
  });

  it('creates one review per completed booking and summarizes published ratings', () => {
    expect(canReviewBooking(completedBooking)).toBe(true);
    const review = buildTourReview({
      booking: completedBooking,
      comment: 'Uma experiencia muito bem conduzida.',
      id: 'review-test',
      language: 'pt',
      rating: 5,
    });

    expect(review.status).toBe('published');
    expect(summarizeReviews([review]).averageRating).toBe(5);
    expect(canReviewBooking({ ...completedBooking, reviewId: review.id })).toBe(false);
  });

  it('validates fixed and percentage coupons without creating negative totals', () => {
    const result = validateCoupon({
      amountCents: 16_000,
      coupon: welcomeCoupon,
      currency: 'BRL',
      now: new Date('2026-06-01T12:00:00.000Z'),
      tourId: completedBooking.tourId,
    });

    expect(result).toEqual({
      discountAmountCents: 1600,
      finalAmountCents: 14_400,
      valid: true,
    });
  });

  it('ranks tours from interests, language, favorites and community scope', () => {
    const recommendations = recommendTours({
      communityId: INITIAL_COMMUNITY_ID,
      favoriteTourIds: ['arte-becos-e-sabores'],
      interests: ['arte', 'gastronomia'],
      language: 'pt',
      tours: INITIAL_TOURS,
    });

    expect(recommendations[0]?.tourId).toBe('arte-becos-e-sabores');
    expect(recommendations.every((item) => item.communityId === INITIAL_COMMUNITY_ID)).toBe(true);
  });

  it('builds an offline manifest scoped by community', () => {
    const pack = buildOfflineCommunityPack({
      communityId: INITIAL_COMMUNITY_ID,
      languageCodes: ['pt', 'en'],
      pois: INITIAL_POIS,
      tours: INITIAL_TOURS,
      version: 1,
    });

    expect(pack.status).toBe('ready');
    expect(pack.poiIds).toHaveLength(12);
    expect(pack.tourIds).toHaveLength(3);
    expect(pack.pois).toHaveLength(12);
    expect(pack.tours).toHaveLength(3);
  });

  it('validates marketplace inquiries without accepting ownership fields from the client', () => {
    expect(INITIAL_MARKETPLACE_ITEMS).toHaveLength(3);
    expect(
      createMarketplaceInquirySchema.safeParse({
        itemId: INITIAL_MARKETPLACE_ITEMS[0]?.id,
        message: 'Gostaria de disponibilidade para duas pessoas.',
      }).success,
    ).toBe(true);
    expect(
      createMarketplaceInquirySchema.safeParse({
        itemId: INITIAL_MARKETPLACE_ITEMS[0]?.id,
        message: 'Gostaria de disponibilidade para duas pessoas.',
        providerId: 'spoofed',
      }).success,
    ).toBe(false);
  });

  it('summarizes approved, pending and refunded payments for one guide', () => {
    const paymentBase: Omit<Payment, 'id' | 'status'> = {
      amountCents: 16_000,
      bookingId: completedBooking.id,
      country: 'BR',
      createdAt: timestampFromDate(new Date()),
      currency: 'BRL',
      gateway: 'mercado_pago',
      gatewayPaymentId: 'gateway-test',
      paymentMethod: 'pix',
      purpose: 'booking',
      updatedAt: timestampFromDate(new Date()),
      userId: completedBooking.touristId,
    };
    const payments: Payment[] = [
      { ...paymentBase, id: 'approved', status: 'approved' },
      { ...paymentBase, id: 'refunded', status: 'refunded' },
    ];
    const summary = summarizeGuideFinance({
      bookings: [completedBooking],
      communityId: INITIAL_COMMUNITY_ID,
      guideId: completedBooking.guideId,
      payments,
    });

    expect(summary.grossByCurrency.BRL).toBe(16_000);
    expect(summary.refundedByCurrency.BRL).toBe(16_000);
  });
});
