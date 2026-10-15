import { describe, expect, it } from 'vitest';
import {
  formatBookingDate,
  formatBookingPrice,
  resolveBookingStatusKey,
  shouldContinueBookingPayment,
} from './booking-formatters';

describe('booking formatters', () => {
  it('maps booking statuses to translation keys', () => {
    expect(resolveBookingStatusKey({ status: 'pending' })).toBe('statusPending');
    expect(resolveBookingStatusKey({ status: 'confirmed' })).toBe('statusConfirmed');
    expect(resolveBookingStatusKey({ status: 'in_progress' })).toBe('statusInProgress');
    expect(resolveBookingStatusKey({ status: 'completed' })).toBe('statusCompleted');
    expect(resolveBookingStatusKey({ status: 'cancelled' })).toBe('statusCancelled');
    expect(resolveBookingStatusKey({ status: 'no_show' })).toBe('statusNoShow');
  });

  it('formats booking date and price for the active language', () => {
    expect(formatBookingDate(new Date('2026-06-02T17:00:00.000Z'), 'pt')).toContain('2026');
    expect(formatBookingPrice(160, 'BRL', 'pt')).toContain('160');
  });

  it('shows payment recovery only for unpaid pending bookings', () => {
    expect(shouldContinueBookingPayment({ status: 'pending' })).toBe(true);
    expect(
      shouldContinueBookingPayment({
        payment: {
          currency: 'BRL',
          gateway: 'mercado_pago',
          method: 'pix',
          paymentId: 'payment_1',
          status: 'pending',
        },
        status: 'pending',
      }),
    ).toBe(true);
    expect(
      shouldContinueBookingPayment({
        payment: {
          currency: 'BRL',
          gateway: 'mercado_pago',
          method: 'pix',
          paymentId: 'payment_1',
          status: 'approved',
        },
        status: 'pending',
      }),
    ).toBe(false);
    expect(shouldContinueBookingPayment({ status: 'confirmed' })).toBe(false);
  });
});
