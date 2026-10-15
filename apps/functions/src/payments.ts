export type PaymentCurrency = 'BRL' | 'EUR' | 'USD';

export type PaymentStatus =
  | 'approved'
  | 'cancelled'
  | 'chargeback'
  | 'expired'
  | 'pending'
  | 'refunded'
  | 'rejected';

const allowedPaymentTransitions: Readonly<Record<PaymentStatus, readonly PaymentStatus[]>> = {
  approved: ['refunded', 'chargeback'],
  cancelled: [],
  chargeback: [],
  expired: [],
  pending: ['approved', 'rejected', 'cancelled', 'refunded', 'chargeback', 'expired'],
  refunded: ['chargeback'],
  rejected: [],
};

export function resolvePaymentStatusTransition(
  currentStatus: PaymentStatus,
  incomingStatus: PaymentStatus,
): PaymentStatus {
  return allowedPaymentTransitions[currentStatus].includes(incomingStatus)
    ? incomingStatus
    : currentStatus;
}

export type PaymentGateway = 'demo' | 'mercado_pago' | 'stripe';

export type PaymentMethod = 'boleto' | 'card' | 'checkout' | 'pix';

export type CreatePaymentRequestInput = {
  readonly bookingId: string;
  readonly country: string;
  readonly currency: PaymentCurrency;
  readonly paymentMethod: PaymentMethod;
  readonly couponCode?: string;
};

export type GetPaymentStatusRequestInput = {
  readonly paymentId: string;
};

export type FunctionBookingForPayment = {
  readonly communityId: string;
  readonly guideId: string;
  readonly id: string;
  readonly numberOfTourists: number;
  readonly payment?: {
    readonly paymentId: string;
    readonly status: PaymentStatus;
  };
  readonly status: 'cancelled' | 'completed' | 'confirmed' | 'in_progress' | 'no_show' | 'pending';
  readonly touristId: string;
  readonly tourId: string;
};

export type FunctionTourForPayment = {
  readonly id: string;
  readonly paymentPrices?: Partial<
    Readonly<
      Record<PaymentCurrency, { readonly amountCents: number; readonly currency: PaymentCurrency }>
    >
  >;
  readonly pricing: {
    readonly currency: 'BRL';
    readonly maxPrice: number;
    readonly minPrice: number;
    readonly type: 'fixed' | 'free' | 'range';
  };
  readonly status: 'archived' | 'draft' | 'paused' | 'published';
};

export type FunctionPaymentForRead = {
  readonly amountCents: number;
  readonly bookingId?: string;
  readonly checkoutUrl?: string;
  readonly couponId?: string;
  readonly couponCode?: string;
  readonly couponRedemptionId?: string;
  readonly discountAmountCents?: number;
  readonly country: string;
  readonly currency: PaymentCurrency;
  readonly gateway: PaymentGateway;
  readonly gatewayPaymentId: string;
  readonly id: string;
  readonly paymentMethod: PaymentMethod;
  readonly originalAmountCents?: number;
  readonly pixCopyPaste?: string;
  readonly pixQrCode?: string;
  readonly purpose: 'booking';
  readonly status: PaymentStatus;
  readonly userId: string;
  readonly createdAtIso?: string;
  readonly updatedAtIso?: string;
};

export type PaymentCreationPlan = {
  readonly payment: {
    readonly amountCents: number;
    readonly bookingId: string;
    readonly country: string;
    readonly currency: PaymentCurrency;
    readonly gateway: PaymentGateway;
    readonly gatewayPaymentId: string;
    readonly id: string;
    readonly paymentMethod: PaymentMethod;
    readonly purpose: 'booking';
    readonly status: 'pending';
    readonly tourId: string;
    readonly userId: string;
  };
  readonly response: {
    readonly amountCents: number;
    readonly currency: PaymentCurrency;
    readonly gateway: PaymentGateway;
    readonly paymentId: string;
    readonly paymentMethod: PaymentMethod;
    readonly status: 'pending';
  };
};

export class PaymentPlanError extends Error {
  constructor(
    readonly code:
      | 'already_paid'
      | 'invalid_booking'
      | 'invalid_payload'
      | 'invalid_payment'
      | 'permission_denied',
    message: string,
  ) {
    super(message);
    this.name = 'PaymentPlanError';
  }
}

class PaymentDomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PaymentDomainError';
  }
}

function brlToCents(value: number): number {
  return Math.round(value * 100);
}

