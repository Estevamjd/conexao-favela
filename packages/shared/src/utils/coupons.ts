import type { PaymentCurrency, PromotionCoupon, Tour } from '../types';

export type CouponValidationResult =
  | {
      readonly valid: true;
      readonly discountAmountCents: number;
      readonly finalAmountCents: number;
    }
  | {
      readonly valid: false;
      readonly reason: 'currency' | 'expired' | 'inactive' | 'minimum' | 'quota' | 'tour';
    };

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function validateCoupon(input: {
  readonly amountCents: number;
  readonly coupon: PromotionCoupon;
  readonly currency: PaymentCurrency;
  readonly now?: Date;
  readonly tourId: Tour['id'];
}): CouponValidationResult {
  const now = input.now ?? new Date();
  const { coupon } = input;

  if (!coupon.active) return { valid: false, reason: 'inactive' };
  if (coupon.startsAt.toDate() > now || coupon.expiresAt.toDate() < now) {
    return { valid: false, reason: 'expired' };
  }
  if (!coupon.currencies.includes(input.currency)) return { valid: false, reason: 'currency' };
  if (coupon.tourIds && !coupon.tourIds.includes(input.tourId)) {
    return { valid: false, reason: 'tour' };
  }
  if (coupon.minimumAmountCents && input.amountCents < coupon.minimumAmountCents) {
    return { valid: false, reason: 'minimum' };
  }
  if (
    coupon.maximumRedemptions !== undefined &&
    coupon.redeemedCount >= coupon.maximumRedemptions
  ) {
    return { valid: false, reason: 'quota' };
  }

  const rawDiscount =
    coupon.discount.type === 'fixed'
      ? coupon.discount.amountCents
      : Math.round(input.amountCents * (coupon.discount.percentage / 100));
  const discountAmountCents = Math.max(0, Math.min(input.amountCents, rawDiscount));

  return {
    discountAmountCents,
    finalAmountCents: input.amountCents - discountAmountCents,
    valid: true,
  };
}
