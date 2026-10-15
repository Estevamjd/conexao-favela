import { describe, expect, it } from 'vitest';
import { MarketplaceActionError, parseMarketplaceInquiryRequest } from './marketplace-actions.js';

describe('marketplace inquiry actions', () => {
  it('accepts a bounded message without trusting provider or community ids', () => {
    expect(
      parseMarketplaceInquiryRequest({
        itemId: 'community-lunch',
        message: 'Gostaria de saber a disponibilidade para sabado.',
      }),
    ).toEqual({
      itemId: 'community-lunch',
      message: 'Gostaria de saber a disponibilidade para sabado.',
    });
  });

  it('rejects spoofed ownership fields', () => {
    expect(() =>
      parseMarketplaceInquiryRequest({
        itemId: 'community-lunch',
        message: 'Gostaria de saber a disponibilidade para sabado.',
        providerId: 'spoofed',
      }),
    ).toThrow(MarketplaceActionError);
  });
});
