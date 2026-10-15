import { INITIAL_MARKETPLACE_ITEMS } from '@conexao-favela/shared';
import { useQuery } from '@tanstack/react-query';
import {
  canUseFirestoreReads,
  fetchPublishedMarketplaceItems,
} from '@/services/firestore-read-service';

export function useMarketplaceItems(communityId: string) {
  const remoteEnabled = canUseFirestoreReads();
  const queryResult = useQuery({
    enabled: remoteEnabled,
    queryFn: () => fetchPublishedMarketplaceItems(communityId),
    queryKey: ['marketplace-items', communityId],
  });
  return {
    ...queryResult,
    items:
      queryResult.data ??
      INITIAL_MARKETPLACE_ITEMS.filter(
        (item) => item.communityId === communityId && item.status === 'published',
      ),
  };
}
