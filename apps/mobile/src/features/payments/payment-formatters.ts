import type {
  PaymentGateway,
  PaymentMethod,
  PaymentStatus,
  SupportedLanguageCode,
} from '@conexao-favela/shared';

export function formatPaymentAmount(
  amountCents: number,
  currency: string,
  language: SupportedLanguageCode,
): string {
  return new Intl.NumberFormat(language, {
    currency,
    style: 'currency',
  }).format(amountCents / 100);
}

export function paymentStatusKey(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    approved: 'statusApproved',
    cancelled: 'statusCancelled',
    chargeback: 'statusChargeback',
    expired: 'statusExpired',
    pending: 'statusPending',
    refunded: 'statusRefunded',
    rejected: 'statusRejected',
  };

  return labels[status];
}

export function paymentMethodKey(method: PaymentMethod): string {
  return method;
}

export function formatGateway(gateway: PaymentGateway): string {
  if (gateway === 'mercado_pago') {
    return 'Mercado Pago';
  }

  if (gateway === 'stripe') {
    return 'Stripe';
  }

  return 'Demo';
}
