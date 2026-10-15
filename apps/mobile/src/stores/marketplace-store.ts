import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  timestampFromDate,
  type MarketplaceInquiry,
  type MarketplaceItem,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  canUseRemoteMarketplace,
  createRemoteMarketplaceInquiry,
} from '@/services/marketplace-service';

type MarketplaceState = {
  readonly inquiries: readonly MarketplaceInquiry[];
  readonly sendInquiry: (
    item: MarketplaceItem,
    userId: string,
    message: string,
  ) => Promise<MarketplaceInquiry>;
};

export const useMarketplaceStore = create<MarketplaceState>()(
  persist(
    (set) => ({
      inquiries: [],
      sendInquiry: async (item, userId, message) => {
        const now = timestampFromDate(new Date());
        const id = canUseRemoteMarketplace()
          ? await createRemoteMarketplaceInquiry({ itemId: item.id, message })
          : `local-inquiry-${Date.now().toString(36)}`;
        const inquiry: MarketplaceInquiry = {
          communityId: item.communityId,
          createdAt: now,
          id,
          itemId: item.id,
          message: message.trim(),
          providerId: item.providerId,
          status: 'new',
          updatedAt: now,
          userId,
        };
        set((state) => ({ inquiries: [inquiry, ...state.inquiries] }));
        return inquiry;
      },
    }),
    {
      name: 'conexao-favela:marketplace:v1',
      partialize: (state) => ({ inquiries: state.inquiries }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
