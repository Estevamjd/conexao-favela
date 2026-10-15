import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  buildBookingFromRequest,
  cancelBooking as cancelBookingLocally,
  checkInBooking as checkInBookingLocally,
  checkOutBooking as checkOutBookingLocally,
  confirmBooking as confirmBookingLocally,
  getBookingCancellationState,
  getBookingCheckInState,
  INITIAL_POIS,
  reviveBookingTimestamps,
  type Booking,
  type BookingCancellationActor,
  type BookingRequestInput,
  type NotificationDraftInput,
  type Tour,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  canUseRemoteBookingService,
  createRemoteBooking,
  updateRemoteBookingStatus,
} from '@/services/booking-service';
import { useNotificationStore } from '@/stores/notification-store';

type BookingState = {
  readonly localBookings: readonly Booking[];
  readonly cancelBooking: (
    bookingId: string,
    reason: string,
    cancelledBy?: BookingCancellationActor,
    sourceBooking?: Booking,
  ) => Promise<void>;
  readonly cancelLocalBooking: (
    bookingId: string,
    reason: string,
    cancelledBy?: BookingCancellationActor,
  ) => void;
  readonly checkInBooking: (bookingId: string, sourceBooking?: Booking) => Promise<void>;
  readonly checkInLocalBooking: (bookingId: string) => void;
  readonly checkOutBooking: (bookingId: string, sourceBooking?: Booking) => Promise<void>;
  readonly checkOutLocalBooking: (bookingId: string) => void;
  readonly confirmBooking: (bookingId: string, sourceBooking?: Booking) => Promise<void>;
  readonly confirmLocalBooking: (bookingId: string) => void;
  readonly createBooking: (input: BookingRequestInput, tour: Tour) => Promise<Booking>;
  readonly createLocalBooking: (input: BookingRequestInput, tour: Tour) => Booking;
  readonly resetLocalBookings: () => void;
};

type PersistedBookingState = Pick<BookingState, 'localBookings'>;

function isPersistedBookingState(value: unknown): value is PersistedBookingState {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { readonly localBookings?: unknown }).localBookings)
  );
}

function bookingMeetingPointLocation(booking: Booking) {
  return {
    lat: booking.meetingPoint.lat,
    lng: booking.meetingPoint.lng,
  };
}

function shouldUseRemoteBookingLifecycle(booking: Booking) {
  return canUseRemoteBookingService() && !booking.id.startsWith('local-booking-');
}

function upsertBooking(bookings: readonly Booking[], booking: Booking) {
  return bookings.some((item) => item.id === booking.id)
    ? bookings.map((item) => (item.id === booking.id ? booking : item))
    : [booking, ...bookings];
}

