import { describe, expect, it } from 'vitest';
import { SUPPORTED_CURRENCY_CODES, SUPPORTED_CURRENCIES } from '../currencies';
import { INITIAL_COMMUNITY_ID, INITIAL_SUB_AREA_IDS } from '../data/initial-community';
import { INITIAL_GUIDE_APPLICATIONS } from '../data/initial-guide-applications';
import { INITIAL_PUBLIC_GUIDES } from '../data/initial-guides';
import { INITIAL_POIS } from '../data/initial-pois';
import { INITIAL_TOURS } from '../data/initial-tours';
import {
  accountErasureRequestSchema,
  accountRegistrationSchema,
  bookingRequestSchema,
  guideApprovalRequestSchema,
  guideRegistrationSchema,
  profileUpdateSchema,
  tourDraftSchema,
} from '../schemas/domain';
import {
  buildBookingFromRequest,
  cancelBooking,
  checkInBooking,
  checkOutBooking,
  confirmBooking,
} from '../utils/bookings';
import {
  filterTours,
  filterPoisByCategory,
  filterPoisByCommunity,
  filterPoisBySubArea,
  filterToursByCommunity,
  filterToursBySubArea,
} from '../utils/filters';
import {
  approveGuideApplication,
  buildGuideApprovalAuditLog,
  filterPublicGuidesByCommunity,
  findPublicGuideById,
  isGuidePendingApproval,
} from '../utils/guides';
import { summarizeGuideActivity } from '../utils/guide-dashboard';
import { resolveLocalizedText } from '../utils/localization';
import { buildNotificationFromDraft, markNotificationRead } from '../utils/notifications';
import { reviveBookingTimestamps, reviveNotificationTimestamps } from '../utils/persistence';
import {
  BOOKING_CANCELLATION_POLICY,
  BOOKING_CHECK_IN_POLICY,
  getBookingCancellationState,
  getBookingCheckInState,
} from '../utils/booking-policy';
import {
  DEFAULT_PUSH_REGISTRATION,
  hasUsablePushToken,
  isPushRegistrationSnapshot,
} from '../utils/push-notifications';
import { buildTourFromDraft } from '../utils/tours';

describe('initial POI seed data', () => {
  it('keeps every POI scoped to the initial community id', () => {
    expect(INITIAL_POIS).toHaveLength(12);
    expect(filterPoisByCommunity(INITIAL_POIS, INITIAL_COMMUNITY_ID)).toHaveLength(12);
  });

  it('keeps sub-area filtering independent from display names', () => {
    const morroAdeusPois = filterPoisBySubArea(INITIAL_POIS, INITIAL_SUB_AREA_IDS.morroAdeus);
    expect(morroAdeusPois).toHaveLength(5);
  });

  it('filters POIs by category without depending on translated labels', () => {
    const cableCarPois = filterPoisByCategory(INITIAL_POIS, 'teleferico');
    expect(cableCarPois.map((poi) => poi.id)).toEqual([
      'estacao-teleferico-alemao',
      'estacao-teleferico-adeus',
    ]);
  });
});

describe('initial tour seed data', () => {
  it('keeps every tour scoped to the initial community id', () => {
    expect(INITIAL_TOURS).toHaveLength(3);
    expect(filterToursByCommunity(INITIAL_TOURS, INITIAL_COMMUNITY_ID)).toHaveLength(3);
  });

  it('filters tours by sub-area without depending on display names', () => {
    const morroAdeusTours = filterToursBySubArea(INITIAL_TOURS, INITIAL_SUB_AREA_IDS.morroAdeus);
    expect(morroAdeusTours.map((tour) => tour.id)).toEqual(['memorias-do-teleferico']);
  });

  it('combines tour filters for the explore screen without leaking community scope', () => {
    const filteredTours = filterTours(INITIAL_TOURS, {
      category: 'historico',
      communityId: INITIAL_COMMUNITY_ID,
      language: 'en',
      pricePerPerson: { max: 80 },
      scheduledDays: [5],
      subAreaId: INITIAL_SUB_AREA_IDS.morroAdeus,
    });

    expect(filteredTours.map((tour) => tour.id)).toEqual(['memorias-do-teleferico']);
  });

  it('filters tours by weekend schedule, category and premium price band', () => {
    const filteredTours = filterTours(INITIAL_TOURS, {
      category: 'natureza',
      communityId: INITIAL_COMMUNITY_ID,
      pricePerPerson: { min: 121 },
      scheduledDays: [0, 6],
    });

    expect(filteredTours.map((tour) => tour.id)).toEqual(['natureza-serra-lagoa']);
  });
});

