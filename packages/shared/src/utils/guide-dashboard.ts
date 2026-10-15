import type { Booking, Tour } from '../types';

export type GuideActivitySummary = {
  readonly averageRating: number | null;
  readonly bookingCount: number;
  readonly completedBookingCount: number;
  readonly draftTourCount: number;
  readonly publishedTourCount: number;
  readonly totalTourists: number;
  readonly upcomingBookingCount: number;
};

type SummarizeGuideActivityInput = {
  readonly bookings: readonly Booking[];
  readonly communityId: string;
  readonly guideId: string;
  readonly now?: Date;
  readonly tours: readonly Tour[];
};

const activeBookingStatuses = new Set<Booking['status']>(['pending', 'confirmed', 'in_progress']);

export function summarizeGuideActivity({
  bookings,
  communityId,
  guideId,
  now = new Date(),
  tours,
}: SummarizeGuideActivityInput): GuideActivitySummary {
  const guideTours = tours.filter(
    (tour) => tour.communityId === communityId && tour.guideId === guideId,
  );
  const guideBookings = bookings.filter(
    (booking) => booking.communityId === communityId && booking.guideId === guideId,
  );
  const ratedTours = guideTours.filter((tour) => tour.stats.averageRating > 0);
  const ratingTotal = ratedTours.reduce((total, tour) => total + tour.stats.averageRating, 0);

  return {
    averageRating: ratedTours.length > 0 ? ratingTotal / ratedTours.length : null,
    bookingCount: guideBookings.length,
    completedBookingCount: guideBookings.filter((booking) => booking.status === 'completed').length,
    draftTourCount: guideTours.filter((tour) => tour.status === 'draft').length,
    publishedTourCount: guideTours.filter((tour) => tour.status === 'published').length,
    totalTourists: guideBookings
      .filter((booking) => booking.status !== 'cancelled' && booking.status !== 'no_show')
      .reduce((total, booking) => total + booking.numberOfTourists, 0),
    upcomingBookingCount: guideBookings.filter(
      (booking) =>
        activeBookingStatuses.has(booking.status) && booking.scheduledFor.toDate() >= now,
    ).length,
  };
}
