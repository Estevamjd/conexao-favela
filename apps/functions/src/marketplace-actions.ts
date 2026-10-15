export type MarketplaceInquiryRequest = {
  readonly itemId: string;
  readonly message: string;
};

export class MarketplaceActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketplaceActionError';
  }
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function boundedText(value: unknown, minimum: number, maximum: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return text.length >= minimum && text.length <= maximum ? text : null;
}

export function parseMarketplaceInquiryRequest(data: unknown): MarketplaceInquiryRequest {
  if (!isRecord(data) || Object.keys(data).some((key) => key !== 'itemId' && key !== 'message')) {
    throw new MarketplaceActionError('Marketplace inquiry payload is invalid.');
  }
  const itemId = boundedText(data.itemId, 1, 180);
  const message = boundedText(data.message, 10, 1000);
  if (!itemId || !message) {
    throw new MarketplaceActionError('Marketplace inquiry payload is invalid.');
  }
  return { itemId, message };
}
