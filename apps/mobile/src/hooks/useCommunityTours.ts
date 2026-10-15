import { INITIAL_TOURS, filterToursByCommunity, type Tour } from '@conexao-favela/shared';
import { useQuery } from '@tanstack/react-query';
import {
  canUseFirestoreReads,
  fetchPublishedToursForCommunity,
} from '@/services/firestore-read-service';
import { useTourStore } from '@/stores/tour-store';
import { useOfflineStore } from '@/stores/offline-store';

function mergeToursById(tourGroups: readonly (readonly Tour[])[]): readonly Tour[] {
  const toursById = new Map<string, Tour>();

  for (const tours of tourGroups) {
    for (const tour of tours) {
      toursById.set(tour.id, tour);
    }
  }

  return [...toursById.values()];
}

export function useCommunityTours(communityId: string) {
  const localDrafts = useTourStore((state) => state.localDrafts);
  const offlinePack = useOfflineStore((state) =>
    state.packs.find((pack) => pack.communityId === communityId && pack.status === 'ready'),
  );
  const remoteEnabled = canUseFirestoreReads();
  const remoteToursQuery = useQuery({
    enabled: remoteEnabled,
    queryFn: () => fetchPublishedToursForCommunity(communityId),
    queryKey: ['community-tours', communityId],
  });
  const fallbackTours = filterToursByCommunity(INITIAL_TOURS, communityId);
  const remoteTours = remoteToursQuery.data ?? [];
  const baseTours =
    remoteTours.length > 0
      ? remoteTours
      : offlinePack?.tours.length
        ? offlinePack.tours
        : fallbackTours;
  const communityDrafts = localDrafts.filter((tour) => tour.communityId === communityId);

  return {
    ...remoteToursQuery,
    isRemoteEnabled: remoteEnabled,
    tours: mergeToursById([baseTours, communityDrafts]),
  };
}
