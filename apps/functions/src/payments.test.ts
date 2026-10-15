import { describe, expect, it } from 'vitest';
import {
  buildPaymentCreationPlan,
  mapBookingForPayment,
  mapPaymentForRead,
  mapTourForPayment,
  parseCreatePaymentRequest,
  PaymentPlanError,
  resolvePaymentStatusTransition,
  type CreatePaymentRequestInput,
  type FunctionBookingForPayment,
  type FunctionTourForPayment,
} from './payments.js';

const booking: FunctionBookingForPayment = {
  communityId: 'alemao',
  guideId: 'guide-1',
  id: 'booking-1',
  numberOfTourists: 2,
  status: 'pending',
  touristId: 'tourist-1',
  tourId: 'tour-1',
};

const tour: FunctionTourForPayment = {
  id: 'tour-1',
  paymentPrices: {
    BRL: { amountCents: 8000, currency: 'BRL' },
    USD: { amountCents: 1800, currency: 'USD' },
  },
  pricing: {
    currency: 'BRL',
    maxPrice: 120,
    minPrice: 80,
    type: 'range',
  },
  status: 'published',
};

function buildInput(overrides: Partial<CreatePaymentRequestInput> = {}): CreatePaymentRequestInput {
  return {
    bookingId: 'booking-1',
    country: 'BR',
    currency: 'BRL',
    paymentMethod: 'pix',
    ...overrides,
  };
}

describe('payment function planning', () => {
  it('parses a create payment request without accepting extra fields', () => {
    expect(parseCreatePaymentRequest(buildInput()).country).toBe('BR');
    expect(() =>
      parseCreatePaymentRequest({
        ...buildInput(),
        amountCents: 1,
      }),
    ).toThrow(PaymentPlanError);
  });

  it('builds a Mercado Pago Pix payment plan for Brazilian bookings', () => {
    const plan = buildPaymentCreationPlan(buildInput(), booking, tour, {
      paymentId: 'payment-1',
      userId: 'tourist-1',
    });

    expect(plan.payment).toMatchObject({
      amountCents: 16000,
      bookingId: 'booking-1',
      currency: 'BRL',
      gateway: 'mercado_pago',
      paymentMethod: 'pix',
      status: 'pending',
      userId: 'tourist-1',
    });
    expect(plan.response).toMatchObject({
      amountCents: 16000,
      gateway: 'mercado_pago',
      paymentId: 'payment-1',
    });
  });

  it('builds a Stripe card payment plan for international bookings', () => {
    const plan = buildPaymentCreationPlan(
      buildInput({ country: 'US', currency: 'USD', paymentMethod: 'card' }),
      booking,
      tour,
      {
        paymentId: 'payment-1',
        userId: 'tourist-1',
      },
    );

    expect(plan.payment.gateway).toBe('stripe');
    expect(plan.payment.amountCents).toBe(3600);
  });

  it('rejects payment attempts by another user', () => {
    expect(() =>
      buildPaymentCreationPlan(buildInput(), booking, tour, {
        paymentId: 'payment-1',
        userId: 'other-user',
      }),
    ).toThrow(PaymentPlanError);
  });

  it('maps Firestore booking, tour and payment data defensively', () => {
    expect(
      mapBookingForPayment('booking-1', {
        communityId: 'alemao',
        guideId: 'guide-1',
        numberOfTourists: 2,
        status: 'pending',
        touristId: 'tourist-1',
        tourId: 'tour-1',
      })?.id,
    ).toBe('booking-1');
    expect(
      mapTourForPayment('tour-1', {
        paymentPrices: tour.paymentPrices,
        pricing: tour.pricing,
        status: 'published',
      })?.paymentPrices?.USD?.amountCents,
    ).toBe(1800);
    expect(
      mapPaymentForRead('payment-1', {
        amountCents: 16000,
        bookingId: 'booking-1',
        country: 'BR',
        currency: 'BRL',
        gateway: 'mercado_pago',
        gatewayPaymentId: 'mp-1',
        paymentMethod: 'pix',
        purpose: 'booking',
        status: 'pending',
        userId: 'tourist-1',
      })?.gatewayPaymentId,
    ).toBe('mp-1');
  });

  it('prevents duplicate or out-of-order webhooks from regressing terminal payments', () => {
    expect(resolvePaymentStatusTransition('pending', 'approved')).toBe('approved');
    expect(resolvePaymentStatusTransition('approved', 'pending')).toBe('approved');
    expect(resolvePaymentStatusTransition('approved', 'approved')).toBe('approved');
    expect(resolvePaymentStatusTransition('approved', 'refunded')).toBe('refunded');
    expect(resolvePaymentStatusTransition('refunded', 'chargeback')).toBe('chargeback');
    expect(resolvePaymentStatusTransition('expired', 'approved')).toBe('expired');
  });
});
