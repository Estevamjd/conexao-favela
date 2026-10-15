import { describe, expect, it } from 'vitest';
import {
  BookingLifecyclePlanError,
  buildBookingLifecyclePlan,
  mapBookingForLifecycle,
  parseBookingLifecycleRequest,
  resolveBookingLifecycleActor,
  type FunctionBookingForLifecycle,
} from './booking-lifecycle.js';

const pendingBooking: FunctionBookingForLifecycle = {
  communityId: 'alemao',
  guideId: 'guide-1',
  id: 'booking-1',
  meetingPoint: {
    lat: -22.861,
    lng: -43.273,
  },
  scheduledFor: new Date('2026-07-15T12:00:00.000Z'),
  status: 'pending',
  touristId: 'tourist-1',
  tourId: 'tour-1',
};

describe('booking lifecycle function planning', () => {
  it('parses strict lifecycle payloads', () => {
    expect(parseBookingLifecycleRequest({ action: 'confirm', bookingId: 'booking-1' })).toEqual({
      action: 'confirm',
      bookingId: 'booking-1',
    });
    expect(() =>
      parseBookingLifecycleRequest({
        action: 'confirm',
        bookingId: 'booking-1',
        status: 'completed',
      }),
    ).toThrow(BookingLifecyclePlanError);
    expect(() =>
      parseBookingLifecycleRequest({ action: 'cancel', bookingId: 'booking-1' }),
    ).toThrow(BookingLifecyclePlanError);
  });

  it('maps Firestore booking data and resolves the actor from auth context', () => {
    const mapped = mapBookingForLifecycle('booking-1', {
      ...pendingBooking,
      scheduledFor: { toDate: () => pendingBooking.scheduledFor },
    });

    expect(mapped).toEqual(pendingBooking);
    expect(resolveBookingLifecycleActor(pendingBooking, 'guide-1', false)).toBe('guide');
    expect(resolveBookingLifecycleActor(pendingBooking, 'tourist-1', false)).toBe('tourist');
    expect(resolveBookingLifecycleActor(pendingBooking, 'admin-1', true)).toBe('admin');
    expect(resolveBookingLifecycleActor(pendingBooking, 'other-user', false)).toBeNull();
  });

  it('lets a guide confirm a pending booking', () => {
    const plan = buildBookingLifecyclePlan(
      { action: 'confirm', bookingId: 'booking-1' },
      pendingBooking,
      {
        actor: 'guide',
        now: new Date('2026-06-01T10:00:00.000Z'),
      },
    );

    expect(plan.patch.status).toBe('confirmed');
    expect(plan.response).toEqual({
      action: 'confirm',
      bookingId: 'booking-1',
      status: 'confirmed',
      updatedAtIso: '2026-06-01T10:00:00.000Z',
    });
  });

  it('blocks tourists from confirming and blocks late tourist cancellation', () => {
    expect(() =>
      buildBookingLifecyclePlan({ action: 'confirm', bookingId: 'booking-1' }, pendingBooking, {
        actor: 'tourist',
      }),
    ).toThrow(BookingLifecyclePlanError);
    expect(() =>
      buildBookingLifecyclePlan(
        {
          action: 'cancel',
          bookingId: 'booking-1',
          reason: 'Mudanca de planos',
        },
        {
          ...pendingBooking,
          status: 'confirmed',
        },
        {
          actor: 'tourist',
          now: new Date('2026-07-15T00:30:00.000Z'),
        },
      ),
    ).toThrow(BookingLifecyclePlanError);
  });

  it('cancels with actor metadata inside the allowed window', () => {
    const plan = buildBookingLifecyclePlan(
      {
        action: 'cancel',
        bookingId: 'booking-1',
        reason: 'Chuva forte na rota',
      },
      {
        ...pendingBooking,
        status: 'confirmed',
      },
      {
        actor: 'guide',
        now: new Date('2026-07-15T10:00:00.000Z'),
      },
    );

    expect(plan.patch.status).toBe('cancelled');
    expect(plan.patch.cancellation).toEqual({
      cancelledAt: new Date('2026-07-15T10:00:00.000Z'),
      cancelledBy: 'guide',
      reason: 'Chuva forte na rota',
      refundIssued: false,
    });
  });

  it('checks in and checks out around the scheduled start', () => {
    const checkInPlan = buildBookingLifecyclePlan(
      {
        action: 'check_in',
        bookingId: 'booking-1',
        location: { lat: -22.86, lng: -43.27 },
      },
      {
        ...pendingBooking,
        status: 'confirmed',
      },
      {
        actor: 'tourist',
        now: new Date('2026-07-15T11:00:00.000Z'),
      },
    );

    expect(checkInPlan.patch.status).toBe('in_progress');
    expect(checkInPlan.patch.checkIn?.location).toEqual({ lat: -22.86, lng: -43.27 });

    const checkOutPlan = buildBookingLifecyclePlan(
      { action: 'check_out', bookingId: 'booking-1' },
      {
        ...pendingBooking,
        checkIn: {
          checkedInAt: new Date('2026-07-15T11:00:00.000Z'),
          location: { lat: -22.86, lng: -43.27 },
        },
        status: 'in_progress',
      },
      {
        actor: 'guide',
        now: new Date('2026-07-15T14:30:00.000Z'),
      },
    );

    expect(checkOutPlan.patch.status).toBe('completed');
    expect(checkOutPlan.patch.checkOut?.location).toEqual(pendingBooking.meetingPoint);
  });
});
