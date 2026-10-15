import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  isFavoriteTourRecord,
  toggleFavoriteTour,
  type FavoriteTourInput,
  type FavoriteTourRecord,
} from '@/features/favorites/favorite-tours';

type FavoriteState = {
  readonly favoriteTours: readonly FavoriteTourRecord[];
  readonly resetFavoriteTours: () => void;
  readonly toggleFavoriteTour: (input: FavoriteTourInput) => void;
};

type PersistedFavoriteState = Pick<FavoriteState, 'favoriteTours'>;

function isPersistedFavoriteState(value: unknown): value is PersistedFavoriteState {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { readonly favoriteTours?: unknown }).favoriteTours)
  );
}

export const useFavoriteStore = create<FavoriteState>()(
  persist(
    (set) => ({
      favoriteTours: [],
      resetFavoriteTours: () => set({ favoriteTours: [] }),
      toggleFavoriteTour: (input) =>
        set((state) => ({
          favoriteTours: toggleFavoriteTour(state.favoriteTours, input),
        })),
    }),
    {
      merge: (persistedState, currentState) => {
        if (!isPersistedFavoriteState(persistedState)) {
          return currentState;
        }

        return {
          ...currentState,
          favoriteTours: persistedState.favoriteTours.filter(isFavoriteTourRecord),
        };
      },
      name: 'conexao-favela:favorites:v1',
      partialize: (state): PersistedFavoriteState => ({
        favoriteTours: state.favoriteTours,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
