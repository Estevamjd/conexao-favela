import type { PaymentCurrency, PaymentStatus } from './payments.js';

export type CouponRedemptionStatus = 'applied' | 'consumed' | 'released';

export type CouponRedemptionTransition = {
  readonly decrementQuota: boolean;
  readonly status: Exclude<CouponRedemptionStatus, 'applied'>;
};

export function resolveCouponRedemptionTransition(
  currentStatus: CouponRedemptionStatus,
  paymentStatus: PaymentStatus,
): CouponRedemptionTransition | null {
  if (currentStatus !== 'applied') return null;
  if (paymentStatus === 'approved') return { decrementQuota: false, status: 'consumed' };
  if (
    paymentStatus === 'cancelled' ||
    paymentStatus === 'expired' ||
    paymentStatus === 'rejected'
  ) {
    return { decrementQuota: true, status: 'released' };
  }
  return null;
}

export type FunctionCoupon = {
  readonly id: string;
  readonly code: string;
  readonly active: boolean;
  readonly currencies: readonly PaymentCurrency[];
  readonly discount:
    | { readonly type: 'fixed'; readonly amountCents: number }
    | { readonly type: 'percentage'; readonly percentage: number };
  readonly tourIds?: readonly string[];
  readonly minimumAmountCents?: number;
  readonly maximumRedemptions?: number;
  readonly redeemedCount: number;
  readonly startsAt: Date;
  readonly expiresAt: Date;
};

export class CouponActionError extends Error {
  constructor(
    readonly code: 'expired' | 'inactive' | 'invalid' | 'minimum' | 'quota' | 'scope',
    message: string,
  ) {
    super(message);
    this.name = 'CouponActionError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function hasToDate(value: unknown): value is { readonly toDate: () => unknown } {
  return isRecord(value) && typeof value.toDate === 'function';
}

function readDate(value: unknown): Date | null {
  if (!hasToDate(value)) return null;
  const date = value.toDate();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readStrings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function mapCouponForPayment(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionCoupon | null {
  const code = typeof data.code === 'string' ? data.code.trim().toUpperCase() : '';
  const startsAt = readDate(data.startsAt);
  const expiresAt = readDate(data.expiresAt);
  const discountData = isRecord(data.discount) ? data.discount : null;
  const currencies = readStrings(data.currencies).filter(
    (value): value is PaymentCurrency => value === 'BRL' || value === 'USD' || value === 'EUR',
  );
  if (!code || !startsAt || !expiresAt || !discountData || currencies.length === 0) return null;

  const discount =
    discountData.type === 'fixed' && readNumber(discountData.amountCents) !== undefined
      ? { amountCents: readNumber(discountData.amountCents) ?? 0, type: 'fixed' as const }
      : discountData.type === 'percentage' && readNumber(discountData.percentage) !== undefined
        ? { percentage: readNumber(discountData.percentage) ?? 0, type: 'percentage' as const }
        : null;
  if (!discount) return null;

  return {
    active: data.active === true,
    code,
    currencies,
    discount,
    expiresAt,
    id,
    maximumRedemptions: readNumber(data.maximumRedemptions),
    minimumAmountCents: readNumber(data.minimumAmountCents),
    redeemedCount: readNumber(data.redeemedCount) ?? 0,
    startsAt,
    tourIds: Array.isArray(data.tourIds) ? readStrings(data.tourIds) : undefined,
  };
}

export function calculateCouponDiscount(input: {
  readonly amountCents: number;
  readonly coupon: FunctionCoupon;
  readonly currency: PaymentCurrency;
  readonly now?: Date;
  readonly tourId: string;
}): { readonly discountAmountCents: number; readonly finalAmountCents: number } {
  const { coupon } = input;
  const now = input.now ?? new Date();
  if (!coupon.active) throw new CouponActionError('inactive', 'Coupon is inactive.');
  if (coupon.startsAt > now || coupon.expiresAt < now) {
    throw new CouponActionError('expired', 'Coupon is outside its validity period.');
  }
  if (
    !coupon.currencies.includes(input.currency) ||
    (coupon.tourIds && !coupon.tourIds.includes(input.tourId))
  ) {
    throw new CouponActionError('scope', 'Coupon is not valid for this payment.');
  }
  if (coupon.minimumAmountCents && input.amountCents < coupon.minimumAmountCents) {
    throw new CouponActionError('minimum', 'Payment does not meet the coupon minimum.');
  }
  if (
    coupon.maximumRedemptions !== undefined &&
    coupon.redeemedCount >= coupon.maximumRedemptions
  ) {
    throw new CouponActionError('quota', 'Coupon redemption limit was reached.');
  }
  const rawDiscount =
    coupon.discount.type === 'fixed'
      ? coupon.discount.amountCents
      : Math.round(input.amountCents * (coupon.discount.percentage / 100));
  if (!Number.isInteger(rawDiscount) || rawDiscount <= 0) {
    throw new CouponActionError('invalid', 'Coupon discount is invalid.');
  }
  const discountAmountCents = Math.min(input.amountCents, rawDiscount);
  return { discountAmountCents, finalAmountCents: input.amountCents - discountAmountCents };
}