describe('guide approval seed data', () => {
  it('keeps guide applications pending and scoped by community id', () => {
    expect(INITIAL_GUIDE_APPLICATIONS).toHaveLength(3);
    expect(INITIAL_GUIDE_APPLICATIONS.every(isGuidePendingApproval)).toBe(true);
    expect(
      INITIAL_GUIDE_APPLICATIONS.every(
        (user) => user.guideProfile?.communityId === INITIAL_COMMUNITY_ID,
      ),
    ).toBe(true);
  });

  it('approves a guide application without changing their community scope', () => {
    const guide = INITIAL_GUIDE_APPLICATIONS[0];

    if (!guide) {
      throw new Error('Expected at least one guide application');
    }

    const approved = approveGuideApplication(guide, {
      approvedAt: new Date('2026-05-28T12:00:00.000Z'),
    });

    expect(approved.guideProfile?.verified).toBe(true);
    expect(approved.guideProfile?.communityId).toBe(guide.guideProfile?.communityId);
    expect(approved.guideProfile?.verifiedAt?.toDate().toISOString()).toBe(
      '2026-05-28T12:00:00.000Z',
    );
  });

  it('builds a minimal audit log when a guide is approved', () => {
    const guide = INITIAL_GUIDE_APPLICATIONS[0];

    if (!guide) {
      throw new Error('Expected at least one guide application');
    }

    const auditLog = buildGuideApprovalAuditLog(guide, {
      actorId: 'admin-1',
      approvedAt: new Date('2026-05-28T12:00:00.000Z'),
      id: 'audit-1',
      source: 'cloud_function',
    });

    expect(auditLog?.action).toBe('guide_approved');
    expect(auditLog?.actorId).toBe('admin-1');
    expect(auditLog?.targetUserId).toBe(guide.id);
    expect(auditLog?.communityId).toBe(guide.guideProfile?.communityId);
    expect(auditLog?.metadata.documentCount).toBe(
      guide.guideProfile?.documents.documentUrls.length,
    );
  });
});

describe('public guide profiles', () => {
  it('keeps public guide profiles sanitized and scoped by community id', () => {
    const communityGuides = filterPublicGuidesByCommunity(
      INITIAL_PUBLIC_GUIDES,
      INITIAL_COMMUNITY_ID,
    );

    expect(communityGuides).toHaveLength(3);
    expect(communityGuides.every((guide) => guide.verified)).toBe(true);
    expect(communityGuides.every((guide) => guide.active)).toBe(true);
    expect(communityGuides.every((guide) => !('documents' in guide))).toBe(true);
  });

  it('resolves every published seed tour to a public guide profile', () => {
    const missingGuideIds = INITIAL_TOURS.map((tour) =>
      findPublicGuideById(INITIAL_PUBLIC_GUIDES, tour.guideId),
    ).filter((guide) => guide === null);

    expect(missingGuideIds).toHaveLength(0);
  });
});