function buildBookingNotification(
  booking: Booking,
  type: NotificationDraftInput['type'],
  title: NotificationDraftInput['title'],
  body: NotificationDraftInput['body'],
  userId = booking.touristId,
): NotificationDraftInput {
  return {
    body,
    data: {
      bookingId: booking.id,
      communityId: booking.communityId,
      tourId: booking.tourId,
    },
    title,
    type,
    userId,
  };
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      localBookings: [],
      cancelBooking: async (bookingId, reason, cancelledBy = 'guide', sourceBooking) => {
        const booking = get().localBookings.find((item) => item.id === bookingId) ?? sourceBooking;

        if (!booking) {
          return;
        }

        if (shouldUseRemoteBookingLifecycle(booking)) {
          await updateRemoteBookingStatus({
            action: 'cancel',
            bookingId,
            reason,
          });
        }

        if (sourceBooking && !get().localBookings.some((item) => item.id === bookingId)) {
          set((state) => ({ localBookings: upsertBooking(state.localBookings, sourceBooking) }));
        }

        get().cancelLocalBooking(bookingId, reason, cancelledBy);
      },
      cancelLocalBooking: (bookingId, reason, cancelledBy = 'guide') => {
        const booking = get().localBookings.find((item) => item.id === bookingId);

        if (!booking) {
          return;
        }

        const cancellationState = getBookingCancellationState(booking, cancelledBy);

        if (!cancellationState.canCancel) {
          return;
        }

        const cancelledBooking = cancelBookingLocally(booking, {
          cancelledBy,
          reason,
        });
        const cancelledByTourist = cancelledBy === 'tourist';

        set((state) => ({
          localBookings: state.localBookings.map((item) =>
            item.id === bookingId ? cancelledBooking : item,
          ),
        }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            cancelledBooking,
            'booking_cancelled',
            {
              pt: cancelledByTourist ? 'Reserva cancelada pelo turista' : 'Reserva cancelada',
              en: cancelledByTourist ? 'Booking cancelled by traveler' : 'Booking cancelled',
              es: cancelledByTourist ? 'Reserva cancelada por el turista' : 'Reserva cancelada',
            },
            {
              pt: cancelledByTourist
                ? 'O turista cancelou a reserva dentro da politica do MVP local.'
                : 'O guia cancelou a reserva. Combine uma nova data pelo contato informado.',
              en: cancelledByTourist
                ? 'The traveler cancelled this booking within the local MVP policy.'
                : 'The guide cancelled this booking. Arrange a new date through the shared contact.',
              es: cancelledByTourist
                ? 'El turista cancelo esta reserva dentro de la politica del MVP local.'
                : 'El guia cancelo esta reserva. Coordina una nueva fecha por el contacto informado.',
            },
            cancelledByTourist ? cancelledBooking.guideId : cancelledBooking.touristId,
          ),
        );
      },
      checkInBooking: async (bookingId, sourceBooking) => {
        const booking = get().localBookings.find((item) => item.id === bookingId) ?? sourceBooking;

        if (!booking) {
          return;
        }

        if (shouldUseRemoteBookingLifecycle(booking)) {
          await updateRemoteBookingStatus({
            action: 'check_in',
            bookingId,
            location: bookingMeetingPointLocation(booking),
          });
        }

        if (sourceBooking && !get().localBookings.some((item) => item.id === bookingId)) {
          set((state) => ({ localBookings: upsertBooking(state.localBookings, sourceBooking) }));
        }

        get().checkInLocalBooking(bookingId);
      },
      checkInLocalBooking: (bookingId) => {
        const booking = get().localBookings.find((item) => item.id === bookingId);

        if (!booking || !getBookingCheckInState(booking).canCheckIn) {
          return;
        }

        const checkedInBooking = checkInBookingLocally(booking, {
          location: bookingMeetingPointLocation(booking),
        });

        set((state) => ({
          localBookings: state.localBookings.map((item) =>
            item.id === bookingId ? checkedInBooking : item,
          ),
        }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            checkedInBooking,
            'tour_reminder',
            {
              pt: 'Check-in registrado',
              en: 'Check-in registered',
              es: 'Check-in registrado',
            },
            {
              pt: 'O passeio foi iniciado e o ponto de encontro ficou registrado.',
              en: 'The tour has started and the meeting point was recorded.',
              es: 'El tour comenzo y el punto de encuentro quedo registrado.',
            },
          ),
        );
      },
      checkOutBooking: async (bookingId, sourceBooking) => {
        const booking = get().localBookings.find((item) => item.id === bookingId) ?? sourceBooking;

        if (!booking) {
          return;
        }

        if (shouldUseRemoteBookingLifecycle(booking)) {
          await updateRemoteBookingStatus({
            action: 'check_out',
            bookingId,
            location: bookingMeetingPointLocation(booking),
          });
        }

        if (sourceBooking && !get().localBookings.some((item) => item.id === bookingId)) {
          set((state) => ({ localBookings: upsertBooking(state.localBookings, sourceBooking) }));
        }

        get().checkOutLocalBooking(bookingId);
      },
      checkOutLocalBooking: (bookingId) => {
        const booking = get().localBookings.find((item) => item.id === bookingId);

        if (!booking?.checkIn || booking.checkOut) {
          return;
        }

        const checkedOutBooking = checkOutBookingLocally(booking, {
          location: bookingMeetingPointLocation(booking),
        });

        set((state) => ({
          localBookings: state.localBookings.map((item) =>
            item.id === bookingId ? checkedOutBooking : item,
          ),
        }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            checkedOutBooking,
            'system',
            {
              pt: 'Tour finalizado',
              en: 'Tour completed',
              es: 'Tour finalizado',
            },
            {
              pt: 'O check-out foi registrado. Obrigado por viver essa experiencia.',
              en: 'Check-out was recorded. Thank you for joining this experience.',
              es: 'El check-out fue registrado. Gracias por vivir esta experiencia.',
            },
          ),
        );
      },
      confirmBooking: async (bookingId, sourceBooking) => {
        const booking = get().localBookings.find((item) => item.id === bookingId) ?? sourceBooking;

        if (!booking) {
          return;
        }

        if (shouldUseRemoteBookingLifecycle(booking)) {
          await updateRemoteBookingStatus({
            action: 'confirm',
            bookingId,
          });
        }

        if (sourceBooking && !get().localBookings.some((item) => item.id === bookingId)) {
          set((state) => ({ localBookings: upsertBooking(state.localBookings, sourceBooking) }));
        }

        get().confirmLocalBooking(bookingId);
      },
      confirmLocalBooking: (bookingId) => {
        const booking = get().localBookings.find((item) => item.id === bookingId);

        if (booking?.status !== 'pending') {
          return;
        }

        const confirmedBooking = confirmBookingLocally(booking);

        set((state) => ({
          localBookings: state.localBookings.map((item) =>
            item.id === bookingId ? confirmedBooking : item,
          ),
        }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            confirmedBooking,
            'booking_confirmed',
            {
              pt: 'Reserva confirmada',
              en: 'Booking confirmed',
              es: 'Reserva confirmada',
            },
            {
              pt: 'O guia confirmou seu passeio. Confira o ponto de encontro antes de sair.',
              en: 'The guide confirmed your tour. Check the meeting point before leaving.',
              es: 'El guia confirmo tu tour. Revisa el punto de encuentro antes de salir.',
            },
          ),
        );
      },
      createBooking: async (input, tour) => {
        if (!canUseRemoteBookingService()) {
          return get().createLocalBooking(input, tour);
        }

        const booking = await createRemoteBooking(input, tour);

        set((state) => ({ localBookings: [booking, ...state.localBookings] }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            booking,
            'booking_created',
            {
              pt: 'Reserva enviada',
              en: 'Booking sent',
              es: 'Reserva enviada',
            },
            {
              pt: 'Seu pedido foi registrado com seguranca no Firebase e ficou pendente para o guia.',
              en: 'Your request was securely registered in Firebase and is pending guide confirmation.',
              es: 'Tu solicitud fue registrada con seguridad en Firebase y queda pendiente para el guia.',
            },
          ),
        );

        return booking;
      },
      createLocalBooking: (input, tour) => {
        const firstRoutePoint = tour.route.points[0];
        const meetingPoint = INITIAL_POIS.find((poi) => poi.id === firstRoutePoint?.poiId);

        if (!meetingPoint) {
          throw new Error('O ponto de encontro do tour nao foi encontrado.');
        }

        const booking = buildBookingFromRequest(input, tour, {
          id: `local-booking-${Date.now().toString(36)}`,
          meetingPoint,
        });

        set((state) => ({ localBookings: [booking, ...state.localBookings] }));
        useNotificationStore.getState().addLocalNotification(
          buildBookingNotification(
            booking,
            'booking_created',
            {
              pt: 'Reserva criada',
              en: 'Booking created',
              es: 'Reserva creada',
            },
            {
              pt: 'Seu pedido ficou pendente para confirmacao do guia.',
              en: 'Your request is pending guide confirmation.',
              es: 'Tu solicitud quedo pendiente de confirmacion del guia.',
            },
          ),
        );
        return booking;
      },
      resetLocalBookings: () => set({ localBookings: [] }),
    }),
    {
      merge: (persistedState, currentState) => {
        if (!isPersistedBookingState(persistedState)) {
          return currentState;
        }

        return {
          ...currentState,
          localBookings: persistedState.localBookings.map(reviveBookingTimestamps),
        };
      },
      name: 'conexao-favela:bookings:v1',
      partialize: (state): PersistedBookingState => ({
        localBookings: state.localBookings,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
