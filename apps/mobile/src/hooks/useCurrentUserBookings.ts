import type { Booking } from '@conexao-favela/shared';
import { useQuery } from '@tanstack/react-query';
import { canUseFirestoreReads, fetchBookingsForUser } from '@/services/firestore-read-service';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';

function mergeBookingsById(
  remoteBookings: readonly Booking[],
  localBookings: readonly Booking[],
): readonly Booking[] {
  const bookingsById = new Map<string, Booking>();

  for (const booking of localBookings) {
    bookingsById.set(booking.id, booking);
  }

  for (const booking of remoteBookings) {
    bookingsById.set(booking.id, booking);
  }

  return [...bookingsById.values()].sort(
    (first, second) => first.scheduledFor.seconds - second.scheduledFor.seconds,
  );
}

export function useCurrentUserBookings() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const localBookings = useBookingStore((state) => state.localBookings);
  const remoteEnabled = canUseFirestoreReads() && Boolean(currentUser?.uid);
  const remoteBookingsQuery = useQuery({
    enabled: remoteEnabled,
    queryFn: () => fetchBookingsForUser(currentUser?.uid ?? ''),
    queryKey: ['current-user-bookings', currentUser?.uid ?? 'anonymous'],
  });
  const remoteBookings = remoteBookingsQuery.data ?? [];

  return {
    ...remoteBookingsQuery,
    bookings: mergeBookingsById(remoteBookings, localBookings),
    isRemoteEnabled: remoteEnabled,
  };
}
