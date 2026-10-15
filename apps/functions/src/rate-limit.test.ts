import { describe, expect, it } from 'vitest';
import { buildRateLimitDecision, rateLimitDocumentId } from './rate-limit.js';

describe('callable rate limiting', () => {
  it('starts and increments a window up to the configured limit', () => {
    const startedAt = new Date('2026-06-20T12:00:00.000Z');
    const first = buildRateLimitDecision(null, {
      maxAttempts: 2,
      now: startedAt,
      windowMs: 60_000,
    });
    const second = buildRateLimitDecision(first.nextState, {
      maxAttempts: 2,
      now: new Date('2026-06-20T12:00:10.000Z'),
      windowMs: 60_000,
    });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
    expect(second.nextState.count).toBe(2);
  });

  it('rejects excess attempts and reports retry time', () => {
    const decision = buildRateLimitDecision(
      { count: 2, windowStartedAt: new Date('2026-06-20T12:00:00.000Z') },
      {
        maxAttempts: 2,
        now: new Date('2026-06-20T12:00:15.000Z'),
        windowMs: 60_000,
      },
    );

    expect(decision.allowed).toBe(false);
    expect(decision.retryAfterSeconds).toBe(45);
  });

  it('resets an expired window and hashes the storage key', () => {
    const decision = buildRateLimitDecision(
      { count: 10, windowStartedAt: new Date('2026-06-20T12:00:00.000Z') },
      {
        maxAttempts: 2,
        now: new Date('2026-06-20T12:01:00.000Z'),
        windowMs: 60_000,
      },
    );

    expect(decision.nextState.count).toBe(1);
    expect(rateLimitDocumentId('user-1', 'create_payment')).toHaveLength(64);
  });
});
