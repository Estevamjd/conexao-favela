import { describe, expect, it } from 'vitest';
import {
  buildExpoPushMessages,
  parsePushRegistrationInput,
  pushTokenDocumentId,
} from './push-notifications.js';

const token = 'ExponentPushToken[valid_token-123]';

describe('push notification contracts', () => {
  it('accepts only native Expo tokens and supported platforms', () => {
    expect(parsePushRegistrationInput({ platform: 'android', token })).toEqual({
      platform: 'android',
      token,
    });
    expect(() => parsePushRegistrationInput({ platform: 'web', token })).toThrow();
    expect(() => parsePushRegistrationInput({ platform: 'ios', token: 'not-a-token' })).toThrow();
  });

  it('creates a deterministic non-secret document id', () => {
    expect(pushTokenDocumentId(token)).toHaveLength(64);
    expect(pushTokenDocumentId(token)).toBe(pushTokenDocumentId(token));
    expect(pushTokenDocumentId(token)).not.toContain('ExponentPushToken');
  });

  it('localizes copy, deduplicates tokens and removes unsafe payload fields', () => {
    const messages = buildExpoPushMessages(
      {
        body: { en: 'Booking confirmed', pt: 'Reserva confirmada' },
        data: {
          bookingId: 'booking-1',
          communityId: 'community-1',
          privateNote: 'must-not-leave-firestore',
          tourId: 'tour-1',
        },
        title: { en: 'Ready', pt: 'Tudo certo' },
      },
      'en',
      [token, token, 'invalid'],
    );

    expect(messages).toEqual([
      {
        body: 'Booking confirmed',
        data: {
          bookingId: 'booking-1',
          communityId: 'community-1',
          tourId: 'tour-1',
        },
        sound: 'default',
        title: 'Ready',
        to: token,
      },
    ]);
  });
});