describe('domain validation', () => {
  it('requires explicit terms acceptance when creating an account', () => {
    const result = accountRegistrationSchema.safeParse({
      displayName: 'Ana Silva',
      email: 'ana@example.com',
      password: 'segredo123',
      preferredLanguage: 'pt',
      type: 'tourist',
      acceptedTerms: false,
    });

    expect(result.success).toBe(false);
  });

  it('accepts only safe profile preference updates', () => {
    expect(
      profileUpdateSchema.safeParse({
        displayName: 'Ana Silva',
        preferredLanguage: 'pt',
        preferredCurrency: 'BRL',
        notificationsEnabled: true,
      }).success,
    ).toBe(true);
    expect(
      profileUpdateSchema.safeParse({
        displayName: 'A',
        preferredLanguage: 'pt',
        preferredCurrency: 'BRL',
        notificationsEnabled: true,
      }).success,
    ).toBe(false);
    expect(
      profileUpdateSchema.safeParse({
        displayName: 'Ana Silva',
        preferredLanguage: 'pt',
        preferredCurrency: 'BRL',
        notificationsEnabled: true,
        type: 'admin',
      }).success,
    ).toBe(false);
  });

  it('requires at least one uploaded guide document reference', () => {
    const result = guideRegistrationSchema.safeParse({
      displayName: 'Joao Guia',
      email: 'joao@example.com',
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
      languagesSpoken: ['pt'],
      yearsOfExperience: 4,
      bio: { pt: 'Guia local com roteiros culturais.' },
      documentUrls: [],
      acceptedTerms: true,
    });

    expect(result.success).toBe(false);
  });

  it('rejects tour drafts with an inverted price range', () => {
    const result = tourDraftSchema.safeParse({
      guideId: 'guide-1',
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
      title: { pt: 'Tour teste' },
      description: { pt: 'Descricao do tour teste' },
      poiIds: ['estacao-teleferico-alemao'],
      minPrice: 120,
      maxPrice: 80,
      languages: ['pt'],
      category: 'cultural',
      difficulty: 'easy',
      maxTourists: 8,
    });

    expect(result.success).toBe(false);
  });

  it('builds a private tour draft from validated tour input', () => {
    const parsed = tourDraftSchema.parse({
      guideId: 'guide-1',
      communityId: INITIAL_COMMUNITY_ID,
      subAreaIds: [INITIAL_SUB_AREA_IDS.morroAlemao],
      title: { pt: 'Tour rascunho' },
      description: { pt: 'Descricao do tour rascunho' },
      poiIds: ['estacao-teleferico-alemao', 'mirante-do-alemao'],
      minPrice: 70,
      maxPrice: 70,
      languages: ['pt'],
      category: 'cultural',
      difficulty: 'easy',
      maxTourists: 8,
    });
    const tour = buildTourFromDraft(parsed, { id: 'draft-1' });

    expect(tour.status).toBe('draft');
    expect(tour.pricing.type).toBe('fixed');
    expect(tour.route.points.map((point) => point.order)).toEqual([1, 2]);
  });

  it('requires booking tourist details to match the booked capacity', () => {
    const result = bookingRequestSchema.safeParse({
      tourId: 'tour-1',
      guideId: 'guide-1',
      touristId: 'tourist-1',
      communityId: INITIAL_COMMUNITY_ID,
      scheduledForIso: '2026-06-01T14:00:00-03:00',
      numberOfTourists: 2,
      touristsInfo: [{ name: 'Ana Silva' }],
    });

    expect(result.success).toBe(false);
  });

  it('validates guide approval callable input', () => {
    expect(guideApprovalRequestSchema.safeParse({ guideId: 'guide-1' }).success).toBe(true);
    expect(guideApprovalRequestSchema.safeParse({ guideId: '' }).success).toBe(false);
    expect(
      guideApprovalRequestSchema.safeParse({ guideId: 'guide-1', verified: true }).success,
    ).toBe(false);
  });

  it('requires an explicit account erasure confirmation phrase', () => {
    expect(
      accountErasureRequestSchema.safeParse({ confirmation: 'DELETE_MY_ACCOUNT' }).success,
    ).toBe(true);
    expect(accountErasureRequestSchema.safeParse({ confirmation: 'delete' }).success).toBe(false);
    expect(
      accountErasureRequestSchema.safeParse({
        confirmation: 'DELETE_MY_ACCOUNT',
        userId: 'other-user',
      }).success,
    ).toBe(false);
  });

  it('builds a pending booking from a validated request', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-01T14:00:00-03:00',
      numberOfTourists: 2,
      touristsInfo: [{ name: 'Ana Silva' }, { name: 'Bruno Silva' }],
    });
    const booking = buildBookingFromRequest(parsed, tour, {
      id: 'booking-1',
      meetingPoint,
    });

    expect(booking.status).toBe('pending');
    expect(booking.pricing.totalPrice).toBe(tour.pricing.minPrice * 2);
    expect(booking.meetingPoint.name).toBe(meetingPoint.name.pt);
  });

  it('moves a booking through check-in and check-out states', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-01T14:00:00-03:00',
      numberOfTourists: 1,
      touristsInfo: [{ name: 'Ana Silva' }],
    });
    const booking = buildBookingFromRequest(parsed, tour, {
      id: 'booking-2',
      meetingPoint,
    });
    const confirmed = confirmBooking(booking, {
      confirmedAt: new Date('2026-06-01T12:00:00.000Z'),
    });
    const checkedIn = checkInBooking(confirmed, {
      checkedInAt: new Date('2026-06-01T17:00:00.000Z'),
      location: meetingPoint.coordinates,
    });
    const checkedOut = checkOutBooking(checkedIn, {
      checkedOutAt: new Date('2026-06-01T19:00:00.000Z'),
      location: meetingPoint.coordinates,
    });

    expect(checkedIn.status).toBe('in_progress');
    expect(checkedIn.checkIn?.location).toEqual(meetingPoint.coordinates);
    expect(checkedOut.status).toBe('completed');
    expect(checkedOut.checkOut?.checkedOutAt.toDate().toISOString()).toBe(
      '2026-06-01T19:00:00.000Z',
    );
  });

  it('confirms and cancels a booking with auditable state transitions', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-02T14:00:00-03:00',
      numberOfTourists: 2,
      touristsInfo: [{ name: 'Ana Silva' }, { name: 'Bruno Silva' }],
    });
    const booking = buildBookingFromRequest(parsed, tour, {
      id: 'booking-3',
      meetingPoint,
    });
    const confirmed = confirmBooking(booking, {
      confirmedAt: new Date('2026-06-01T13:00:00.000Z'),
    });
    const cancelled = cancelBooking(confirmed, {
      cancelledAt: new Date('2026-06-01T14:00:00.000Z'),
      cancelledBy: 'guide',
      reason: 'weather-risk',
    });

    expect(confirmed.status).toBe('confirmed');
    expect(confirmed.updatedAt?.toDate().toISOString()).toBe('2026-06-01T13:00:00.000Z');
    expect(cancelled.status).toBe('cancelled');
    expect(cancelled.cancellation?.cancelledBy).toBe('guide');
    expect(cancelled.cancellation?.refundIssued).toBe(false);
  });

  it('applies the self-service cancellation windows by actor', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-02T14:00:00-03:00',
      numberOfTourists: 1,
      touristsInfo: [{ name: 'Ana Silva' }],
    });
    const booking = confirmBooking(
      buildBookingFromRequest(parsed, tour, {
        id: 'booking-cancellation-policy',
        meetingPoint,
      }),
      { confirmedAt: new Date('2026-06-01T12:00:00.000Z') },
    );

    const touristAheadOfWindow = getBookingCancellationState(
      booking,
      'tourist',
      new Date('2026-06-01T13:00:00.000Z'),
    );
    const touristInsideWindow = getBookingCancellationState(
      booking,
      'tourist',
      new Date('2026-06-02T15:30:00.000Z'),
    );
    const guideBeforeStart = getBookingCancellationState(
      booking,
      'guide',
      new Date('2026-06-02T16:30:00.000Z'),
    );
    const blockedTouristCancellation = cancelBooking(booking, {
      cancelledAt: new Date('2026-06-02T15:30:00.000Z'),
      cancelledBy: 'tourist',
      reason: 'late-change',
    });

    expect(touristAheadOfWindow.canCancel).toBe(true);
    expect(touristAheadOfWindow.minimumHoursBeforeStart).toBe(
      BOOKING_CANCELLATION_POLICY.touristMinimumHoursBeforeStart,
    );
    expect(touristInsideWindow.canCancel).toBe(false);
    expect(touristInsideWindow.reason).toBe('inside_minimum_window');
    expect(guideBeforeStart.canCancel).toBe(true);
    expect(blockedTouristCancellation.status).toBe('confirmed');
  });

  it('opens check-in only near the scheduled start after guide confirmation', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-02T14:00:00-03:00',
      numberOfTourists: 1,
      touristsInfo: [{ name: 'Ana Silva' }],
    });
    const pendingBooking = buildBookingFromRequest(parsed, tour, {
      id: 'booking-check-in-policy',
      meetingPoint,
    });
    const confirmedBooking = confirmBooking(pendingBooking, {
      confirmedAt: new Date('2026-06-01T12:00:00.000Z'),
    });

    const pendingState = getBookingCheckInState(
      pendingBooking,
      new Date('2026-06-02T16:00:00.000Z'),
    );
    const tooEarlyState = getBookingCheckInState(
      confirmedBooking,
      new Date('2026-06-02T12:00:00.000Z'),
    );
    const openState = getBookingCheckInState(
      confirmedBooking,
      new Date('2026-06-02T16:00:00.000Z'),
    );

    expect(pendingState.canCheckIn).toBe(false);
    expect(pendingState.reason).toBe('not_confirmed');
    expect(tooEarlyState.canCheckIn).toBe(false);
    expect(tooEarlyState.reason).toBe('too_early');
    expect(openState.canCheckIn).toBe(true);
    expect(openState.opensHoursBeforeStart).toBe(BOOKING_CHECK_IN_POLICY.opensHoursBeforeStart);
  });
});

