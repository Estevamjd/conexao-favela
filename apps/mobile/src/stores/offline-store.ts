import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildOfflineCommunityPack,
  reviveTimestamp,
  type OfflineCommunityPack,
  type PointOfInterest,
  type SupportedLanguageCode,
  type Tour,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type OfflineState = {
  readonly packs: readonly OfflineCommunityPack[];
  readonly downloadPack: (input: {
    readonly communityId: string;
    readonly languages: readonly SupportedLanguageCode[];
    readonly pois: readonly PointOfInterest[];
    readonly tours: readonly Tour[];
  }) => OfflineCommunityPack;
  readonly removePack: (communityId: string) => void;
};

type LegacyOfflinePack = Omit<OfflineCommunityPack, 'pois' | 'tours'> &
  Partial<Pick<OfflineCommunityPack, 'pois' | 'tours'>>;

function revivePack(pack: LegacyOfflinePack): OfflineCommunityPack {
  return {
    ...pack,
    downloadedAt: pack.downloadedAt ? reviveTimestamp(pack.downloadedAt) : undefined,
    updatedAt: reviveTimestamp(pack.updatedAt),
    pois: (pack.pois ?? []).map((poi) => ({
      ...poi,
      createdAt: poi.createdAt ? reviveTimestamp(poi.createdAt) : undefined,
    })),
    tours: (pack.tours ?? []).map((tour) => ({
      ...tour,
      createdAt: tour.createdAt ? reviveTimestamp(tour.createdAt) : undefined,
      schedule: {
        ...tour.schedule,
        specificDates: tour.schedule.specificDates?.map(reviveTimestamp),
      },
      updatedAt: tour.updatedAt ? reviveTimestamp(tour.updatedAt) : undefined,
    })),
  };
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      downloadPack: ({ communityId, languages, pois, tours }) => {
        const pack = buildOfflineCommunityPack({
          communityId,
          languageCodes: languages,
          pois,
          tours,
          version: 1,
        });
        set((state) => ({
          packs: [pack, ...state.packs.filter((item) => item.communityId !== communityId)],
        }));
        return pack;
      },
      packs: [],
      removePack: (communityId) =>
        set((state) => ({
          packs: state.packs.filter((item) => item.communityId !== communityId),
        })),
    }),
    {
      merge: (persisted, current) => {
        if (
          typeof persisted !== 'object' ||
          persisted === null ||
          !Array.isArray((persisted as { readonly packs?: unknown }).packs)
        ) {
          return current;
        }
        return {
          ...current,
          packs: (persisted as { readonly packs: readonly OfflineCommunityPack[] }).packs.map(
            revivePack,
          ),
        };
      },
      name: 'conexao-favela:offline:v1',
      partialize: (state) => ({ packs: state.packs }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
