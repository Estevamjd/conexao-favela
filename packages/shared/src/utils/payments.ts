import type {
  Booking,
  MoneyAmount,
  PaymentCurrency,
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  Tour,
} from '../types';

export const PAYMENT_STATUS_ORDER: readonly PaymentStatus[] = [
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'chargeback',
  'expired',
] as const;

export class PaymentDomainError extends Error {
  constructor(
    readonly code:
      | 'invalid_amount'
      | 'invalid_currency'
      | 'invalid_method'
      | 'invalid_status'
      | 'not_bookable',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

function brlToCents(value: number): number {
  return Math.round(value * 100);
}

export function resolveTourPricePerPerson(
  tour: Pick<Tour, 'paymentPrices' | 'pricing'>,
  currency: PaymentCurrency,
): MoneyAmount {
  const fixedPrice = tour.paymentPrices?.[currency];

  if (fixedPrice) {
    return fixedPrice;
  }

  // The legacy MVP model stores BRL prices in reais. Keeping this fallback
  // lets old tours stay payable while newer tours can provide fixed USD/EUR.
  if (currency === 'BRL') {
    return {
      amountCents: tour.pricing.type === 'free' ? 0 : brlToCents(tour.pricing.minPrice),
      currency: 'BRL',
    };
  }

  throw new PaymentDomainError(
    'invalid_currency',
    `Tour does not have a fixed ${currency} payment price.`,
  );
}

export function calculateBookingPaymentAmount(
  booking: Pick<Booking, 'numberOfTourists' | 'status'>,
  tour: Pick<Tour, 'paymentPrices' | 'pricing' | 'status'>,
  currency: PaymentCurrency,
): MoneyAmount {
  if (tour.status !== 'published') {
    throw new PaymentDomainError('not_bookable', 'Tour is not available for payment.');
  }

  if (booking.status !== 'pending') {
    throw new PaymentDomainError('invalid_status', 'Only pending bookings can be paid.');
  }

  const pricePerPerson = resolveTourPricePerPerson(tour, currency);
  const amountCents = pricePerPerson.amountCents * booking.numberOfTourists;

  if (!Number.isInteger(amountCents) || amountCents < 0) {
    throw new PaymentDomainError('invalid_amount', 'Calculated payment amount is invalid.');
  }

  return { amountCents, currency };
}

export function selectPaymentGateway(
  country: string,
  currency: PaymentCurrency,
  paymentMethod: PaymentMethod,
): PaymentGateway {
  const normalizedCountry = country.trim().toUpperCase();

  if (currency === 'BRL' && normalizedCountry === 'BR') {
    return 'mercado_pago';
  }

  if (paymentMethod === 'pix' || paymentMethod === 'boleto') {
    throw new PaymentDomainError(
      'invalid_method',
      `${paymentMethod} is only available for Brazilian BRL payments.`,
    );
  }

  return 'stripe';
}

export function grantsPaidAccess(status: PaymentStatus): boolean {
  return status === 'approved';
}

export function revokesPaidAccess(status: PaymentStatus): boolean {
  return status === 'chargeback' || status === 'refunded' || status === 'expired';
}

export function normalizeMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'approved';
    case 'authorized':
    case 'in_mediation':
    case 'in_process':
    case 'pending':
      return 'pending';
    case 'cancelled':
      return 'cancelled';
    case 'charged_back':
      return 'chargeback';
    case 'refunded':
      return 'refunded';
    case 'rejected':
      return 'rejected';
    default:
      return 'pending';
  }
}

export function normalizeStripeEventStatus(eventType: string): PaymentStatus {
  switch (eventType) {
    case 'checkout.session.completed':
    case 'payment_intent.succeeded':
      return 'approved';
    case 'checkout.session.async_payment_failed':
    case 'payment_intent.payment_failed':
      return 'rejected';
    case 'checkout.session.expired':
      return 'expired';
    case 'charge.refunded':
    case 'refund.updated':
      return 'refunded';
    case 'charge.dispute.created':
      return 'chargeback';
    default:
      return 'pending';
  }
}
