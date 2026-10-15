import type { SupportedLanguageCode } from '../languages';
import type { Booking, TourReview } from '../types';
import { timestampFromDate } from './timestamps';

export type ReviewSummary = {
  readonly averageRating: number | null;
  readonly ratingCounts: Readonly<Record<1 | 2 | 3 | 4 | 5, number>>;
  readonly totalReviews: number;
};

export function canReviewBooking(booking: Pick<Booking, 'reviewId' | 'status'>): boolean {
  return booking.status === 'completed' && !booking.reviewId;
}

export function buildTourReview(input: {
  readonly booking: Pick<Booking, 'communityId' | 'guideId' | 'id' | 'tourId' | 'touristId'>;
  readonly comment: string;
  readonly id: string;
  readonly language: SupportedLanguageCode;
  readonly photos?: readonly string[];
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly now?: Date;
}): TourReview {
  const timestamp = timestampFromDate(input.now ?? new Date());

  return {
    bookingId: input.booking.id,
    comment: { pt: input.comment.trim(), [input.language]: input.comment.trim() },
    communityId: input.booking.communityId,
    createdAt: timestamp,
    guideId: input.booking.guideId,
    id: input.id,
    photos: input.photos ?? [],
    rating: input.rating,
    status: 'published',
    tourId: input.booking.tourId,
    touristId: input.booking.touristId,
    updatedAt: timestamp,
  };
}

export function summarizeReviews(reviews: readonly TourReview[]): ReviewSummary {
  const published = reviews.filter((review) => review.status === 'published');
  const ratingCounts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };

  for (const review of published) {
    ratingCounts[review.rating] += 1;
  }

  return {
    averageRating:
      published.length > 0
        ? published.reduce((total, review) => total + review.rating, 0) / published.length
        : null,
    ratingCounts,
    totalReviews: published.length,
  };
}
