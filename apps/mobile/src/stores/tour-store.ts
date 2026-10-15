import AsyncStorage from '@react-native-async-storage/async-storage';
import { buildTourFromDraft, type Tour, type TourDraftInput } from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type TourState = {
  readonly localDrafts: readonly Tour[];
  readonly createLocalDraft: (input: TourDraftInput) => Tour;
  readonly resetLocalDrafts: () => void;
  readonly upsertLocalDraft: (tour: Tour) => void;
};

type PersistedTourState = Pick<TourState, 'localDrafts'>;

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      localDrafts: [],
      createLocalDraft: (input) => {
        const tour = buildTourFromDraft(input, {
          id: `local-tour-${Date.now().toString(36)}`,
        });

        set((state) => ({ localDrafts: [tour, ...state.localDrafts] }));
        return tour;
      },
      resetLocalDrafts: () => set({ localDrafts: [] }),
      upsertLocalDraft: (tour) => {
        set((state) => ({
          localDrafts: state.localDrafts.some((item) => item.id === tour.id)
            ? state.localDrafts.map((item) => (item.id === tour.id ? tour : item))
            : [tour, ...state.localDrafts],
        }));
      },
    }),
    {
      name: 'conexao-favela:tour-drafts:v1',
      partialize: (state): PersistedTourState => ({
        localDrafts: state.localDrafts,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
