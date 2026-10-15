import type { TourReview } from '@conexao-favela/shared';
import { useEffect, useMemo, useState } from 'react';
import { subscribeGuideReviews, subscribeTourReviews } from '@/services/experience-read-service';
import { useReviewStore } from '@/stores/review-store';

function mergeReviews(remote: readonly TourReview[], local: readonly TourReview[]) {
  const values = new Map<string, TourReview>();
  for (const review of local) values.set(review.id, review);
  for (const review of remote) values.set(review.id, review);
  return [...values.values()].sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
}

export function useGuideReviews(guideId: string) {
  const local = useReviewStore((state) => state.localReviews);
  const [remote, setRemote] = useState<readonly TourReview[]>([]);
  useEffect(() => subscribeGuideReviews(guideId, setRemote), [guideId]);
  return useMemo(
    () =>
      mergeReviews(
        remote,
        local.filter((review) => review.guideId === guideId),
      ),
    [guideId, local, remote],
  );
}

export function useTourReviews(tourId: string | undefined) {
  const local = useReviewStore((state) => state.localReviews);
  const [remote, setRemote] = useState<readonly TourReview[]>([]);
  useEffect(() => {
    if (!tourId) return undefined;
    return subscribeTourReviews(tourId, setRemote);
  }, [tourId]);
  return useMemo(
    () =>
      mergeReviews(
        remote,
        local.filter((review) => review.tourId === tourId),
      ),
    [local, remote, tourId],
  );
}
