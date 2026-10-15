import {
  INITIAL_POIS,
  bookingRequestSchema,
  buildBookingFromRequest,
  type Booking,
  type BookingStatus,
  type BookingRequestInput,
  type Coordinates,
  type Tour,
} from '@conexao-favela/shared';
import { httpsCallable } from 'firebase/functions';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

type RemoteBookingRequestInput = Pick<
  BookingRequestInput,
  'communityId' | 'numberOfTourists' | 'scheduledForIso' | 'tourId' | 'touristsInfo'
>;

type RemoteBookingResponse = {
  readonly bookingId: string;
  readonly guideId: string;
  readonly scheduledForIso: string;
  readonly status: 'pending';
  readonly totalPrice: number;
};

type RemoteBookingLifecycleAction = 'cancel' | 'check_in' | 'check_out' | 'confirm';

type RemoteBookingLifecycleRequestInput = {
  readonly action: RemoteBookingLifecycleAction;
  readonly bookingId: string;
  readonly location?: Coordinates;
  readonly reason?: string;
};

type RemoteBookingLifecycleResponse = {
  readonly action: RemoteBookingLifecycleAction;
  readonly bookingId: string;
  readonly status: BookingStatus;
  readonly updatedAtIso: string;
};

function resolveLocalMeetingPoint(tour: Tour) {
  const firstRoutePoint = tour.route.points[0];
  const meetingPoint = INITIAL_POIS.find((poi) => poi.id === firstRoutePoint?.poiId);

  if (!meetingPoint) {
    throw new Error('O ponto de encontro do tour nao foi encontrado.');
  }

  return meetingPoint;
}

export function canUseRemoteBookingService(): boolean {
  return hasFirebaseConfig();
}

export async function createRemoteBooking(
  input: BookingRequestInput,
  tour: Tour,
): Promise<Booking> {
  const parsedInput = bookingRequestSchema.parse(input);
  const meetingPoint = resolveLocalMeetingPoint(tour);
  const { functions } = getFirebaseServices();
  const createBooking = httpsCallable<RemoteBookingRequestInput, RemoteBookingResponse>(
    functions,
    'createBooking',
  );
  const response = await createBooking({
    communityId: parsedInput.communityId,
    numberOfTourists: parsedInput.numberOfTourists,
    scheduledForIso: parsedInput.scheduledForIso,
    tourId: parsedInput.tourId,
    touristsInfo: parsedInput.touristsInfo,
  });
  const remoteRequest = bookingRequestSchema.parse({
    ...parsedInput,
    guideId: response.data.guideId,
    scheduledForIso: response.data.scheduledForIso,
  });
  const remoteTour: Tour = {
    ...tour,
    guideId: response.data.guideId,
  };
  const booking = buildBookingFromRequest(remoteRequest, remoteTour, {
    id: response.data.bookingId,
    meetingPoint,
    shareableBaseUrl: 'https://conexaofavela.app/bookings',
  });

  return {
    ...booking,
    pricing: {
      ...booking.pricing,
      pricePerPerson: response.data.totalPrice / remoteRequest.numberOfTourists,
      totalPrice: response.data.totalPrice,
    },
  };
}

export async function updateRemoteBookingStatus(
  input: RemoteBookingLifecycleRequestInput,
): Promise<RemoteBookingLifecycleResponse> {
  const { functions } = getFirebaseServices();
  const updateBookingStatus = httpsCallable<
    RemoteBookingLifecycleRequestInput,
    RemoteBookingLifecycleResponse
  >(functions, 'updateBookingStatus');
  const response = await updateBookingStatus(input);

  return response.data;
}
