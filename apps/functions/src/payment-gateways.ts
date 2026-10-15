import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
import type { PaymentCurrency, PaymentGateway, PaymentMethod, PaymentStatus } from './payments.js';

export type GatewayPaymentRequest = {
  readonly amountCents: number;
  readonly country: string;
  readonly currency: PaymentCurrency;
  readonly customerEmail?: string;
  readonly description: string;
  readonly gateway: PaymentGateway;
  readonly idempotencyKey: string;
  readonly paymentId: string;
  readonly paymentMethod: PaymentMethod;
};

export type GatewayPaymentResult = {
  readonly checkoutUrl?: string;
  readonly gatewayPaymentId: string;
  readonly pixCopyPaste?: string;
  readonly pixQrCode?: string;
  readonly status: PaymentStatus;
};

export type GatewayWebhookResult = {
  readonly amountCents?: number;
  readonly currency?: PaymentCurrency;
  readonly eventId: string;
  readonly gateway: PaymentGateway;
  readonly gatewayPaymentId?: string;
  readonly localPaymentId?: string;
  readonly status: PaymentStatus;
};

type MercadoPagoPaymentDetails = {
  readonly amountCents?: number;
  readonly currency?: PaymentCurrency;
  readonly externalReference?: string;
  readonly id: string;
  readonly status: PaymentStatus;
};

const MERCADO_PAGO_API_BASE_URL = 'https://api.mercadopago.com';
const STRIPE_API_BASE_URL = 'https://api.stripe.com/v1';