function calculateBookingPaymentAmount(
  booking: Pick<FunctionBookingForPayment, 'numberOfTourists' | 'status'>,
  tour: FunctionTourForPayment,
  currency: PaymentCurrency,
) {
  if (tour.status !== 'published') {
    throw new PaymentDomainError('Tour is not available for payment.');
  }

  if (booking.status !== 'pending') {
    throw new PaymentDomainError('Only pending bookings can be paid.');
  }

  const fixedPrice = tour.paymentPrices?.[currency];
  const pricePerPerson =
    fixedPrice ??
    (currency === 'BRL'
      ? {
          amountCents: tour.pricing.type === 'free' ? 0 : brlToCents(tour.pricing.minPrice),
          currency: 'BRL' as const,
        }
      : null);

  if (!pricePerPerson) {
    throw new PaymentDomainError(`Tour does not have a fixed ${currency} payment price.`);
  }

  return {
    amountCents: pricePerPerson.amountCents * booking.numberOfTourists,
    currency,
  };
}

function selectPaymentGateway(
  country: string,
  currency: PaymentCurrency,
  paymentMethod: PaymentMethod,
): PaymentGateway {
  if (currency === 'BRL' && country.toUpperCase() === 'BR') {
    return 'mercado_pago';
  }

  if (paymentMethod === 'pix' || paymentMethod === 'boleto') {
    throw new PaymentDomainError(`${paymentMethod} is only available for Brazilian BRL payments.`);
  }

  return 'stripe';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isTimestampLike(value: unknown): value is { readonly toDate: () => unknown } {
  return isRecord(value) && typeof value.toDate === 'function';
}

function readDateIso(value: unknown): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return value.toISOString();
  }

  if (!isTimestampLike(value)) {
    return undefined;
  }

  const date = value.toDate();

  return date instanceof Date && Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
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

function readBookingStatus(value: unknown): FunctionBookingForPayment['status'] | null {
  return value === 'cancelled' ||
    value === 'completed' ||
    value === 'confirmed' ||
    value === 'in_progress' ||
    value === 'no_show' ||
    value === 'pending'
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

function readTourStatus(value: unknown): FunctionTourForPayment['status'] | null {
  return value === 'draft' || value === 'published' || value === 'paused' || value === 'archived'
    ? value
    : null;
}

function readPaymentPrices(value: unknown): FunctionTourForPayment['paymentPrices'] {
  if (!isRecord(value)) {
    return undefined;
  }

  return (['BRL', 'USD', 'EUR'] as const).reduce<FunctionTourForPayment['paymentPrices']>(
    (prices, currency) => {
      const entry = isRecord(value[currency]) ? value[currency] : null;
      const amountCents = readNumber(entry?.amountCents);

      if (amountCents === null || !Number.isInteger(amountCents) || amountCents < 0) {
        return prices;
      }

      return {
        ...prices,
        [currency]: {
          amountCents,
          currency,
        },
      };
    },
    {},
  );
}

export function parseCreatePaymentRequest(data: unknown): CreatePaymentRequestInput {
  if (!isRecord(data)) {
    throw new PaymentPlanError('invalid_payload', 'Payment payload is invalid.');
  }

  const keys = Object.keys(data);
  const allowedKeys = ['bookingId', 'country', 'couponCode', 'currency', 'paymentMethod'];

  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new PaymentPlanError('invalid_payload', 'Payment payload is invalid.');
  }

  const bookingId = readString(data.bookingId);
  const country = readString(data.country)?.toUpperCase();
  const currency = readCurrency(data.currency);
  const paymentMethod = readPaymentMethod(data.paymentMethod);
  const couponCode =
    data.couponCode === undefined ? undefined : readString(data.couponCode)?.toUpperCase();

  if (
    !bookingId ||
    country?.length !== 2 ||
    !currency ||
    !paymentMethod ||
    (data.couponCode !== undefined && (!couponCode || couponCode.length > 32))
  ) {
    throw new PaymentPlanError('invalid_payload', 'Payment payload is invalid.');
  }

  return { bookingId, country, couponCode, currency, paymentMethod };
}

export function parseGetPaymentStatusRequest(data: unknown): GetPaymentStatusRequestInput {
  if (!isRecord(data)) {
    throw new PaymentPlanError('invalid_payload', 'Payment status payload is invalid.');
  }

  const keys = Object.keys(data);
  const allowedKeys = ['paymentId'];

  if (keys.some((key) => !allowedKeys.includes(key))) {
    throw new PaymentPlanError('invalid_payload', 'Payment status payload is invalid.');
  }

  const paymentId = readString(data.paymentId);

  if (!paymentId) {
    throw new PaymentPlanError('invalid_payload', 'Payment status payload is invalid.');
  }

  return { paymentId };
}

