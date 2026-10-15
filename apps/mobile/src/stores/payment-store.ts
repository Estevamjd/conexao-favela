import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Booking, Tour } from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  canUseRemotePaymentService,
  createDemoPayment,
  createRemotePayment,
  fetchRemotePaymentStatus,
  listRemotePayments,
  type CreatePaymentInput,
  type PaymentSnapshot,
} from '@/services/payment-service';
import { useBookingStore } from '@/stores/booking-store';

type PaymentState = {
  readonly localPayments: readonly PaymentSnapshot[];
  readonly approveLocalPayment: (paymentId: string) => void;
  readonly createPayment: (
    input: CreatePaymentInput,
    booking: Booking,
    tour: Tour,
  ) => Promise<PaymentSnapshot>;
  readonly refreshPayment: (paymentId: string) => Promise<PaymentSnapshot | null>;
  readonly syncPaymentHistory: () => Promise<void>;
};

type PersistedPaymentState = Pick<PaymentState, 'localPayments'>;

function upsertPayment(
  payments: readonly PaymentSnapshot[],
  payment: PaymentSnapshot,
): readonly PaymentSnapshot[] {
  return payments.some((item) => item.paymentId === payment.paymentId)
    ? payments.map((item) => (item.paymentId === payment.paymentId ? payment : item))
    : [payment, ...payments];
}

export const usePaymentStore = create<PaymentState>()(
  persist(
    (set, get) => ({
      localPayments: [],
      approveLocalPayment: (paymentId) => {
        const payment = get().localPayments.find((item) => item.paymentId === paymentId);

        if (!payment) {
          return;
        }

        const approvedPayment: PaymentSnapshot = {
          ...payment,
          status: 'approved',
          updatedAtIso: new Date().toISOString(),
        };

        set((state) => ({
          localPayments: upsertPayment(state.localPayments, approvedPayment),
        }));

        if (payment.bookingId) {
          useBookingStore.getState().confirmLocalBooking(payment.bookingId);
        }
      },
      createPayment: async (input, booking, tour) => {
        const payment = canUseRemotePaymentService()
          ? await createRemotePayment(input)
          : createDemoPayment(input, booking, tour);

        set((state) => ({ localPayments: upsertPayment(state.localPayments, payment) }));

        return payment;
      },
      refreshPayment: async (paymentId) => {
        const localPayment = get().localPayments.find((item) => item.paymentId === paymentId);

        if (!canUseRemotePaymentService()) {
          return localPayment ?? null;
        }

        const payment = await fetchRemotePaymentStatus(paymentId);

        set((state) => ({ localPayments: upsertPayment(state.localPayments, payment) }));

        return payment;
      },
      syncPaymentHistory: async () => {
        if (!canUseRemotePaymentService()) {
          return;
        }

        const payments = await listRemotePayments();

        set((state) => ({
          localPayments: payments.reduce(upsertPayment, state.localPayments),
        }));
      },
    }),
    {
      name: 'conexao-favela:payments:v1',
      partialize: (state): PersistedPaymentState => ({
        localPayments: state.localPayments,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