describe('guide activity summary', () => {
  it('summarizes guide tours and bookings by community scope', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-02T14:00:00-03:00',
      numberOfTourists: 3,
      touristsInfo: [{ name: 'Ana Silva' }, { name: 'Bruno Silva' }, { name: 'Clara Silva' }],
    });
    const booking = confirmBooking(
      buildBookingFromRequest(parsed, tour, {
        id: 'booking-summary',
        meetingPoint,
      }),
      { confirmedAt: new Date('2026-06-01T13:00:00.000Z') },
    );
    const summary = summarizeGuideActivity({
      bookings: [booking],
      communityId: tour.communityId,
      guideId: tour.guideId,
      now: new Date('2026-06-01T12:00:00.000Z'),
      tours: [tour],
    });

    expect(summary.publishedTourCount).toBe(1);
    expect(summary.bookingCount).toBe(1);
    expect(summary.upcomingBookingCount).toBe(1);
    expect(summary.totalTourists).toBe(3);
  });
});

describe('localization', () => {
  it('falls back to Portuguese when a draft translation is missing', () => {
    expect(resolveLocalizedText({ pt: 'Mirante' }, 'ja')).toBe('Mirante');
  });
});

describe('profile preferences', () => {
  it('keeps supported currency metadata aligned with currency codes', () => {
    expect(SUPPORTED_CURRENCIES.map((currency) => currency.code)).toEqual(SUPPORTED_CURRENCY_CODES);
  });
});