export function mapBookingForPayment(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionBookingForPayment | null {
  const touristId = readString(data.touristId);
  const guideId = readString(data.guideId);
  const tourId = readString(data.tourId);
  const communityId = readString(data.communityId);
  const numberOfTourists = readNumber(data.numberOfTourists);
  const status = readBookingStatus(data.status);
  const payment = isRecord(data.payment) ? data.payment : null;
  const paymentId = readString(payment?.paymentId);
  const paymentStatus = readPaymentStatus(payment?.status);

  if (
    !touristId ||
    !guideId ||
    !tourId ||
    !communityId ||
    numberOfTourists === null ||
    !Number.isInteger(numberOfTourists) ||
    !status
  ) {
    return null;
  }

  return {
    communityId,
    guideId,
    id,
    numberOfTourists,
    status,
    touristId,
    tourId,
    ...(paymentId && paymentStatus ? { payment: { paymentId, status: paymentStatus } } : {}),
  };
}

export function mapTourForPayment(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionTourForPayment | null {
  const pricing = isRecord(data.pricing) ? data.pricing : null;
  const pricingType = pricing?.type;
  const minPrice = readNumber(pricing?.minPrice);
  const maxPrice = readNumber(pricing?.maxPrice);
  const status = readTourStatus(data.status);

  if (
    (pricingType !== 'fixed' && pricingType !== 'range' && pricingType !== 'free') ||
    minPrice === null ||
    maxPrice === null ||
    pricing?.currency !== 'BRL' ||
    !status
  ) {
    return null;
  }

  return {
    id,
    paymentPrices: readPaymentPrices(data.paymentPrices),
    pricing: {
      currency: 'BRL',
      maxPrice,
      minPrice,
      type: pricingType,
    },
    status,
  };
}

export function mapPaymentForRead(
  id: string,
  data: Readonly<Record<string, unknown>>,
): FunctionPaymentForRead | null {
  const amountCents = readNumber(data.amountCents);
  const country = readString(data.country);
  const currency = readCurrency(data.currency);
  const gateway = readGateway(data.gateway);
  const gatewayPaymentId = readString(data.gatewayPaymentId);
  const paymentMethod = readPaymentMethod(data.paymentMethod);
  const purpose = data.purpose;
  const status = readPaymentStatus(data.status);
  const userId = readString(data.userId);

  if (
    amountCents === null ||
    !country ||
    !currency ||
    !gateway ||
    !gatewayPaymentId ||
    !paymentMethod ||
    purpose !== 'booking' ||
    !status ||
    !userId
  ) {
    return null;
  }

  return {
    amountCents,
    bookingId: readString(data.bookingId) ?? undefined,
    checkoutUrl: readString(data.checkoutUrl) ?? undefined,
    couponId: readString(data.couponId) ?? undefined,
    couponCode: readString(data.couponCode) ?? undefined,
    couponRedemptionId: readString(data.couponRedemptionId) ?? undefined,
    country,
    createdAtIso: readDateIso(data.createdAt),
    currency,
    discountAmountCents: readNumber(data.discountAmountCents) ?? undefined,
    gateway,
    gatewayPaymentId,
    id,
    paymentMethod,
    originalAmountCents: readNumber(data.originalAmountCents) ?? undefined,
    pixCopyPaste: readString(data.pixCopyPaste) ?? undefined,
    pixQrCode: readString(data.pixQrCode) ?? undefined,
    purpose,
    status,
    updatedAtIso: readDateIso(data.updatedAt),
    userId,
  };
}

export function buildPaymentCreationPlan(
  input: CreatePaymentRequestInput,
  booking: FunctionBookingForPayment,
  tour: FunctionTourForPayment,
  options: {
    readonly paymentId: string;
    readonly userId: string;
  },
): PaymentCreationPlan {
  if (booking.id !== input.bookingId || booking.touristId !== options.userId) {
    throw new PaymentPlanError('permission_denied', 'Only the booking tourist can pay.');
  }

  if (booking.payment?.status === 'approved') {
    throw new PaymentPlanError('already_paid', 'Booking is already paid.');
  }

  try {
    const amount = calculateBookingPaymentAmount(booking, tour, input.currency);
    const gateway = selectPaymentGateway(input.country, input.currency, input.paymentMethod);

    return {
      payment: {
        amountCents: amount.amountCents,
        bookingId: booking.id,
        country: input.country,
        currency: amount.currency,
        gateway,
        gatewayPaymentId: `pending:${options.paymentId}`,
        id: options.paymentId,
        paymentMethod: input.paymentMethod,
        purpose: 'booking',
        status: 'pending',
        tourId: booking.tourId,
        userId: options.userId,
      },
      response: {
        amountCents: amount.amountCents,
        currency: amount.currency,
        gateway,
        paymentId: options.paymentId,
        paymentMethod: input.paymentMethod,
        status: 'pending',
      },
    };
  } catch (error: unknown) {
    if (error instanceof PaymentDomainError) {
      throw new PaymentPlanError('invalid_payment', error.message);
    }

    throw error;
  }
}
