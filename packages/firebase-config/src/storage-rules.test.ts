import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const storageRules = readFileSync(
  new URL('../../../firebase/storage.rules', import.meta.url),
  'utf8',
);

describe('Storage security policy', () => {
  it('keeps pending review media private and publishes it only after moderation', () => {
    const reviewMediaRule =
      /match \/review-media\/{userId}\/{bookingId}\/{fileName} \{([\s\S]*?)\n    \}/.exec(
        storageRules,
      )?.[1];

    expect(reviewMediaRule).toBeDefined();
    expect(reviewMediaRule).not.toContain('allow read: if true');
    expect(reviewMediaRule).toContain('isBookingParticipant(bookingId)');
    expect(reviewMediaRule).toContain('isPublishedReview(bookingId)');
    expect(storageRules).toContain("data.status == 'published'");
  });

  it('allows tour media uploads only for verified guides', () => {
    const tourMediaRule = /match \/tour-media\/{guideId}\/{fileName} \{([\s\S]*?)\n    \}/.exec(
      storageRules,
    )?.[1];

    expect(tourMediaRule).toBeDefined();
    expect(tourMediaRule).toContain('allow create, update: if isVerifiedGuide(guideId)');
  });
});