describe('notifications', () => {
  it('builds and marks a notification as read', () => {
    const notification = buildNotificationFromDraft(
      {
        userId: 'tourist-1',
        type: 'booking_created',
        title: { pt: 'Reserva criada' },
        body: { pt: 'Seu pedido foi registrado.' },
        data: { bookingId: 'booking-1', communityId: INITIAL_COMMUNITY_ID },
      },
      {
        id: 'notification-1',
        createdAt: new Date('2026-05-28T12:00:00.000Z'),
      },
    );
    const readNotification = markNotificationRead(notification, {
      readAt: new Date('2026-05-28T12:05:00.000Z'),
    });

    expect(notification.read).toBe(false);
    expect(notification.data?.communityId).toBe(INITIAL_COMMUNITY_ID);
    expect(readNotification.read).toBe(true);
    expect(readNotification.readAt?.toDate().toISOString()).toBe('2026-05-28T12:05:00.000Z');
  });
});

describe('push notification registration', () => {
  it('recognizes usable push tokens only after a granted registration', () => {
    expect(hasUsablePushToken(DEFAULT_PUSH_REGISTRATION)).toBe(false);
    expect(hasUsablePushToken({ provider: 'expo', status: 'granted', token: '' })).toBe(false);
    expect(
      hasUsablePushToken({
        provider: 'expo',
        status: 'granted',
        token: 'ExponentPushToken[test]',
      }),
    ).toBe(true);
  });

  it('guards persisted push registration snapshots', () => {
    expect(isPushRegistrationSnapshot({ provider: 'expo', status: 'denied' })).toBe(true);
    expect(isPushRegistrationSnapshot({ provider: 'expo', status: 'unknown' })).toBe(false);
    expect(isPushRegistrationSnapshot({ provider: 'sms', status: 'granted' })).toBe(false);
  });
});

