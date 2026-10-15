import { describe, expect, it } from 'vitest';
import {
  assertParticipant,
  ExperienceActionError,
  nextReviewStats,
  parseModerateReviewRequest,
  parseMarkChatReadRequest,
  parseSendChatMessageRequest,
  parseSubmitReviewRequest,
} from './experience-actions.js';

describe('experience actions', () => {
  it('accepts bounded chat messages and rejects unknown fields', () => {
    expect(parseSendChatMessageRequest({ chatId: 'chat-1', text: 'Ola' })).toEqual({
      chatId: 'chat-1',
      text: 'Ola',
    });
    expect(() =>
      parseSendChatMessageRequest({ amountCents: 1, chatId: 'chat-1', text: 'Ola' }),
    ).toThrow(ExperienceActionError);
  });

  it('requires the authenticated user to be a participant', () => {
    expect(() => assertParticipant(['guide', 'tourist'], 'tourist')).not.toThrow();
    expect(() => assertParticipant(['guide', 'tourist'], 'other')).toThrow(ExperienceActionError);
  });

  it('validates chat read receipts without accepting extra fields', () => {
    expect(parseMarkChatReadRequest({ chatId: 'chat-1' })).toEqual({ chatId: 'chat-1' });
    expect(() => parseMarkChatReadRequest({ chatId: 'chat-1', userId: 'spoofed' })).toThrow(
      ExperienceActionError,
    );
  });

  it('updates review averages without trusting client aggregates', () => {
    expect(nextReviewStats(4, 2, 5)).toEqual({ averageRating: 13 / 3, totalReviews: 3 });
  });

  it('validates review payloads and photo limits', () => {
    const parsed = parseSubmitReviewRequest({
      bookingId: 'booking-1',
      comment: 'Experiencia muito bem conduzida.',
      language: 'pt',
      photoPaths: [],
      rating: 5,
    });
    expect(parsed.rating).toBe(5);
    expect(() => parseSubmitReviewRequest({ ...parsed, rating: 6 })).toThrow(ExperienceActionError);
  });

  it('restricts review moderation to supported final states', () => {
    expect(parseModerateReviewRequest({ reviewId: 'review-1', status: 'published' })).toEqual({
      reviewId: 'review-1',
      status: 'published',
    });
    expect(() =>
      parseModerateReviewRequest({ reviewId: 'review-1', status: 'pending_moderation' }),
    ).toThrow(ExperienceActionError);
  });
});
