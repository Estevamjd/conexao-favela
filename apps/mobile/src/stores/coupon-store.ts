import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PaymentCurrency } from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type AppliedCoupon = {
  readonly bookingId: string;
  readonly code: string;
  readonly currency: PaymentCurrency;
  readonly discountAmountCents: number;
  readonly finalAmountCents: number;
};

type CouponState = {
  readonly appliedCoupons: readonly AppliedCoupon[];
  readonly applyCoupon: (coupon: AppliedCoupon) => void;
  readonly clearCoupon: (bookingId: string) => void;
};

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      appliedCoupons: [],
      applyCoupon: (coupon) =>
        set((state) => ({
          appliedCoupons: [
            coupon,
            ...state.appliedCoupons.filter((item) => item.bookingId !== coupon.bookingId),
          ],
        })),
      clearCoupon: (bookingId) =>
        set((state) => ({
          appliedCoupons: state.appliedCoupons.filter((item) => item.bookingId !== bookingId),
        })),
    }),
    {
      name: 'conexao-favela:coupons:v1',
      partialize: (state) => ({ appliedCoupons: state.appliedCoupons }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
