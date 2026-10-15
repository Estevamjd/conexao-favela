import { createHash } from 'node:crypto';

export type RateLimitState = {
  readonly count: number;
  readonly windowStartedAt: Date;
};

export type RateLimitDecision = {
  readonly allowed: boolean;
  readonly nextState: RateLimitState;
  readonly retryAfterSeconds: number;
};

export function rateLimitDocumentId(userId: string, action: string): string {
  return createHash('sha256').update(`${userId}:${action}`).digest('hex');
}

export function buildRateLimitDecision(
  current: RateLimitState | null,
  options: {
    readonly maxAttempts: number;
    readonly now: Date;
    readonly windowMs: number;
  },
): RateLimitDecision {
  const { maxAttempts, now, windowMs } = options;

  if (!current || now.getTime() - current.windowStartedAt.getTime() >= windowMs) {
    return {
      allowed: true,
      nextState: { count: 1, windowStartedAt: now },
      retryAfterSeconds: 0,
    };
  }

  const windowEndsAt = current.windowStartedAt.getTime() + windowMs;
  const retryAfterSeconds = Math.max(Math.ceil((windowEndsAt - now.getTime()) / 1000), 1);

  if (current.count >= maxAttempts) {
    return {
      allowed: false,
      nextState: current,
      retryAfterSeconds,
    };
  }

  return {
    allowed: true,
    nextState: {
      count: current.count + 1,
      windowStartedAt: current.windowStartedAt,
    },
    retryAfterSeconds: 0,
  };
}
