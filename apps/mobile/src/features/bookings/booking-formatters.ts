import type { Booking, CurrencyCode, SupportedLanguageCode } from '@conexao-favela/shared';

export type BookingStatusTranslationKey =
  | 'statusCancelled'
  | 'statusCompleted'
  | 'statusConfirmed'
  | 'statusInProgress'
  | 'statusNoShow'
  | 'statusPending';

const localeByLanguage: Record<SupportedLanguageCode, string> = {
  de: 'de-DE',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  ja: 'ja-JP',
  pt: 'pt-BR',
  zh: 'zh-CN',
};

export function resolveBookingStatusKey(
  booking: Pick<Booking, 'status'>,
): BookingStatusTranslationKey {
  if (booking.status === 'cancelled') {
    return 'statusCancelled';
  }

  if (booking.status === 'completed') {
    return 'statusCompleted';
  }

  if (booking.status === 'in_progress') {
    return 'statusInProgress';
  }

  if (booking.status === 'confirmed') {
    return 'statusConfirmed';
  }

  if (booking.status === 'no_show') {
    return 'statusNoShow';
  }

  return 'statusPending';
}

export function shouldContinueBookingPayment(
  booking: Pick<Booking, 'payment' | 'status'>,
): boolean {
  return booking.status === 'pending' && booking.payment?.status !== 'approved';
}

export function formatBookingDate(date: Date, language: SupportedLanguageCode): string {
  return new Intl.DateTimeFormat(localeByLanguage[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function formatBookingPrice(
  amount: number,
  currency: Extract<CurrencyCode, 'BRL'>,
  language: SupportedLanguageCode,
): string {
  return new Intl.NumberFormat(localeByLanguage[language], {
    currency,
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(amount);
}
