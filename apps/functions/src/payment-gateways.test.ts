import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { parseGatewayWebhook, verifyStripeSignature } from './payment-gateways.js';

const previousEnvironment = process.env.PAYMENTS_ENV;
const previousStripeSecret = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  process.env.PAYMENTS_ENV = previousEnvironment;
  process.env.STRIPE_WEBHOOK_SECRET = previousStripeSecret;
});

describe('payment gateway webhooks', () => {
  it('approves a paid Stripe checkout with matching server metadata', async () => {
    process.env.PAYMENTS_ENV = 'sandbox';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const result = await parseGatewayWebhook({
      gateway: 'stripe',
      rawBody: JSON.stringify({
        data: {
          object: {
            amount_total: 3600,
            currency: 'usd',
            id: 'cs_test_paid',
            metadata: { paymentId: 'payment-1' },
            payment_status: 'paid',
          },
        },
        id: 'evt-paid',
        type: 'checkout.session.completed',
      }),
    });

    expect(result).toMatchObject({
      amountCents: 3600,
      currency: 'USD',
      localPaymentId: 'payment-1',
      status: 'approved',
    });
  });

  it('keeps an unpaid completed checkout pending', async () => {
    process.env.PAYMENTS_ENV = 'sandbox';
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const result = await parseGatewayWebhook({
      gateway: 'stripe',
      rawBody: JSON.stringify({
        data: {
          object: {
            amount_total: 3600,
            currency: 'usd',
            id: 'cs_test_unpaid',
            metadata: { paymentId: 'payment-1' },
            payment_status: 'unpaid',
          },
        },
        id: 'evt-unpaid',
        type: 'checkout.session.completed',
      }),
    });

    expect(result.status).toBe('pending');
  });

  it('rejects signed Stripe payloads outside the replay tolerance', () => {
    process.env.PAYMENTS_ENV = 'production';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const rawBody = '{"id":"evt-old"}';
    const timestamp = Math.floor(Date.now() / 1000) - 3600;
    const signature = createHmac('sha256', 'whsec_test')
      .update(`${timestamp.toString()}.${rawBody}`)
      .digest('hex');

    expect(
      verifyStripeSignature({
        rawBody,
        signatureHeader: `t=${timestamp.toString()},v1=${signature}`,
      }),
    ).toBe(false);
  });
});
