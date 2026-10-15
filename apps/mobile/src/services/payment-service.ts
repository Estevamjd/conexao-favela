import type {
  Booking,
  PaymentCurrency,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  Tour,
} from '@conexao-favela/shared';
import {
  calculateBookingPaymentAmount,
  INITIAL_COUPONS,
  normalizeCouponCode,
  validateCoupon,
} from '@conexao-favela/shared';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

export type CreatePaymentInput = {
  readonly bookingId: string;
  readonly country: string;
  readonly couponCode?: string;
  readonly currency: PaymentCurrency;
  readonly paymentMethod: PaymentMethod;
};

export type PaymentSnapshot = {
  readonly amountCents: number;
  readonly bookingId?: string;
  readonly checkoutUrl?: string;
  readonly createdAtIso?: string;
  readonly currency: PaymentCurrency;
  readonly couponCode?: string;
  readonly discountAmountCents?: number;
  readonly gateway: PaymentGateway;
  readonly gatewayPaymentId: string;
  readonly paymentId: string;
  readonly paymentMethod: PaymentMethod;
  readonly pixCopyPaste?: string;
  readonly pixQrCode?: string;
  readonly status: PaymentStatus;
  readonly originalAmountCents?: number;
  readonly updatedAtIso?: string;
};

type GetPaymentStatusInput = {
  readonly paymentId: string;
};

function demoGatewayFor(input: CreatePaymentInput): PaymentGateway {
  return input.currency === 'BRL' && input.country.toUpperCase() === 'BR'
    ? 'mercado_pago'
    : 'stripe';
}

export function canUseRemotePaymentService(): boolean {
  return hasFirebaseConfig();
}

export async function createRemotePayment(input: CreatePaymentInput): Promise<PaymentSnapshot> {
  const { functions } = getFirebaseServices();
  const createPayment = httpsCallable<CreatePaymentInput, PaymentSnapshot>(
    functions,
    'createPayment',
  );
  const response = await createPayment(input);

  return response.data;
}

export async function fetchRemotePaymentStatus(paymentId: string): Promise<PaymentSnapshot> {
  const { functions } = getFirebaseServices();
  const getPaymentStatus = httpsCallable<GetPaymentStatusInput, PaymentSnapshot>(
    functions,
    'getPaymentStatus',
  );
  const response = await getPaymentStatus({ paymentId });

  return response.data;
}

export async function listRemotePayments(): Promise<readonly PaymentSnapshot[]> {
  const { functions } = getFirebaseServices();
  const listUserPayments = httpsCallable<undefined, readonly PaymentSnapshot[]>(
    functions,
    'listUserPayments',
  );
  const response = await listUserPayments(undefined);

  return response.data;
}

export function createDemoPayment(
  input: CreatePaymentInput,
  booking: Booking,
  tour: Tour,
): PaymentSnapshot {
  const gateway = demoGatewayFor(input);
  const paymentId = `local-payment-${Date.now().toString(36)}`;
  const { amountCents: originalAmountCents } = calculateBookingPaymentAmount(
    booking,
    tour,
    input.currency,
  );
  const normalizedCouponCode = input.couponCode ? normalizeCouponCode(input.couponCode) : undefined;
  const coupon = normalizedCouponCode
    ? INITIAL_COUPONS.find((item) => item.code === normalizedCouponCode)
    : undefined;
  const couponResult = coupon
    ? validateCoupon({
        amountCents: originalAmountCents,
        coupon,
        currency: input.currency,
        tourId: tour.id,
      })
    : undefined;

  if (normalizedCouponCode && (!coupon || !couponResult?.valid)) {
    throw new Error('O cupom informado nao e valido para esta reserva.');
  }

  const amountCents = couponResult?.valid ? couponResult.finalAmountCents : originalAmountCents;

  return {
    amountCents,
    bookingId: booking.id,
    checkoutUrl:
      input.paymentMethod === 'card' || input.paymentMethod === 'checkout'
        ? `https://sandbox.conexaofavela.local/payments/${paymentId}`
        : undefined,
    createdAtIso: new Date().toISOString(),
    currency: input.currency,
    couponCode: normalizedCouponCode,
    discountAmountCents: couponResult?.valid ? couponResult.discountAmountCents : undefined,
    gateway,
    gatewayPaymentId: `demo_${paymentId}`,
    paymentId,
    paymentMethod: input.paymentMethod,
    pixCopyPaste:
      input.paymentMethod === 'pix'
        ? `00020101021226880014br.gov.bcb.pix0136${paymentId}520400005303986540${(amountCents / 100).toFixed(2)}5802BR5908CONEXAO6009RIODEJANEIRO62070503***6304DEMO`
        : undefined,
    pixQrCode: input.paymentMethod === 'pix' ? `demo-qr:${paymentId}` : undefined,
    status: 'pending',
    originalAmountCents,
    updatedAtIso: new Date().toISOString(),
  };
}
