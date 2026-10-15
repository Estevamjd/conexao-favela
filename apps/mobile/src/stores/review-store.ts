import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildTourReview,
  INITIAL_REVIEWS,
  reviveTimestamp,
  type Booking,
  type SupportedLanguageCode,
  type TourReview,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { canUseRemoteExperienceService, submitRemoteReview } from '@/services/experience-service';

type ReviewState = {
  readonly localReviews: readonly TourReview[];
  readonly resetReviews: () => void;
  readonly submitReview: (input: {
    readonly booking: Booking;
    readonly comment: string;
    readonly language: SupportedLanguageCode;
    readonly photos: readonly string[];
    readonly rating: 1 | 2 | 3 | 4 | 5;
  }) => Promise<TourReview>;
};

type PersistedReviewState = Pick<ReviewState, 'localReviews'>;

function reviveReview(review: TourReview): TourReview {
  return {
    ...review,
    createdAt: reviveTimestamp(review.createdAt),
    updatedAt: reviveTimestamp(review.updatedAt),
  };
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      localReviews: INITIAL_REVIEWS,
      resetReviews: () => set({ localReviews: INITIAL_REVIEWS }),
      submitReview: async ({ booking, comment, language, photos, rating }) => {
        const existing = get().localReviews.find((review) => review.bookingId === booking.id);
        if (existing) return existing;

        const remoteReviewId =
          canUseRemoteExperienceService() && !booking.id.startsWith('local-booking-')
            ? await submitRemoteReview({
                bookingId: booking.id,
                comment,
                language,
                photos,
                rating,
              })
            : undefined;

        const review = buildTourReview({
          booking,
          comment,
          id: remoteReviewId ?? `local-review-${Date.now().toString(36)}`,
          language,
          photos,
          rating,
        });
        set((state) => ({ localReviews: [review, ...state.localReviews] }));
        return review;
      },
    }),
    {
      merge: (persisted, current) => {
        if (
          typeof persisted !== 'object' ||
          persisted === null ||
          !Array.isArray((persisted as { readonly localReviews?: unknown }).localReviews)
        ) {
          return current;
        }
        const state = persisted as PersistedReviewState;
        return { ...current, localReviews: state.localReviews.map(reviveReview) };
      },
      name: 'conexao-favela:reviews:v1',
      partialize: (state): PersistedReviewState => ({ localReviews: state.localReviews }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
