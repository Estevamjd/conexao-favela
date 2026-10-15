import { FIRESTORE_COLLECTIONS } from '@conexao-favela/firebase-config';
import type {
  AccessSubscriptionStatus,
  PaymentCurrency,
  PaymentGateway,
  PaymentMethod,
  PaymentPurpose,
  PaymentStatus,
} from '@conexao-favela/shared';
import {
  collection,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

export type AdminPaymentRow = {
  readonly amountCents: number;
  readonly bookingId?: string;
  readonly chargebackAt?: Date;
  readonly checkoutUrl?: string;
  readonly country: string;
  readonly couponCode?: string;
  readonly discountAmountCents?: number;
  readonly createdAt: Date;
  readonly currency: PaymentCurrency;
  readonly gateway: PaymentGateway;
  readonly gatewayPaymentId: string;
  readonly id: string;
  readonly paidAt?: Date;
  readonly paymentMethod: PaymentMethod;
  readonly planId?: string;
  readonly purpose: PaymentPurpose;
  readonly refundedAt?: Date;
  readonly status: PaymentStatus;
  readonly updatedAt: Date;
  readonly userId: string;
};

export type AdminAccessRow = {
  readonly bookingId?: string;
  readonly cancelledAt?: Date;
  readonly createdAt?: Date;
  readonly expiresAt?: Date;
  readonly gatewaySubscriptionId?: string;
  readonly id: string;
  readonly paymentId?: string;
  readonly planId: string;
  readonly renewsAt?: Date;
  readonly startsAt: Date;
  readonly status: AccessSubscriptionStatus;
  readonly updatedAt?: Date;
  readonly userId: string;
};

export type PaymentAdminRepository = {
  readonly subscribeToAccesses: (
    onNext: (accesses: readonly AdminAccessRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribeToPayments: (
    onNext: (payments: readonly AdminPaymentRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function isTimestampLike(value: unknown): value is { readonly toDate: () => unknown } {
  return isRecord(value) && typeof value.toDate === 'function';
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function readDate(value: unknown): Date | null {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value;
  }

  if (!isTimestampLike(value)) {
    return null;
  }

  const date = value.toDate();

  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

function readOptionalDate(value: unknown): Date | undefined {
  return readDate(value) ?? undefined;
}

function readPaymentStatus(value: unknown): PaymentStatus | null {
  return value === 'pending' ||
    value === 'approved' ||
    value === 'rejected' ||
    value === 'cancelled' ||
    value === 'refunded' ||
    value === 'chargeback' ||
    value === 'expired'
    ? value
    : null;
}

function readAccessStatus(value: unknown): AccessSubscriptionStatus | null {
  return value === 'active' ||
    value === 'cancelled' ||
    value === 'expired' ||
    value === 'failed_payment' ||
    value === 'pending' ||
    value === 'refunded' ||
    value === 'chargeback'
    ? value
    : null;
}

function readCurrency(value: unknown): PaymentCurrency | null {
  return value === 'BRL' || value === 'USD' || value === 'EUR' ? value : null;
}

function readGateway(value: unknown): PaymentGateway | null {
  return value === 'demo' || value === 'mercado_pago' || value === 'stripe' ? value : null;
}

function readPaymentMethod(value: unknown): PaymentMethod | null {
  return value === 'boleto' || value === 'card' || value === 'checkout' || value === 'pix'
    ? value
    : null;
}

function readPurpose(value: unknown): PaymentPurpose | null {
  return value === 'booking' || value === 'plan' ? value : null;
}

function sortPayments(payments: readonly AdminPaymentRow[]): readonly AdminPaymentRow[] {
  return [...payments].sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

function sortAccesses(accesses: readonly AdminAccessRow[]): readonly AdminAccessRow[] {
  return [...accesses].sort((left, right) => right.startsAt.getTime() - left.startsAt.getTime());
}

export function mapPaymentDocument(id: string, data: DocumentData): AdminPaymentRow | null {
  const record = data as Readonly<Record<string, unknown>>;
  const amountCents = readNumber(record.amountCents);
  const country = readString(record.country);
  const createdAt = readDate(record.createdAt);
  const currency = readCurrency(record.currency);
  const gateway = readGateway(record.gateway);
  const gatewayPaymentId = readString(record.gatewayPaymentId);
  const paymentMethod = readPaymentMethod(record.paymentMethod);
  const purpose = readPurpose(record.purpose);
  const status = readPaymentStatus(record.status);
  const updatedAt = readDate(record.updatedAt);
  const userId = readString(record.userId);

  if (
    amountCents === null ||
    !country ||
    !createdAt ||
    !currency ||
    !gateway ||
    !gatewayPaymentId ||
    !paymentMethod ||
    !purpose ||
    !status ||
    !updatedAt ||
    !userId
  ) {
    return null;
  }

  return {
    amountCents,
    bookingId: readString(record.bookingId) ?? undefined,
    chargebackAt: readOptionalDate(record.chargebackAt),
    checkoutUrl: readString(record.checkoutUrl) ?? undefined,
    country,
    couponCode: readString(record.couponCode) ?? undefined,
    createdAt,
    currency,
    gateway,
    gatewayPaymentId,
    id,
    discountAmountCents: readNumber(record.discountAmountCents) ?? undefined,
    paidAt: readOptionalDate(record.paidAt),
    paymentMethod,
    planId: readString(record.planId) ?? undefined,
    purpose,
    refundedAt: readOptionalDate(record.refundedAt),
    status,
    updatedAt,
    userId,
  };
}

export function mapAccessDocument(id: string, data: DocumentData): AdminAccessRow | null {
  const record = data as Readonly<Record<string, unknown>>;
  const planId = readString(record.planId);
  const startsAt = readDate(record.startsAt);
  const status = readAccessStatus(record.status);
  const userId = readString(record.userId);

  if (!planId || !startsAt || !status || !userId) {
    return null;
  }

  return {
    bookingId: readString(record.bookingId) ?? undefined,
    cancelledAt: readOptionalDate(record.cancelledAt),
    createdAt: readOptionalDate(record.createdAt),
    expiresAt: readOptionalDate(record.expiresAt),
    gatewaySubscriptionId: readString(record.gatewaySubscriptionId) ?? undefined,
    id,
    paymentId: readString(record.paymentId) ?? undefined,
    planId,
    renewsAt: readOptionalDate(record.renewsAt),
    startsAt,
    status,
    updatedAt: readOptionalDate(record.updatedAt),
    userId,
  };
}

export function createFirebasePaymentAdminRepository(db: Firestore): PaymentAdminRepository {
  return {
    subscribeToAccesses(onNext, onError) {
      const accessesQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.accesses),
        orderBy('startsAt', 'desc'),
        limit(100),
      );

      return onSnapshot(
        accessesQuery,
        (snapshot) => {
          const accesses = snapshot.docs
            .map((document) => mapAccessDocument(document.id, document.data()))
            .filter((access): access is AdminAccessRow => access !== null);

          onNext(sortAccesses(accesses));
        },
        onError,
      );
    },
    subscribeToPayments(onNext, onError) {
      const paymentsQuery = query(
        collection(db, FIRESTORE_COLLECTIONS.payments),
        orderBy('createdAt', 'desc'),
        limit(100),
      );

      return onSnapshot(
        paymentsQuery,
        (snapshot) => {
          const payments = snapshot.docs
            .map((document) => mapPaymentDocument(document.id, document.data()))
            .filter((payment): payment is AdminPaymentRow => payment !== null);

          onNext(sortPayments(payments));
        },
        onError,
      );
    },
  };
}

export const DEMO_ADMIN_PAYMENTS: readonly AdminPaymentRow[] = sortPayments([
  {
    amountCents: 16000,
    bookingId: 'local-booking-smoke',
    country: 'BR',
    createdAt: new Date('2026-06-15T13:40:00-03:00'),
    currency: 'BRL',
    gateway: 'mercado_pago',
    gatewayPaymentId: 'demo_mp_pix_approved',
    id: 'demo-payment-pix-approved',
    paidAt: new Date('2026-06-15T13:43:00-03:00'),
    paymentMethod: 'pix',
    purpose: 'booking',
    status: 'approved',
    updatedAt: new Date('2026-06-15T13:43:00-03:00'),
    userId: 'local-tourist-ana',
  },
  {
    amountCents: 3600,
    bookingId: 'demo-booking-usd',
    country: 'US',
    createdAt: new Date('2026-06-14T19:20:00-03:00'),
    currency: 'USD',
    gateway: 'stripe',
    gatewayPaymentId: 'cs_test_demo_card_pending',
    id: 'demo-payment-stripe-pending',
    paymentMethod: 'card',
    purpose: 'booking',
    status: 'pending',
    updatedAt: new Date('2026-06-14T19:20:00-03:00'),
    userId: 'local-tourist-maya',
  },
  {
    amountCents: 14000,
    bookingId: 'demo-booking-refunded',
    country: 'BR',
    createdAt: new Date('2026-06-10T10:05:00-03:00'),
    currency: 'BRL',
    gateway: 'mercado_pago',
    gatewayPaymentId: 'demo_mp_card_refunded',
    id: 'demo-payment-refunded',
    paidAt: new Date('2026-06-10T10:07:00-03:00'),
    paymentMethod: 'card',
    purpose: 'booking',
    refundedAt: new Date('2026-06-11T09:30:00-03:00'),
    status: 'refunded',
    updatedAt: new Date('2026-06-11T09:30:00-03:00'),
    userId: 'local-tourist-bruno',
  },
  {
    amountCents: 3200,
    bookingId: 'demo-booking-rejected',
    country: 'DE',
    createdAt: new Date('2026-06-08T16:15:00-03:00'),
    currency: 'EUR',
    gateway: 'stripe',
    gatewayPaymentId: 'cs_test_demo_card_rejected',
    id: 'demo-payment-rejected',
    paymentMethod: 'card',
    purpose: 'booking',
    status: 'rejected',
    updatedAt: new Date('2026-06-08T16:18:00-03:00'),
    userId: 'local-tourist-lena',
  },
]);

export const DEMO_ADMIN_ACCESSES: readonly AdminAccessRow[] = sortAccesses([
  {
    bookingId: 'local-booking-smoke',
    createdAt: new Date('2026-06-15T13:43:00-03:00'),
    id: 'booking_local-booking-smoke',
    paymentId: 'demo-payment-pix-approved',
    planId: 'tour-memorias-teleferico',
    startsAt: new Date('2026-06-15T13:43:00-03:00'),
    status: 'active',
    updatedAt: new Date('2026-06-15T13:43:00-03:00'),
    userId: 'local-tourist-ana',
  },
  {
    bookingId: 'demo-booking-usd',
    id: 'booking_demo-booking-usd',
    paymentId: 'demo-payment-stripe-pending',
    planId: 'tour-memorias-teleferico',
    startsAt: new Date('2026-06-14T19:20:00-03:00'),
    status: 'pending',
    userId: 'local-tourist-maya',
  },
  {
    bookingId: 'demo-booking-refunded',
    id: 'booking_demo-booking-refunded',
    paymentId: 'demo-payment-refunded',
    planId: 'tour-arte-becos',
    startsAt: new Date('2026-06-10T10:07:00-03:00'),
    status: 'refunded',
    updatedAt: new Date('2026-06-11T09:30:00-03:00'),
    userId: 'local-tourist-bruno',
  },
]);
