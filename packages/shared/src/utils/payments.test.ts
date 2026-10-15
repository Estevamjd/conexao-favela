import { describe, expect, it } from 'vitest';
import type { Booking, Tour } from '../types';
import {
  calculateBookingPaymentAmount,
  normalizeMercadoPagoStatus,
  normalizeStripeEventStatus,
  PaymentDomainError,
  selectPaymentGateway,
} from './payments';

const publishedTour: Pick<Tour, 'paymentPrices' | 'pricing' | 'status'> = {
  paymentPrices: {
    BRL: { amountCents: 8000, currency: 'BRL' },
    EUR: { amountCents: 1600, currency: 'EUR' },
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

const pendingBooking: Pick<Booking, 'numberOfTourists' | 'status'> = {
  numberOfTourists: 2,
  status: 'pending',
};

describe('payment domain helpers', () => {
  it('calculates booking amount from server tour data and traveler count', () => {
    expect(calculateBookingPaymentAmount(pendingBooking, publishedTour, 'BRL')).toEqual({
      amountCents: 16000,
      currency: 'BRL',
    });
    expect(calculateBookingPaymentAmount(pendingBooking, publishedTour, 'USD')).toEqual({
      amountCents: 3600,
      currency: 'USD',
    });
  });

  it('falls back to legacy BRL tour pricing while rejecting missing international prices', () => {
    const legacyTour: Pick<Tour, 'paymentPrices' | 'pricing' | 'status'> = {
      pricing: {
        currency: 'BRL',
        maxPrice: 70,
        minPrice: 70,
        type: 'fixed',
      },
      status: 'published',
    };

    expect(calculateBookingPaymentAmount(pendingBooking, legacyTour, 'BRL').amountCents).toBe(
      14000,
    );
    expect(() => calculateBookingPaymentAmount(pendingBooking, legacyTour, 'USD')).toThrow(
      PaymentDomainError,
    );
  });

  it('does not calculate payment for non-pending bookings', () => {
    expect(() =>
      calculateBookingPaymentAmount(
        { ...pendingBooking, status: 'confirmed' },
        publishedTour,
        'BRL',
      ),
    ).toThrow(PaymentDomainError);
  });

  it('routes Brazilian BRL payments to Mercado Pago and international card payments to Stripe', () => {
    expect(selectPaymentGateway('BR', 'BRL', 'pix')).toBe('mercado_pago');
    expect(selectPaymentGateway('US', 'USD', 'card')).toBe('stripe');
    expect(() => selectPaymentGateway('US', 'USD', 'pix')).toThrow(PaymentDomainError);
  });

  it('normalizes gateway statuses to the app contract', () => {
    expect(normalizeMercadoPagoStatus('approved')).toBe('approved');
    expect(normalizeMercadoPagoStatus('charged_back')).toBe('chargeback');
    expect(normalizeStripeEventStatus('checkout.session.completed')).toBe('approved');
    expect(normalizeStripeEventStatus('checkout.session.expired')).toBe('expired');
  });
});
