import { describe, expect, it } from 'vitest';
import {
  calculateCouponDiscount,
  CouponActionError,
  resolveCouponRedemptionTransition,
  type FunctionCoupon,
} from './coupon-actions.js';

const coupon: FunctionCoupon = {
  active: true,
  code: 'BEMVINDO10',
  currencies: ['BRL'],
  discount: { percentage: 10, type: 'percentage' },
  expiresAt: new Date('2027-01-01T00:00:00.000Z'),
  id: 'coupon-1',
  maximumRedemptions: 10,
  minimumAmountCents: 1000,
  redeemedCount: 0,
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
};

describe('coupon actions', () => {
  it('calculates a bounded server-side discount', () => {
    expect(
      calculateCouponDiscount({
        amountCents: 16_000,
        coupon,
        currency: 'BRL',
        now: new Date('2026-06-01T00:00:00.000Z'),
        tourId: 'tour-1',
      }),
    ).toEqual({ discountAmountCents: 1600, finalAmountCents: 14_400 });
  });

  it('rejects expired and exhausted coupons', () => {
    expect(() =>
      calculateCouponDiscount({
        amountCents: 16_000,
        coupon,
        currency: 'BRL',
        now: new Date('2028-01-01T00:00:00.000Z'),
        tourId: 'tour-1',
      }),
    ).toThrow(CouponActionError);
    expect(() =>
      calculateCouponDiscount({
        amountCents: 16_000,
        coupon: { ...coupon, redeemedCount: 10 },
        currency: 'BRL',
        now: new Date('2026-06-01T00:00:00.000Z'),
        tourId: 'tour-1',
      }),
    ).toThrow(CouponActionError);
  });

  it('consumes or releases a coupon only once for a payment transition', () => {
    expect(resolveCouponRedemptionTransition('applied', 'approved')).toEqual({
      decrementQuota: false,
      status: 'consumed',
    });
    expect(resolveCouponRedemptionTransition('applied', 'expired')).toEqual({
      decrementQuota: true,
      status: 'released',
    });
    expect(resolveCouponRedemptionTransition('released', 'expired')).toBeNull();
    expect(resolveCouponRedemptionTransition('consumed', 'approved')).toBeNull();
  });
});
