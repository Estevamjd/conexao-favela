import {
  INITIAL_PUBLIC_GUIDES,
  filterPublicGuidesByCommunity,
  type PublicGuide,
} from '@conexao-favela/shared';
import { useQuery } from '@tanstack/react-query';
import {
  canUseFirestoreReads,
  fetchPublicGuidesForCommunity,
} from '@/services/firestore-read-service';

function mergeGuidesById(guideGroups: readonly (readonly PublicGuide[])[]): readonly PublicGuide[] {
  const guidesById = new Map<string, PublicGuide>();

  for (const guides of guideGroups) {
    for (const guide of guides) {
      guidesById.set(guide.id, guide);
    }
  }

  return [...guidesById.values()];
}

export function useCommunityGuides(communityId: string) {
  const remoteEnabled = canUseFirestoreReads();
  const remoteGuidesQuery = useQuery({
    enabled: remoteEnabled,
    queryFn: () => fetchPublicGuidesForCommunity(communityId),
    queryKey: ['community-guides', communityId],
  });
  const fallbackGuides = filterPublicGuidesByCommunity(INITIAL_PUBLIC_GUIDES, communityId);
  const remoteGuides = remoteGuidesQuery.data ?? [];
  const baseGuides = remoteGuides.length > 0 ? remoteGuides : fallbackGuides;

  return {
    ...remoteGuidesQuery,
    guides: mergeGuidesById([baseGuides]),
    isRemoteEnabled: remoteEnabled,
  };
}
