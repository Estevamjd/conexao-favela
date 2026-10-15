export const ONBOARDING_SLIDE_KEYS = ['culture', 'guides', 'safety'] as const;

export type OnboardingSlideKey = (typeof ONBOARDING_SLIDE_KEYS)[number];

export function isLastOnboardingSlide(currentIndex: number, totalSlides: number): boolean {
  return currentIndex >= totalSlides - 1;
}

export function getNextOnboardingIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) {
    return 0;
  }

  return Math.min(currentIndex + 1, totalSlides - 1);
}