function normalizeMercadoPagoStatus(status: string): PaymentStatus {
  switch (status) {
    case 'approved':
      return 'approved';
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

function normalizeStripeEventStatus(
  eventType: string,
  paymentStatus: string | undefined,
): PaymentStatus {
  switch (eventType) {
    case 'checkout.session.completed':
      return paymentStatus === 'paid' ? 'approved' : 'pending';
    case 'payment_intent.succeeded':
      return 'approved';
    case 'checkout.session.async_payment_failed':
    case 'payment_intent.payment_failed':
      return 'rejected';
    case 'checkout.session.expired':
      return 'expired';
    case 'charge.refunded':
      return 'refunded';
    case 'charge.dispute.created':
      return 'chargeback';
    default:
      return 'pending';
  }
}

function normalizeGatewayCurrency(value: unknown): PaymentCurrency | undefined {
  const normalized = typeof value === 'string' ? value.toUpperCase() : '';

  return normalized === 'BRL' || normalized === 'USD' || normalized === 'EUR'
    ? normalized
    : undefined;
}

function majorUnitToCents(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? Math.round(value * 100) : undefined;
}

function readMinorUnitAmount(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined;
}

function requiredEnv(name: string): string | null {
  const value = process.env[name];

  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function paymentsEnvironment(): string {
  return requiredEnv('PAYMENTS_ENV') ?? 'sandbox';
}

function shouldUseDemoGateway(gateway: PaymentGateway): boolean {
  if (gateway === 'demo') {
    return true;
  }

  if (paymentsEnvironment() === 'production') {
    return false;
  }

  return gateway === 'mercado_pago'
    ? !requiredEnv('MERCADO_PAGO_ACCESS_TOKEN')
    : !requiredEnv('STRIPE_SECRET_KEY');
}

function moneyToMajorUnit(amountCents: number): number {
  return amountCents / 100;
}

function timingSafeStringEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function signatureTimestampIsFresh(value: string, toleranceSeconds = 300): boolean {
  const rawTimestamp = Number(value);

  if (!Number.isFinite(rawTimestamp)) {
    return false;
  }

  const timestampSeconds = rawTimestamp > 10_000_000_000 ? rawTimestamp / 1000 : rawTimestamp;
  const nowSeconds = Date.now() / 1000;

  return Math.abs(nowSeconds - timestampSeconds) <= toleranceSeconds;
}

function parseSignatureHeader(header: string | undefined): Readonly<Record<string, string>> {
  if (!header) {
    return {};
  }

  return Object.fromEntries(
    header.split(',').map((part) => {
      const [key, ...valueParts] = part.split('=');

      return [key?.trim() ?? '', valueParts.join('=').trim()];
    }),
  );
}

function paymentReturnUrl(kind: 'cancel' | 'success', paymentId: string): string {
  const fallback = `conexaofavela://payment-return/${kind}?paymentId=${encodeURIComponent(paymentId)}`;
  const rawUrl = requiredEnv(kind === 'success' ? 'PAYMENTS_SUCCESS_URL' : 'PAYMENTS_CANCEL_URL');

  if (!rawUrl) {
    return fallback;
  }

  return rawUrl.replace('{PAYMENT_ID}', encodeURIComponent(paymentId));
}

function webhookUrl(gateway: PaymentGateway): string | undefined {
  const baseUrl = requiredEnv('PAYMENTS_WEBHOOK_BASE_URL');

  return baseUrl ? `${baseUrl.replace(/\/$/, '')}/paymentsWebhook?gateway=${gateway}` : undefined;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  const body = (await response.json()) as unknown;

  if (!response.ok) {
    throw new Error(`Gateway request failed: ${JSON.stringify(body)}`);
  }

  return body as T;
}

function createDemoPayment(request: GatewayPaymentRequest): GatewayPaymentResult {
  return {
    checkoutUrl: `https://sandbox.conexaofavela.local/payments/${request.paymentId}`,
    gatewayPaymentId: `demo_${request.paymentId}`,
    pixCopyPaste:
      request.paymentMethod === 'pix'
        ? `00020126580014br.gov.bcb.pix0136${request.paymentId}520400005303986540${moneyToMajorUnit(request.amountCents).toFixed(2)}5802BR5908CONEXAO6009RIODEJANEIRO62070503***6304DEMO`
        : undefined,
    pixQrCode: request.paymentMethod === 'pix' ? `demo-qr:${request.paymentId}` : undefined,
    status: 'pending',
  };
}

async function createMercadoPagoPayment(
  request: GatewayPaymentRequest,
): Promise<GatewayPaymentResult> {
  const accessToken = requiredEnv('MERCADO_PAGO_ACCESS_TOKEN');

  if (!accessToken) {
    throw new Error('MERCADO_PAGO_ACCESS_TOKEN is required for Mercado Pago payments.');
  }

  if (request.paymentMethod === 'pix') {
    const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}/v1/payments`, {
      body: JSON.stringify({
        description: request.description,
        external_reference: request.paymentId,
        notification_url: webhookUrl('mercado_pago'),
        payer: {
          email: request.customerEmail ?? 'comprador@conexaofavela.local',
        },
        payment_method_id: 'pix',
        transaction_amount: moneyToMajorUnit(request.amountCents),
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': request.idempotencyKey,
      },
      method: 'POST',
    });
    const data = await readJsonResponse<{
      readonly id?: number | string;
      readonly point_of_interaction?: {
        readonly transaction_data?: {
          readonly qr_code?: string;
          readonly qr_code_base64?: string;
        };
      };
      readonly status?: string;
    }>(response);
    const gatewayPaymentId = String(data.id ?? '');

    if (!gatewayPaymentId) {
      throw new Error('Mercado Pago did not return a payment id.');
    }

    return {
      gatewayPaymentId,
      pixCopyPaste: data.point_of_interaction?.transaction_data?.qr_code,
      pixQrCode: data.point_of_interaction?.transaction_data?.qr_code_base64,
      status: normalizeMercadoPagoStatus(data.status ?? 'pending'),
    };
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}/checkout/preferences`, {
    body: JSON.stringify({
      back_urls: {
        failure: paymentReturnUrl('cancel', request.paymentId),
        pending: paymentReturnUrl('success', request.paymentId),
        success: paymentReturnUrl('success', request.paymentId),
      },
      external_reference: request.paymentId,
      items: [
        {
          currency_id: request.currency,
          description: request.description,
          quantity: 1,
          title: request.description,
          unit_price: moneyToMajorUnit(request.amountCents),
        },
      ],
      notification_url: webhookUrl('mercado_pago'),
      payment_methods: {
        excluded_payment_types: request.paymentMethod === 'boleto' ? [] : [{ id: 'ticket' }],
      },
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': request.idempotencyKey,
    },
    method: 'POST',
  });
  const data = await readJsonResponse<{
    readonly id?: string;
    readonly init_point?: string;
    readonly sandbox_init_point?: string;
  }>(response);

  if (!data.id) {
    throw new Error('Mercado Pago did not return a checkout preference id.');
  }

  return {
    checkoutUrl: paymentsEnvironment() === 'production' ? data.init_point : data.sandbox_init_point,
    gatewayPaymentId: data.id,
    status: 'pending',
  };
}

async function createStripePayment(request: GatewayPaymentRequest): Promise<GatewayPaymentResult> {
  const secretKey = requiredEnv('STRIPE_SECRET_KEY');

  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY is required for Stripe payments.');
  }

  const form = new URLSearchParams();
  form.set('mode', 'payment');
  form.set('client_reference_id', request.paymentId);
  form.set('success_url', paymentReturnUrl('success', request.paymentId));
  form.set('cancel_url', paymentReturnUrl('cancel', request.paymentId));
  form.set('line_items[0][quantity]', '1');
  form.set('line_items[0][price_data][currency]', request.currency.toLowerCase());
  form.set('line_items[0][price_data][unit_amount]', request.amountCents.toString());
  form.set('line_items[0][price_data][product_data][name]', request.description);
  form.set('metadata[paymentId]', request.paymentId);
  form.set('payment_intent_data[metadata][paymentId]', request.paymentId);

  if (request.customerEmail) {
    form.set('customer_email', request.customerEmail);
  }

  const response = await fetch(`${STRIPE_API_BASE_URL}/checkout/sessions`, {
    body: form,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': request.idempotencyKey,
    },
    method: 'POST',
  });
  const data = await readJsonResponse<{ readonly id?: string; readonly url?: string }>(response);

  if (!data.id || !data.url) {
    throw new Error('Stripe did not return a checkout session.');
  }

  return {
    checkoutUrl: data.url,
    gatewayPaymentId: data.id,
    status: 'pending',
  };
}

export async function createGatewayPayment(
  request: GatewayPaymentRequest,
): Promise<GatewayPaymentResult> {
  if (shouldUseDemoGateway(request.gateway)) {
    return createDemoPayment(request);
  }

  return request.gateway === 'mercado_pago'
    ? createMercadoPagoPayment(request)
    : createStripePayment(request);
}

export function verifyMercadoPagoSignature(input: {
  readonly dataId: string | undefined;
  readonly requestId: string | undefined;
  readonly signatureHeader: string | undefined;
}): boolean {
  const secret = requiredEnv('MERCADO_PAGO_WEBHOOK_SECRET');

  if (!secret) {
    return paymentsEnvironment() !== 'production';
  }

  const parts = parseSignatureHeader(input.signatureHeader);
  const timestamp = parts.ts;
  const expected = parts.v1;

  if (!timestamp || !expected || !signatureTimestampIsFresh(timestamp)) {
    return false;
  }

  const templateParts = [
    input.dataId ? `id:${input.dataId.toLowerCase()};` : '',
    input.requestId ? `request-id:${input.requestId};` : '',
    `ts:${timestamp};`,
  ];
  const signature = createHmac('sha256', secret).update(templateParts.join('')).digest('hex');

  return timingSafeStringEqual(signature, expected);
}

export function verifyStripeSignature(input: {
  readonly rawBody: string;
  readonly signatureHeader: string | undefined;
}): boolean {
  const secret = requiredEnv('STRIPE_WEBHOOK_SECRET');

  if (!secret) {
    return paymentsEnvironment() !== 'production';
  }

  const parts = parseSignatureHeader(input.signatureHeader);
  const timestamp = parts.t;
  const expected = parts.v1;

  if (!timestamp || !expected || !signatureTimestampIsFresh(timestamp)) {
    return false;
  }

  const payload = `${timestamp}.${input.rawBody}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');

  return timingSafeStringEqual(signature, expected);
}

export async function fetchMercadoPagoPaymentDetails(
  gatewayPaymentId: string,
): Promise<MercadoPagoPaymentDetails> {
  const accessToken = requiredEnv('MERCADO_PAGO_ACCESS_TOKEN');

  if (!accessToken) {
    return {
      amountCents: undefined,
      currency: undefined,
      id: gatewayPaymentId,
      status: 'pending',
    };
  }

  const response = await fetch(`${MERCADO_PAGO_API_BASE_URL}/v1/payments/${gatewayPaymentId}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await readJsonResponse<{
    readonly currency_id?: string;
    readonly external_reference?: string;
    readonly id?: string | number;
    readonly status?: string;
    readonly transaction_amount?: number;
  }>(response);

  return {
    amountCents: majorUnitToCents(data.transaction_amount),
    currency: normalizeGatewayCurrency(data.currency_id),
    externalReference: data.external_reference,
    id: String(data.id ?? gatewayPaymentId),
    status: normalizeMercadoPagoStatus(data.status ?? 'pending'),
  };
}

function readStringRecord(value: unknown): Readonly<Record<string, string>> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export async function parseGatewayWebhook(input: {
  readonly gateway: PaymentGateway;
  readonly rawBody: string;
  readonly requestId?: string;
  readonly signatureHeader?: string;
  readonly queryDataId?: string;
}): Promise<GatewayWebhookResult> {
  if (input.gateway === 'demo') {
    return {
      eventId: `demo:${randomUUID()}`,
      gateway: 'demo',
      status: 'pending',
    };
  }

  if (input.gateway === 'mercado_pago') {
    const body = JSON.parse(input.rawBody) as {
      readonly data?: { readonly id?: string | number };
      readonly id?: string | number;
      readonly type?: string;
    };
    const gatewayPaymentId = String(input.queryDataId ?? body.data?.id ?? body.id ?? '');

    if (
      !verifyMercadoPagoSignature({
        dataId: gatewayPaymentId,
        requestId: input.requestId,
        signatureHeader: input.signatureHeader,
      })
    ) {
      throw new Error('Invalid Mercado Pago webhook signature.');
    }

    const details: MercadoPagoPaymentDetails = gatewayPaymentId
      ? await fetchMercadoPagoPaymentDetails(gatewayPaymentId)
      : { id: randomUUID(), status: 'pending' };

    return {
      amountCents: details.amountCents,
      currency: details.currency,
      eventId: `mercado_pago:${String(body.id ?? input.requestId ?? gatewayPaymentId)}`,
      gateway: 'mercado_pago',
      gatewayPaymentId: details.id,
      localPaymentId: details.externalReference,
      status: details.status,
    };
  }

  if (!verifyStripeSignature({ rawBody: input.rawBody, signatureHeader: input.signatureHeader })) {
    throw new Error('Invalid Stripe webhook signature.');
  }

  const body = JSON.parse(input.rawBody) as {
    readonly data?: {
      readonly object?: {
        readonly amount?: number;
        readonly amount_received?: number;
        readonly amount_total?: number;
        readonly client_reference_id?: string;
        readonly currency?: string;
        readonly id?: string;
        readonly metadata?: unknown;
        readonly payment_status?: string;
        readonly payment_intent?: string;
      };
    };
    readonly id?: string;
    readonly type?: string;
  };
  const eventType = body.type ?? 'unknown';
  const object = body.data?.object ?? {};
  const metadata = readStringRecord(object.metadata);
  const amountCents =
    readMinorUnitAmount(object.amount_total) ??
    readMinorUnitAmount(object.amount_received) ??
    readMinorUnitAmount(object.amount);

  return {
    amountCents,
    currency: normalizeGatewayCurrency(object.currency),
    eventId: `stripe:${body.id ?? randomUUID()}`,
    gateway: 'stripe',
    gatewayPaymentId: object.id ?? object.payment_intent,
    localPaymentId: metadata.paymentId ?? object.client_reference_id,
    status: normalizeStripeEventStatus(eventType, object.payment_status),
  };
}