describe('local persistence revival', () => {
  it('revives booking timestamps after JSON serialization', () => {
    const tour = INITIAL_TOURS[0];

    if (!tour) {
      throw new Error('Expected at least one seed tour');
    }

    const meetingPoint = INITIAL_POIS.find((poi) => poi.id === tour.route.points[0]?.poiId);

    if (!meetingPoint) {
      throw new Error('Expected seed tour to have a valid first POI');
    }

    const parsed = bookingRequestSchema.parse({
      tourId: tour.id,
      guideId: tour.guideId,
      touristId: 'tourist-1',
      communityId: tour.communityId,
      scheduledForIso: '2026-06-02T14:00:00-03:00',
      numberOfTourists: 1,
      touristsInfo: [{ name: 'Ana Silva' }],
    });
    const booking = checkInBooking(
      confirmBooking(
        buildBookingFromRequest(parsed, tour, {
          id: 'booking-persisted',
          meetingPoint,
        }),
        { confirmedAt: new Date('2026-06-01T13:00:00.000Z') },
      ),
      {
        checkedInAt: new Date('2026-06-02T17:00:00.000Z'),
        location: meetingPoint.coordinates,
      },
    );
    const revived = reviveBookingTimestamps(JSON.parse(JSON.stringify(booking)) as typeof booking);

    expect(revived.scheduledFor.toDate().toISOString()).toBe('2026-06-02T17:00:00.000Z');
    expect(revived.checkIn?.checkedInAt.toDate().toISOString()).toBe('2026-06-02T17:00:00.000Z');
    expect(revived.updatedAt?.toDate().toISOString()).toBe('2026-06-02T17:00:00.000Z');
  });

  it('revives notification timestamps after JSON serialization', () => {
    const notification = markNotificationRead(
      buildNotificationFromDraft(
        {
          userId: 'tourist-1',
          type: 'booking_confirmed',
          title: { pt: 'Reserva confirmada' },
          body: { pt: 'Seu passeio foi confirmado.' },
        },
        {
          createdAt: new Date('2026-06-01T13:00:00.000Z'),
          id: 'notification-persisted',
        },
      ),
      { readAt: new Date('2026-06-01T13:10:00.000Z') },
    );
    const revived = reviveNotificationTimestamps(
      JSON.parse(JSON.stringify(notification)) as typeof notification,
    );

    expect(revived.createdAt.toDate().toISOString()).toBe('2026-06-01T13:00:00.000Z');
    expect(revived.readAt?.toDate().toISOString()).toBe('2026-06-01T13:10:00.000Z');
  });
});
