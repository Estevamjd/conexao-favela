import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

type TourProgressState = {
  readonly currentStopByBooking: Readonly<Record<string, number>>;
  readonly advance: (bookingId: string, maximumIndex: number) => void;
  readonly reset: (bookingId: string) => void;
};

export const useTourProgressStore = create<TourProgressState>()(
  persist(
    (set) => ({
      advance: (bookingId, maximumIndex) =>
        set((state) => ({
          currentStopByBooking: {
            ...state.currentStopByBooking,
            [bookingId]: Math.min(maximumIndex, (state.currentStopByBooking[bookingId] ?? 0) + 1),
          },
        })),
      currentStopByBooking: {},
      reset: (bookingId) =>
        set((state) => {
          const currentStopByBooking = Object.fromEntries(
            Object.entries(state.currentStopByBooking).filter(([key]) => key !== bookingId),
          );
          return { currentStopByBooking };
        }),
    }),
    {
      name: 'conexao-favela:tour-progress:v1',
      partialize: (state) => ({ currentStopByBooking: state.currentStopByBooking }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
