import { describe, expect, it } from 'vitest';
import { getNextOnboardingIndex, isLastOnboardingSlide } from './onboarding-flow';

describe('onboarding flow helpers', () => {
  it('detects the final slide without relying on slide labels', () => {
    expect(isLastOnboardingSlide(0, 3)).toBe(false);
    expect(isLastOnboardingSlide(2, 3)).toBe(true);
    expect(isLastOnboardingSlide(4, 3)).toBe(true);
  });

  it('advances while keeping the index inside bounds', () => {
    expect(getNextOnboardingIndex(0, 3)).toBe(1);
    expect(getNextOnboardingIndex(2, 3)).toBe(2);
    expect(getNextOnboardingIndex(0, 0)).toBe(0);
  });
});
