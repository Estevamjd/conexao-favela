import type { Booking, Payment, PaymentCurrency, TourReview } from '../types';

export type GuideFinanceSummary = {
  readonly approvedBookingCount: number;
  readonly grossByCurrency: Readonly<Record<PaymentCurrency, number>>;
  readonly pendingByCurrency: Readonly<Record<PaymentCurrency, number>>;
  readonly refundedByCurrency: Readonly<Record<PaymentCurrency, number>>;
};

export type GuidePerformancePoint = {
  readonly completedTours: number;
  readonly label: string;
  readonly tourists: number;
};

const emptyCurrencyTotals = (): Record<PaymentCurrency, number> => ({ BRL: 0, EUR: 0, USD: 0 });

export function summarizeGuideFinance(input: {
  readonly bookings: readonly Booking[];
  readonly communityId: string;
  readonly guideId: string;
  readonly payments: readonly Payment[];
}): GuideFinanceSummary {
  const guideBookingIds = new Set(
    input.bookings
      .filter(
        (booking) => booking.communityId === input.communityId && booking.guideId === input.guideId,
      )
      .map((booking) => booking.id),
  );
  const guidePayments = input.payments.filter(
    (payment) => payment.bookingId && guideBookingIds.has(payment.bookingId),
  );
  const grossByCurrency = emptyCurrencyTotals();
  const pendingByCurrency = emptyCurrencyTotals();
  const refundedByCurrency = emptyCurrencyTotals();

  for (const payment of guidePayments) {
    if (payment.status === 'approved') grossByCurrency[payment.currency] += payment.amountCents;
    if (payment.status === 'pending') pendingByCurrency[payment.currency] += payment.amountCents;
    if (payment.status === 'refunded' || payment.status === 'chargeback') {
      refundedByCurrency[payment.currency] += payment.amountCents;
    }
  }

  return {
    approvedBookingCount: guidePayments.filter((payment) => payment.status === 'approved').length,
    grossByCurrency,
    pendingByCurrency,
    refundedByCurrency,
  };
}

export function buildGuidePerformanceSeries(input: {
  readonly bookings: readonly Booking[];
  readonly communityId: string;
  readonly guideId: string;
  readonly months?: number;
  readonly now?: Date;
}): readonly GuidePerformancePoint[] {
  const months = input.months ?? 6;
  const now = input.now ?? new Date();

  return Array.from({ length: months }, (_, index) => {
    const offset = months - index - 1;
    const start = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - offset + 1, 1);
    const bookings = input.bookings.filter((booking) => {
      const scheduledFor = booking.scheduledFor.toDate();
      return (
        booking.communityId === input.communityId &&
        booking.guideId === input.guideId &&
        booking.status === 'completed' &&
        scheduledFor >= start &&
        scheduledFor < end
      );
    });

    return {
      completedTours: bookings.length,
      label: start.toLocaleDateString('en', { month: 'short' }),
      tourists: bookings.reduce((total, booking) => total + booking.numberOfTourists, 0),
    };
  });
}

export function averageGuideRating(
  reviews: readonly TourReview[],
  guideId: string,
  communityId: string,
): number | null {
  const published = reviews.filter(
    (review) =>
      review.guideId === guideId &&
      review.communityId === communityId &&
      review.status === 'published',
  );

  return published.length > 0
    ? published.reduce((total, review) => total + review.rating, 0) / published.length
    : null;
}
