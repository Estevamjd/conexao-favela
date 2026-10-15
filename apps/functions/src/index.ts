import { getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  getFirestore,
  Timestamp,
  FieldValue,
  type DocumentData,
  type Firestore,
} from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { HttpsError, onCall, onRequest, type CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import {
  AccountErasurePlanError,
  buildAccountErasurePlan,
  parseAccountErasureRequest,
  type AccountErasureRequestInput,
  type AccountErasureResponse,
  type FunctionUserForErasure,
} from './account-erasure.js';
import {
  BookingCreationPlanError,
  buildBookingCreationPlan,
  mapPoiForBooking,
  mapTourForBooking,
  parseBookingCreationRequest,
  type BookingCreationPlan,
  type FunctionBookingRequestInput,
} from './booking-creation.js';
import {
  buildBookingCancelledNotifications,
  buildBookingConfirmedNotifications,
  buildBookingCreatedNotifications,
  type FunctionBookingNotification,
} from './booking-notifications.js';
import {
  BookingLifecyclePlanError,
  buildBookingLifecyclePlan,
  mapBookingForLifecycle,
  parseBookingLifecycleRequest,
  resolveBookingLifecycleActor,
  type BookingLifecyclePatch,
  type BookingLifecycleRequestInput,
  type BookingLifecyclePlan,
} from './booking-lifecycle.js';
import {
  GuideApprovalPlanError,
  buildGuideApprovalPlan,
  parseGuideApprovalRequest,
  type FunctionUser,
  type GuideApprovalRequestInput,
  type GuideApprovalResponse,
} from './guide-approval.js';
import {
  TourCreationPlanError,
  buildTourCreationPlan,
  mapPoiForTourCreation,
  parseTourCreationRequest,
  type FunctionGuideForTourCreation,
  type FunctionTourCreationRequestInput,
  type TourCreationPlan,
} from './tour-creation.js';
import { createGatewayPayment, parseGatewayWebhook } from './payment-gateways.js';
import {
  buildPaymentCreationPlan,
  mapBookingForPayment,
  mapPaymentForRead,
  mapTourForPayment,
  parseCreatePaymentRequest,
  parseGetPaymentStatusRequest,
  PaymentPlanError,
  resolvePaymentStatusTransition,
  type FunctionPaymentForRead,
  type PaymentStatus,
} from './payments.js';
import {
  buildExpoPushMessages,
  parsePushRegistrationInput,
  pushTokenDocumentId,
} from './push-notifications.js';
import { buildRateLimitDecision, rateLimitDocumentId } from './rate-limit.js';
import {
  assertParticipant,
  buildChatId,
  ExperienceActionError,
  nextReviewStats,
  parseCreateChatRequest,
  parseMarkChatReadRequest,
  parseModerateReviewRequest,
  parseSendChatMessageRequest,
  parseSubmitReviewRequest,
} from './experience-actions.js';
import {
  calculateCouponDiscount,
  CouponActionError,
  mapCouponForPayment,
  resolveCouponRedemptionTransition,
} from './coupon-actions.js';
import { MarketplaceActionError, parseMarketplaceInquiryRequest } from './marketplace-actions.js';

const FIRESTORE_COLLECTIONS = {
  auditLogs: 'audit_logs',
  bookings: 'bookings',
  chats: 'chats',
  couponRedemptions: 'coupon_redemptions',
  coupons: 'coupons',
  notifications: 'notifications',
  payments: 'payments',
  pointsOfInterest: 'points_of_interest',
  rateLimits: 'rate_limits',
  reviews: 'reviews',
  marketplaceItems: 'marketplace_items',
  marketplaceInquiries: 'marketplace_inquiries',
  accesses: 'accesses',
  tours: 'tours',
  users: 'users',
  webhookEvents: 'webhook_events',
} as const;

const callableOptions = {
  enforceAppCheck: process.env.FUNCTIONS_ENFORCE_APP_CHECK === 'true',
  region: 'southamerica-east1' as const,
};

if (getApps().length === 0) {
  initializeApp();
}

export const healthcheck = onRequest({ region: 'southamerica-east1' }, (_request, response) => {
  response.status(200).json({
    ok: true,
    service: 'conexao-favela-functions',
  });
});

export const registerPushToken = onCall<unknown, Promise<{ readonly registered: true }>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before registering push notifications.');
    }

    let input;

    try {
      input = parsePushRegistrationInput(request.data);
    } catch (error: unknown) {
      throw new HttpsError(
        'invalid-argument',
        error instanceof Error ? error.message : 'Push registration payload is invalid.',
      );
    }

    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'register_push_token', 5, 10 * 60_000);
    const tokenRef = db
      .collection(FIRESTORE_COLLECTIONS.users)
      .doc(request.auth.uid)
      .collection('push_tokens')
      .doc(pushTokenDocumentId(input.token));
    const now = Timestamp.now();

    await tokenRef.set(
      {
        createdAt: now,
        enabled: true,
        lastSeenAt: now,
        platform: input.platform,
        provider: 'expo',
        token: input.token,
        userId: request.auth.uid,
      },
      { merge: true },
    );

    return { registered: true };
  },
);

function asLocalizedStringRecord(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

export const dispatchNotificationPush = onDocumentCreated(
  {
    document: 'notifications/{notificationId}',
    region: 'southamerica-east1',
  },
  async (event) => {
    const notification = event.data?.data();
    const userId = typeof notification?.userId === 'string' ? notification.userId : undefined;

    if (!notification || !userId) {
      return;
    }

    const db = getFirestore();
    const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(userId);
    const [userSnapshot, tokenSnapshot] = await Promise.all([
      userRef.get(),
      userRef.collection('push_tokens').where('enabled', '==', true).limit(100).get(),
    ]);
    const userData: unknown = userSnapshot.data();
    const userRecord = isRecord(userData) ? userData : undefined;
    const preferredLanguage =
      typeof userRecord?.preferredLanguage === 'string' ? userRecord.preferredLanguage : 'pt';
    const pushTokens = tokenSnapshot.docs
      .map((document) => {
        const data: unknown = document.data();

        return isRecord(data) && typeof data.token === 'string' ? data.token : undefined;
      })
      .filter((token): token is string => token !== undefined);
    const messages = buildExpoPushMessages(
      {
        body: asLocalizedStringRecord(notification.body),
        data: isRecord(notification.data) ? notification.data : undefined,
        title: asLocalizedStringRecord(notification.title),
      },
      preferredLanguage,
      pushTokens,
    );

    if (messages.length === 0) {
      return;
    }

    const pushResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      body: JSON.stringify(messages),
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!pushResponse.ok) {
      throw new Error(`Expo push service returned ${pushResponse.status.toString()}.`);
    }
  },
);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function hasAdminClaim(auth: CallableRequest['auth']) {
  const token = auth?.token as { readonly admin?: unknown } | undefined;

  return token?.admin === true;
}

function isTimestampLike(value: unknown): value is { toDate(): Date } {
  return isRecord(value) && typeof value.toDate === 'function';
}

function mapRateLimitState(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  const count = typeof value.count === 'number' ? value.count : undefined;
  const windowStartedAt = isTimestampLike(value.windowStartedAt)
    ? value.windowStartedAt.toDate()
    : undefined;

  return count !== undefined && Number.isInteger(count) && windowStartedAt
    ? { count, windowStartedAt }
    : null;
}

async function enforceCallableRateLimit(
  db: Firestore,
  userId: string,
  action: string,
  maxAttempts: number,
  windowMs: number,
) {
  const rateLimitRef = db
    .collection(FIRESTORE_COLLECTIONS.rateLimits)
    .doc(rateLimitDocumentId(userId, action));

  await db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(rateLimitRef);
    const decision = buildRateLimitDecision(
      snapshot.exists ? mapRateLimitState(snapshot.data()) : null,
      {
        maxAttempts,
        now: new Date(),
        windowMs,
      },
    );

    if (!decision.allowed) {
      throw new HttpsError(
        'resource-exhausted',
        `Too many ${action} requests. Retry after ${decision.retryAfterSeconds.toString()} seconds.`,
      );
    }

    transaction.set(
      rateLimitRef,
      {
        action,
        count: decision.nextState.count,
        updatedAt: Timestamp.now(),
        userId,
        windowStartedAt: Timestamp.fromDate(decision.nextState.windowStartedAt),
      },
      { merge: true },
    );
  });
}

function asStringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}

function asNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function asUser(snapshotId: string, data: DocumentData): FunctionUser {
  const record = data as Readonly<Record<string, unknown>>;
  const guideProfileRecord = isRecord(record.guideProfile) ? record.guideProfile : undefined;
  const documentsRecord =
    guideProfileRecord && isRecord(guideProfileRecord.documents)
      ? guideProfileRecord.documents
      : undefined;
  const type =
    record.type === 'guide' || record.type === 'admin' || record.type === 'tourist'
      ? record.type
      : 'tourist';
  const user: FunctionUser = {
    id: typeof record.id === 'string' ? record.id : snapshotId,
    type,
  };

  if (!guideProfileRecord) {
    return user;
  }

  return {
    ...user,
    guideProfile: {
      communityId:
        typeof guideProfileRecord.communityId === 'string' ? guideProfileRecord.communityId : '',
      documents: {
        documentUrls: asStringArray(documentsRecord?.documentUrls),
      },
      verified: guideProfileRecord.verified === true,
      verifiedAt: isTimestampLike(guideProfileRecord.verifiedAt)
        ? guideProfileRecord.verifiedAt
        : undefined,
    },
  };
}

function asErasureUser(snapshotId: string, data: DocumentData): FunctionUserForErasure {
  const record = data as Readonly<Record<string, unknown>>;
  const guideProfileRecord = isRecord(record.guideProfile) ? record.guideProfile : undefined;
  const documentsRecord =
    guideProfileRecord && isRecord(guideProfileRecord.documents)
      ? guideProfileRecord.documents
      : undefined;
  const type =
    record.type === 'guide' || record.type === 'admin' || record.type === 'tourist'
      ? record.type
      : 'tourist';
  const user: FunctionUserForErasure = {
    id: typeof record.id === 'string' ? record.id : snapshotId,
    type,
  };

  if (!guideProfileRecord) {
    return user;
  }

  return {
    ...user,
    guideProfile: {
      communityId:
        typeof guideProfileRecord.communityId === 'string' ? guideProfileRecord.communityId : '',
      documents: {
        documentUrls: asStringArray(documentsRecord?.documentUrls),
      },
      languagesSpoken: asStringArray(guideProfileRecord.languagesSpoken),
      rating: asNumber(guideProfileRecord.rating),
      subAreaIds: asStringArray(guideProfileRecord.subAreaIds),
      totalReviews: asNumber(guideProfileRecord.totalReviews),
      totalToursCompleted: asNumber(guideProfileRecord.totalToursCompleted),
      verified: guideProfileRecord.verified === true,
      yearsOfExperience: asNumber(guideProfileRecord.yearsOfExperience),
    },
  };
}

function asTourCreationGuide(snapshotId: string, data: DocumentData): FunctionGuideForTourCreation {
  const record = data as Readonly<Record<string, unknown>>;
  const guideProfileRecord = isRecord(record.guideProfile) ? record.guideProfile : undefined;
  const type =
    record.type === 'guide' || record.type === 'admin' || record.type === 'tourist'
      ? record.type
      : 'tourist';
  const user: FunctionGuideForTourCreation = {
    id: typeof record.id === 'string' ? record.id : snapshotId,
    type,
  };

  if (!guideProfileRecord) {
    return user;
  }

  return {
    ...user,
    guideProfile: {
      communityId:
        typeof guideProfileRecord.communityId === 'string' ? guideProfileRecord.communityId : '',
      languagesSpoken: asStringArray(guideProfileRecord.languagesSpoken),
      subAreaIds: asStringArray(guideProfileRecord.subAreaIds),
      verified: guideProfileRecord.verified === true,
    },
  };
}

function parseGuideApprovalCallableInput(data: unknown): GuideApprovalRequestInput {
  try {
    return parseGuideApprovalRequest(data);
  } catch (error: unknown) {
    if (error instanceof GuideApprovalPlanError && error.code === 'invalid_payload') {
      throw new HttpsError('invalid-argument', error.message);
    }

    throw error;
  }
}

function parseTourCreationCallableInput(data: unknown): FunctionTourCreationRequestInput {
  try {
    return parseTourCreationRequest(data);
  } catch (error: unknown) {
    if (error instanceof TourCreationPlanError && error.code === 'invalid_payload') {
      throw new HttpsError('invalid-argument', error.message);
    }

    throw error;
  }
}

function parseTourUpdateCallableInput(data: unknown): {
  readonly input: FunctionTourCreationRequestInput;
  readonly tourId: string;
} {
  if (!isRecord(data) || typeof data.tourId !== 'string' || !data.tourId.trim()) {
    throw new HttpsError('invalid-argument', 'Tour update payload is invalid.');
  }
  const { tourId, ...tourPayload } = data;
  return { input: parseTourCreationCallableInput(tourPayload), tourId: tourId.trim() };
}

function parseAccountErasureCallableInput(data: unknown): AccountErasureRequestInput {
  try {
    return parseAccountErasureRequest(data);
  } catch (error: unknown) {
    if (error instanceof AccountErasurePlanError && error.code === 'invalid_payload') {
      throw new HttpsError('invalid-argument', error.message);
    }

    throw error;
  }
}

function parseBookingCreationCallableInput(data: unknown): FunctionBookingRequestInput {
  try {
    return parseBookingCreationRequest(data);
  } catch (error: unknown) {
    if (error instanceof BookingCreationPlanError) {
      throw new HttpsError('invalid-argument', error.message);
    }

    throw error;
  }
}

function toBookingCreationHttpsError(error: BookingCreationPlanError): HttpsError {
  if (error.code === 'invalid_payload') {
    return new HttpsError('invalid-argument', error.message);
  }

  return new HttpsError('failed-precondition', error.message);
}

function parseBookingLifecycleCallableInput(data: unknown): BookingLifecycleRequestInput {
  try {
    return parseBookingLifecycleRequest(data);
  } catch (error: unknown) {
    if (error instanceof BookingLifecyclePlanError) {
      throw new HttpsError('invalid-argument', error.message);
    }

    throw error;
  }
}

function toBookingLifecycleHttpsError(error: BookingLifecyclePlanError): HttpsError {
  if (error.code === 'invalid_payload') {
    return new HttpsError('invalid-argument', error.message);
  }

  if (error.code === 'permission_denied') {
    return new HttpsError('permission-denied', error.message);
  }

  return new HttpsError('failed-precondition', error.message);
}

function toTourCreationHttpsError(error: TourCreationPlanError): HttpsError {
  if (error.code === 'invalid_payload') {
    return new HttpsError('invalid-argument', error.message);
  }

  return new HttpsError('failed-precondition', error.message);
}

function toLifecycleFirestorePatch(patch: BookingLifecyclePatch): Record<string, unknown> {
  const updatePayload: Record<string, unknown> = {
    status: patch.status,
    updatedAt: Timestamp.fromDate(patch.updatedAt),
  };

  if (patch.cancellation) {
    updatePayload.cancellation = {
      ...patch.cancellation,
      cancelledAt: Timestamp.fromDate(patch.cancellation.cancelledAt),
    };
  }

  if (patch.checkIn) {
    updatePayload.checkIn = {
      ...patch.checkIn,
      checkedInAt: Timestamp.fromDate(patch.checkIn.checkedInAt),
    };
  }

  if (patch.checkOut) {
    updatePayload.checkOut = {
      ...patch.checkOut,
      checkedOutAt: Timestamp.fromDate(patch.checkOut.checkedOutAt),
    };
  }

  return updatePayload;
}

function toFirestoreNotification(notification: FunctionBookingNotification) {
  return {
    ...notification,
    createdAt: Timestamp.fromDate(notification.createdAt),
  };
}

function grantsPaidAccess(status: PaymentStatus): boolean {
  return status === 'approved';
}

function revokesPaidAccess(status: PaymentStatus): boolean {
  return status === 'chargeback' || status === 'expired' || status === 'refunded';
}

type PaymentResponse = {
  readonly amountCents: number;
  readonly bookingId?: string;
  readonly checkoutUrl?: string;
  readonly couponCode?: string;
  readonly createdAtIso?: string;
  readonly currency: FunctionPaymentForRead['currency'];
  readonly discountAmountCents?: number;
  readonly gateway: FunctionPaymentForRead['gateway'];
  readonly gatewayPaymentId: string;
  readonly paymentId: string;
  readonly paymentMethod: FunctionPaymentForRead['paymentMethod'];
  readonly originalAmountCents?: number;
  readonly pixCopyPaste?: string;
  readonly pixQrCode?: string;
  readonly status: PaymentStatus;
  readonly updatedAtIso?: string;
};

function toPaymentResponse(payment: FunctionPaymentForRead): PaymentResponse {
  return {
    amountCents: payment.amountCents,
    bookingId: payment.bookingId,
    checkoutUrl: payment.checkoutUrl,
    couponCode: payment.couponCode,
    createdAtIso: payment.createdAtIso,
    currency: payment.currency,
    discountAmountCents: payment.discountAmountCents,
    gateway: payment.gateway,
    gatewayPaymentId: payment.gatewayPaymentId,
    paymentId: payment.id,
    paymentMethod: payment.paymentMethod,
    originalAmountCents: payment.originalAmountCents,
    pixCopyPaste: payment.pixCopyPaste,
    pixQrCode: payment.pixQrCode,
    status: payment.status,
    updatedAtIso: payment.updatedAtIso,
  };
}

type PaymentCreationRecord = ReturnType<typeof buildPaymentCreationPlan>['payment'] & {
  readonly couponCode?: string;
  readonly couponId?: string;
  readonly couponRedemptionId?: string;
  readonly discountAmountCents?: number;
  readonly originalAmountCents?: number;
};

function toPendingPaymentFirestorePayload(
  payment: PaymentCreationRecord,
  createdAt: Date,
): Record<string, unknown> {
  return {
    ...payment,
    createdAt: Timestamp.fromDate(createdAt),
    updatedAt: Timestamp.fromDate(createdAt),
  };
}

function paymentSummary(
  payment: Pick<FunctionPaymentForRead, 'currency' | 'gateway' | 'id' | 'paymentMethod' | 'status'>,
) {
  return {
    currency: payment.currency,
    gateway: payment.gateway,
    method: payment.paymentMethod,
    paymentId: payment.id,
    status: payment.status,
  };
}

function authEmail(auth: CallableRequest['auth']): string | undefined {
  const token = auth?.token as { readonly email?: unknown } | undefined;

  return typeof token?.email === 'string' ? token.email : undefined;
}

async function completeGatewayPaymentCreation(input: {
  readonly bookingId: string;
  readonly customerEmail?: string;
  readonly db: Firestore;
  readonly payment: FunctionPaymentForRead;
}): Promise<PaymentResponse> {
  if (!input.payment.gatewayPaymentId.startsWith('pending:')) {
    return toPaymentResponse(input.payment);
  }

  const gatewayResult = await createGatewayPayment({
    amountCents: input.payment.amountCents,
    country: input.payment.country,
    currency: input.payment.currency,
    customerEmail: input.customerEmail,
    description: `Conexao Favela booking ${input.bookingId}`,
    gateway: input.payment.gateway,
    idempotencyKey: input.payment.id,
    paymentId: input.payment.id,
    paymentMethod: input.payment.paymentMethod,
  });
  const paymentRef = input.db.collection(FIRESTORE_COLLECTIONS.payments).doc(input.payment.id);
  const bookingRef = input.db.collection(FIRESTORE_COLLECTIONS.bookings).doc(input.bookingId);
  const updatedAt = new Date();

  return input.db.runTransaction(async (transaction) => {
    const [paymentSnapshot, bookingSnapshot] = await Promise.all([
      transaction.get(paymentRef),
      transaction.get(bookingRef),
    ]);
    const storedPayment = mapPaymentForRead(paymentSnapshot.id, paymentSnapshot.data() ?? {});

    if (storedPayment?.userId !== input.payment.userId) {
      throw new HttpsError('failed-precondition', 'Payment attempt could not be resumed safely.');
    }

    // A create response never grants access. Only a verified webhook may move a
    // pending payment to approved and confirm the booking.
    const status = storedPayment.status;
    const gatewayPatch: Record<string, unknown> = {
      gatewayPaymentId: gatewayResult.gatewayPaymentId,
      status,
      updatedAt: Timestamp.fromDate(updatedAt),
    };

    if (gatewayResult.checkoutUrl) gatewayPatch.checkoutUrl = gatewayResult.checkoutUrl;
    if (gatewayResult.pixCopyPaste) gatewayPatch.pixCopyPaste = gatewayResult.pixCopyPaste;
    if (gatewayResult.pixQrCode) gatewayPatch.pixQrCode = gatewayResult.pixQrCode;

    transaction.update(paymentRef, gatewayPatch);

    const storedBooking = mapBookingForPayment(bookingSnapshot.id, bookingSnapshot.data() ?? {});
    if (storedBooking?.payment?.paymentId === storedPayment.id) {
      transaction.update(bookingRef, {
        payment: paymentSummary({ ...storedPayment, status }),
        updatedAt: Timestamp.fromDate(updatedAt),
      });
    }

    return toPaymentResponse({
      ...storedPayment,
      checkoutUrl: gatewayResult.checkoutUrl ?? storedPayment.checkoutUrl,
      gatewayPaymentId: gatewayResult.gatewayPaymentId,
      pixCopyPaste: gatewayResult.pixCopyPaste ?? storedPayment.pixCopyPaste,
      pixQrCode: gatewayResult.pixQrCode ?? storedPayment.pixQrCode,
      status,
      updatedAtIso: updatedAt.toISOString(),
    });
  });
}

async function resumeBookingPayment(input: {
  readonly bookingId: string;
  readonly customerEmail?: string;
  readonly db: Firestore;
  readonly paymentId: string;
  readonly userId: string;
}): Promise<PaymentResponse> {
  const snapshot = await input.db
    .collection(FIRESTORE_COLLECTIONS.payments)
    .doc(input.paymentId)
    .get();
  const payment = mapPaymentForRead(snapshot.id, snapshot.data() ?? {});

  if (payment?.bookingId !== input.bookingId || payment.userId !== input.userId) {
    throw new HttpsError('failed-precondition', 'Existing payment attempt is inconsistent.');
  }

  return completeGatewayPaymentCreation({
    bookingId: input.bookingId,
    customerEmail: input.customerEmail,
    db: input.db,
    payment,
  });
}

function rawRequestBody(request: unknown): string {
  const maybeRawBody = (request as { readonly rawBody?: Buffer }).rawBody;

  if (Buffer.isBuffer(maybeRawBody)) {
    return maybeRawBody.toString('utf8');
  }

  const body = (request as { readonly body?: unknown }).body;

  return JSON.stringify(body ?? {});
}

function toPaymentStatusTimestamps(
  status: PaymentStatus,
  updatedAt: Date,
): Record<string, unknown> {
  if (status === 'approved') {
    return { paidAt: Timestamp.fromDate(updatedAt) };
  }

  if (status === 'refunded') {
    return { refundedAt: Timestamp.fromDate(updatedAt) };
  }

  if (status === 'chargeback') {
    return { chargebackAt: Timestamp.fromDate(updatedAt) };
  }

  return {};
}

function toExperienceHttpsError(error: ExperienceActionError): HttpsError {
  if (error.code === 'invalid_payload') return new HttpsError('invalid-argument', error.message);
  if (error.code === 'permission_denied') return new HttpsError('permission-denied', error.message);
  return new HttpsError('failed-precondition', error.message);
}

export const createChat = onCall<unknown, Promise<{ readonly chatId: string }>>(
  callableOptions,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before creating a chat.');

    try {
      const input = parseCreateChatRequest(request.data);
      const db = getFirestore();
      await enforceCallableRateLimit(db, request.auth.uid, 'create_chat', 20, 10 * 60_000);
      const bookingSnapshot = await db
        .collection(FIRESTORE_COLLECTIONS.bookings)
        .doc(input.bookingId)
        .get();
      const bookingData: unknown = bookingSnapshot.data();

      if (!bookingSnapshot.exists || !isRecord(bookingData)) {
        throw new HttpsError('not-found', 'Booking was not found.');
      }

      const guideId = typeof bookingData.guideId === 'string' ? bookingData.guideId : undefined;
      const touristId =
        typeof bookingData.touristId === 'string' ? bookingData.touristId : undefined;
      const communityId =
        typeof bookingData.communityId === 'string' ? bookingData.communityId : undefined;

      if (!guideId || !touristId || !communityId) {
        throw new HttpsError('failed-precondition', 'Booking participants are invalid.');
      }

      assertParticipant([guideId, touristId], request.auth.uid);
      const chatId = buildChatId(guideId, touristId);
      const now = Timestamp.now();
      await db
        .collection(FIRESTORE_COLLECTIONS.chats)
        .doc(chatId)
        .set(
          {
            bookingId: input.bookingId,
            communityId,
            createdAt: now,
            guideId,
            id: chatId,
            participants: [guideId, touristId],
            touristId,
            updatedAt: now,
          },
          { merge: true },
        );

      return { chatId };
    } catch (error: unknown) {
      if (error instanceof ExperienceActionError) throw toExperienceHttpsError(error);
      throw error;
    }
  },
);

export const sendChatMessage = onCall<
  unknown,
  Promise<{ readonly messageId: string; readonly sentAtIso: string }>
>(callableOptions, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before sending a message.');

  try {
    const input = parseSendChatMessageRequest(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'send_chat_message', 30, 60_000);
    const chatRef = db.collection(FIRESTORE_COLLECTIONS.chats).doc(input.chatId);
    const chatSnapshot = await chatRef.get();
    const chatData: unknown = chatSnapshot.data();

    if (!chatSnapshot.exists || !isRecord(chatData)) {
      throw new HttpsError('not-found', 'Chat was not found.');
    }

    assertParticipant(asStringArray(chatData.participants), request.auth.uid);
    const messageRef = chatRef.collection('messages').doc();
    const now = Timestamp.now();
    const message = {
      attachments: input.attachments ?? [],
      chatId: input.chatId,
      id: messageRef.id,
      read: false,
      senderId: request.auth.uid,
      sentAt: now,
      text: input.text,
    };
    const batch = db.batch();
    batch.set(messageRef, message);
    batch.update(chatRef, {
      lastMessage: {
        read: false,
        senderId: request.auth.uid,
        sentAt: now,
        text: input.text,
      },
      updatedAt: now,
    });
    await batch.commit();

    return { messageId: messageRef.id, sentAtIso: now.toDate().toISOString() };
  } catch (error: unknown) {
    if (error instanceof ExperienceActionError) throw toExperienceHttpsError(error);
    throw error;
  }
});

export const markChatRead = onCall<unknown, Promise<{ readonly updated: number }>>(
  callableOptions,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before reading a chat.');

    try {
      const input = parseMarkChatReadRequest(request.data);
      const db = getFirestore();
      const chatRef = db.collection(FIRESTORE_COLLECTIONS.chats).doc(input.chatId);
      const chatSnapshot = await chatRef.get();
      const chatData: unknown = chatSnapshot.data();
      if (!chatSnapshot.exists || !isRecord(chatData)) {
        throw new HttpsError('not-found', 'Chat was not found.');
      }
      assertParticipant(asStringArray(chatData.participants), request.auth.uid);

      const unreadSnapshot = await chatRef
        .collection('messages')
        .where('read', '==', false)
        .limit(100)
        .get();
      const unreadFromOthers = unreadSnapshot.docs.filter(
        (document) => document.data().senderId !== request.auth?.uid,
      );
      const batch = db.batch();
      const now = Timestamp.now();
      for (const document of unreadFromOthers) {
        batch.update(document.ref, { read: true, readAt: now });
      }
      const lastMessage = isRecord(chatData.lastMessage) ? chatData.lastMessage : null;
      if (lastMessage && lastMessage.senderId !== request.auth.uid && lastMessage.read !== true) {
        batch.update(chatRef, { 'lastMessage.read': true, updatedAt: now });
      }
      await batch.commit();
      return { updated: unreadFromOthers.length };
    } catch (error: unknown) {
      if (error instanceof ExperienceActionError) throw toExperienceHttpsError(error);
      throw error;
    }
  },
);

export const submitReview = onCall<unknown, Promise<{ readonly reviewId: string }>>(
  callableOptions,
  async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before reviewing a tour.');

    try {
      const input = parseSubmitReviewRequest(request.data);
      const db = getFirestore();
      const expectedPhotoPrefix = `review-media/${request.auth.uid}/${input.bookingId}/`;
      if (input.photoPaths.some((path) => !path.startsWith(expectedPhotoPrefix))) {
        throw new HttpsError(
          'permission-denied',
          'Review photos must belong to this booking owner.',
        );
      }
      await enforceCallableRateLimit(db, request.auth.uid, 'submit_review', 5, 24 * 60 * 60_000);
      const bookingRef = db.collection(FIRESTORE_COLLECTIONS.bookings).doc(input.bookingId);
      const reviewRef = db
        .collection(FIRESTORE_COLLECTIONS.reviews)
        .doc(`booking_${input.bookingId}`);

      const reviewId = await db.runTransaction(async (transaction) => {
        const [bookingSnapshot, existingReviewSnapshot] = await Promise.all([
          transaction.get(bookingRef),
          transaction.get(reviewRef),
        ]);
        const bookingData: unknown = bookingSnapshot.data();

        if (!bookingSnapshot.exists || !isRecord(bookingData)) {
          throw new HttpsError('not-found', 'Booking was not found.');
        }
        if (existingReviewSnapshot.exists || typeof bookingData.reviewId === 'string') {
          throw new HttpsError('already-exists', 'This booking already has a review.');
        }
        if (bookingData.touristId !== request.auth?.uid) {
          throw new HttpsError('permission-denied', 'Only the booking owner can review it.');
        }
        if (bookingData.status !== 'completed') {
          throw new HttpsError('failed-precondition', 'Complete checkout before reviewing.');
        }

        const tourId = typeof bookingData.tourId === 'string' ? bookingData.tourId : undefined;
        const guideId = typeof bookingData.guideId === 'string' ? bookingData.guideId : undefined;
        const communityId =
          typeof bookingData.communityId === 'string' ? bookingData.communityId : undefined;
        if (!tourId || !guideId || !communityId) {
          throw new HttpsError('failed-precondition', 'Booking review data is invalid.');
        }

        const now = Timestamp.now();
        const comment = { pt: input.comment, [input.language]: input.comment };

        transaction.set(reviewRef, {
          bookingId: input.bookingId,
          comment,
          communityId,
          createdAt: now,
          guideId,
          id: reviewRef.id,
          photos: input.photoPaths,
          rating: input.rating,
          status: 'pending_moderation',
          touristId: request.auth?.uid,
          tourId,
          updatedAt: now,
        });
        transaction.update(bookingRef, { reviewId: reviewRef.id, updatedAt: now });
        const notificationRef = db.collection(FIRESTORE_COLLECTIONS.notifications).doc();
        transaction.set(notificationRef, {
          body: {
            en: 'A traveler published a review for your tour.',
            es: 'Un viajero publico una evaluacion de tu tour.',
            pt: 'Um turista publicou uma avaliacao do seu tour.',
          },
          createdAt: now,
          data: { bookingId: input.bookingId, communityId, reviewId: reviewRef.id, tourId },
          read: false,
          title: { en: 'New review', es: 'Nueva evaluacion', pt: 'Nova avaliacao' },
          type: 'new_review',
          userId: guideId,
        });

        return reviewRef.id;
      });

      return { reviewId };
    } catch (error: unknown) {
      if (error instanceof ExperienceActionError) throw toExperienceHttpsError(error);
      throw error;
    }
  },
);

export const moderateReview = onCall<
  unknown,
  Promise<{ readonly reviewId: string; readonly status: 'published' | 'rejected' }>
>(callableOptions, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Sign in before moderating reviews.');
  if (request.auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Admin claim is required.');
  }

  try {
    const input = parseModerateReviewRequest(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'moderate_review', 120, 60 * 60_000);
    const reviewRef = db.collection(FIRESTORE_COLLECTIONS.reviews).doc(input.reviewId);
    await db.runTransaction(async (transaction) => {
      const reviewSnapshot = await transaction.get(reviewRef);
      const reviewData: unknown = reviewSnapshot.data();
      if (!reviewSnapshot.exists || !isRecord(reviewData)) {
        throw new HttpsError('not-found', 'Review was not found.');
      }
      if (reviewData.status !== 'pending_moderation') {
        throw new HttpsError('failed-precondition', 'Review was already moderated.');
      }

      const tourId = typeof reviewData.tourId === 'string' ? reviewData.tourId : undefined;
      const guideId = typeof reviewData.guideId === 'string' ? reviewData.guideId : undefined;
      const rating = asNumber(reviewData.rating);
      if (!tourId || !guideId || rating < 1 || rating > 5) {
        throw new HttpsError('failed-precondition', 'Review references are invalid.');
      }

      const now = Timestamp.now();
      if (input.status === 'published') {
        const tourRef = db.collection(FIRESTORE_COLLECTIONS.tours).doc(tourId);
        const guideRef = db.collection('public_guides').doc(guideId);
        const [tourSnapshot, guideSnapshot] = await Promise.all([
          transaction.get(tourRef),
          transaction.get(guideRef),
        ]);
        const tourData: unknown = tourSnapshot.data();
        const tourStats = isRecord(tourData) && isRecord(tourData.stats) ? tourData.stats : {};
        const nextTourStats = nextReviewStats(
          asNumber(tourStats.averageRating),
          asNumber(tourStats.totalReviews),
          rating,
        );
        transaction.update(tourRef, {
          'stats.averageRating': nextTourStats.averageRating,
          'stats.totalReviews': nextTourStats.totalReviews,
          updatedAt: now,
        });
        if (guideSnapshot.exists) {
          const guideData: unknown = guideSnapshot.data();
          const nextGuideStats = nextReviewStats(
            isRecord(guideData) ? asNumber(guideData.rating) : 0,
            isRecord(guideData) ? asNumber(guideData.totalReviews) : 0,
            rating,
          );
          transaction.update(guideRef, {
            rating: nextGuideStats.averageRating,
            totalReviews: nextGuideStats.totalReviews,
            updatedAt: now,
          });
        }
      }

      transaction.update(reviewRef, {
        moderatedAt: now,
        moderatedBy: request.auth?.uid,
        status: input.status,
        updatedAt: now,
      });
      const touristId = typeof reviewData.touristId === 'string' ? reviewData.touristId : undefined;
      if (touristId) {
        const notificationRef = db.collection(FIRESTORE_COLLECTIONS.notifications).doc();
        const approved = input.status === 'published';
        transaction.set(notificationRef, {
          body: approved
            ? {
                en: 'Your review is now visible in the community.',
                es: 'Tu evaluacion ya esta visible en la comunidad.',
                pt: 'Sua avaliacao agora esta visivel na comunidade.',
              }
            : {
                en: 'Your review did not pass community moderation.',
                es: 'Tu evaluacion no paso la moderacion comunitaria.',
                pt: 'Sua avaliacao nao passou pela moderacao comunitaria.',
              },
          createdAt: now,
          data: { reviewId: input.reviewId, status: input.status },
          read: false,
          title: approved
            ? { en: 'Review published', es: 'Evaluacion publicada', pt: 'Avaliacao publicada' }
            : { en: 'Review moderated', es: 'Evaluacion moderada', pt: 'Avaliacao moderada' },
          type: 'system',
          userId: touristId,
        });
      }
      const auditRef = db.collection(FIRESTORE_COLLECTIONS.auditLogs).doc();
      transaction.set(auditRef, {
        action: 'review_moderated',
        actorId: request.auth?.uid,
        communityId: typeof reviewData.communityId === 'string' ? reviewData.communityId : null,
        createdAt: now,
        metadata: { reviewId: input.reviewId, status: input.status },
        targetId: input.reviewId,
        targetType: 'review',
      });
    });
    return input;
  } catch (error: unknown) {
    if (error instanceof ExperienceActionError) throw toExperienceHttpsError(error);
    throw error;
  }
});

export const createMarketplaceInquiry = onCall<unknown, Promise<{ readonly inquiryId: string }>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before contacting a local provider.');
    }
    try {
      const input = parseMarketplaceInquiryRequest(request.data);
      const db = getFirestore();
      await enforceCallableRateLimit(
        db,
        request.auth.uid,
        'marketplace_inquiry',
        10,
        24 * 60 * 60_000,
      );
      const itemSnapshot = await db
        .collection(FIRESTORE_COLLECTIONS.marketplaceItems)
        .doc(input.itemId)
        .get();
      const itemData: unknown = itemSnapshot.data();
      if (!itemSnapshot.exists || !isRecord(itemData) || itemData.status !== 'published') {
        throw new HttpsError('not-found', 'Marketplace item is unavailable.');
      }
      const communityId =
        typeof itemData.communityId === 'string' ? itemData.communityId : undefined;
      const providerId = typeof itemData.providerId === 'string' ? itemData.providerId : undefined;
      if (!communityId || !providerId) {
        throw new HttpsError('failed-precondition', 'Marketplace provider data is invalid.');
      }

      const inquiryRef = db.collection(FIRESTORE_COLLECTIONS.marketplaceInquiries).doc();
      const now = Timestamp.now();
      const batch = db.batch();
      batch.set(inquiryRef, {
        communityId,
        createdAt: now,
        id: inquiryRef.id,
        itemId: input.itemId,
        message: input.message,
        providerId,
        status: 'new',
        updatedAt: now,
        userId: request.auth.uid,
      });
      batch.set(db.collection(FIRESTORE_COLLECTIONS.notifications).doc(), {
        body: {
          en: 'A traveler requested availability for one of your local offers.',
          es: 'Un viajero solicito disponibilidad para una de tus ofertas locales.',
          pt: 'Um turista pediu disponibilidade para uma de suas ofertas locais.',
        },
        createdAt: now,
        data: { inquiryId: inquiryRef.id, itemId: input.itemId },
        read: false,
        title: { en: 'New request', es: 'Nueva solicitud', pt: 'Novo pedido' },
        type: 'system',
        userId: providerId,
      });
      await batch.commit();
      return { inquiryId: inquiryRef.id };
    } catch (error: unknown) {
      if (error instanceof MarketplaceActionError) {
        throw new HttpsError('invalid-argument', error.message);
      }
      throw error;
    }
  },
);

export const approveGuide = onCall<unknown, Promise<GuideApprovalResponse>>(
  callableOptions,
  async (request) => {
    if (!request.auth || !hasAdminClaim(request.auth)) {
      throw new HttpsError('permission-denied', 'Only admins can approve guides.');
    }

    const input = parseGuideApprovalCallableInput(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'approve_guide', 60, 60 * 60_000);
    const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(input.guideId);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Guide application was not found.');
    }

    const auditLogRef = db.collection(FIRESTORE_COLLECTIONS.auditLogs).doc();

    try {
      const plan = buildGuideApprovalPlan(asUser(snapshot.id, snapshot.data() ?? {}), {
        actorId: request.auth.uid,
        auditLogId: auditLogRef.id,
      });

      if (plan.status === 'already_approved') {
        return plan.response;
      }

      if (!plan.response.verifiedAtIso) {
        throw new HttpsError('internal', 'Approval timestamp was not generated.');
      }

      const verifiedAt = Timestamp.fromDate(new Date(plan.response.verifiedAtIso));
      const auditCreatedAt = Timestamp.fromDate(plan.auditLog.createdAt);
      const batch = db.batch();

      batch.update(userRef, {
        'guideProfile.verified': true,
        'guideProfile.verifiedAt': verifiedAt,
        updatedAt: verifiedAt,
      });
      batch.set(auditLogRef, {
        ...plan.auditLog,
        createdAt: auditCreatedAt,
      });

      await batch.commit();

      return plan.response;
    } catch (error: unknown) {
      if (error instanceof GuideApprovalPlanError && error.code === 'invalid_guide') {
        throw new HttpsError('failed-precondition', error.message);
      }

      throw error;
    }
  },
);

export const updateBookingStatus = onCall<unknown, Promise<BookingLifecyclePlan['response']>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before updating a booking.');
    }

    const auth = request.auth;
    const input = parseBookingLifecycleCallableInput(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, auth.uid, 'update_booking_status', 30, 10 * 60_000);
    const bookingRef = db.collection(FIRESTORE_COLLECTIONS.bookings).doc(input.bookingId);

    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(bookingRef);

      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Booking was not found.');
      }

      const booking = mapBookingForLifecycle(snapshot.id, snapshot.data() ?? {});

      if (!booking) {
        throw new HttpsError('failed-precondition', 'Booking data is not operational.');
      }

      const actor = resolveBookingLifecycleActor(booking, auth.uid, hasAdminClaim(auth));

      if (!actor) {
        throw new HttpsError('permission-denied', 'Only booking participants can update it.');
      }

      try {
        const plan = buildBookingLifecyclePlan(input, booking, { actor });
        const notificationContext = {
          bookingId: booking.id,
          communityId: booking.communityId,
          guideId: booking.guideId,
          touristId: booking.touristId,
          tourId: booking.tourId,
        };
        const notifications =
          plan.patch.status === 'confirmed'
            ? buildBookingConfirmedNotifications(notificationContext, {
                createdAt: plan.patch.updatedAt,
              })
            : plan.patch.status === 'cancelled'
              ? buildBookingCancelledNotifications(notificationContext, {
                  createdAt: plan.patch.updatedAt,
                })
              : [];

        transaction.update(bookingRef, toLifecycleFirestorePatch(plan.patch));

        for (const notification of notifications) {
          transaction.set(
            db.collection(FIRESTORE_COLLECTIONS.notifications).doc(),
            toFirestoreNotification(notification),
          );
        }

        return plan.response;
      } catch (error: unknown) {
        if (error instanceof BookingLifecyclePlanError) {
          throw toBookingLifecycleHttpsError(error);
        }

        throw error;
      }
    });
  },
);

export const createTour = onCall<unknown, Promise<TourCreationPlan['response']>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in as a verified guide before creating tours.');
    }

    const input = parseTourCreationCallableInput(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'create_tour', 10, 60 * 60_000);
    const guideSnapshot = await db
      .collection(FIRESTORE_COLLECTIONS.users)
      .doc(request.auth.uid)
      .get();

    if (!guideSnapshot.exists) {
      throw new HttpsError('not-found', 'Guide profile was not found.');
    }

    const poiSnapshots = await db.getAll(
      ...input.poiIds.map((poiId) =>
        db.collection(FIRESTORE_COLLECTIONS.pointsOfInterest).doc(poiId),
      ),
    );
    const pois = poiSnapshots
      .map((snapshot) =>
        snapshot.exists ? mapPoiForTourCreation(snapshot.id, snapshot.data() ?? {}) : null,
      )
      .filter((poi): poi is NonNullable<typeof poi> => poi !== null);
    const tourRef = db.collection(FIRESTORE_COLLECTIONS.tours).doc();

    try {
      const plan = buildTourCreationPlan(
        input,
        asTourCreationGuide(guideSnapshot.id, guideSnapshot.data() ?? {}),
        pois,
        { tourId: tourRef.id },
      );

      await tourRef.set({
        ...plan.tour,
        createdAt: Timestamp.fromDate(plan.tour.createdAt),
        updatedAt: Timestamp.fromDate(plan.tour.updatedAt),
      });

      return plan.response;
    } catch (error: unknown) {
      if (error instanceof TourCreationPlanError) {
        throw toTourCreationHttpsError(error);
      }

      throw error;
    }
  },
);

export const updateTour = onCall<unknown, Promise<TourCreationPlan['response']>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in as a verified guide before editing tours.');
    }
    const { input, tourId } = parseTourUpdateCallableInput(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'update_tour', 20, 60 * 60_000);
    const [guideSnapshot, tourSnapshot] = await Promise.all([
      db.collection(FIRESTORE_COLLECTIONS.users).doc(request.auth.uid).get(),
      db.collection(FIRESTORE_COLLECTIONS.tours).doc(tourId).get(),
    ]);
    if (!guideSnapshot.exists || !tourSnapshot.exists) {
      throw new HttpsError('not-found', 'Guide or tour was not found.');
    }
    const existingData: unknown = tourSnapshot.data();
    if (!isRecord(existingData) || existingData.guideId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Only the tour owner can edit it.');
    }
    const poiSnapshots = await db.getAll(
      ...input.poiIds.map((poiId) =>
        db.collection(FIRESTORE_COLLECTIONS.pointsOfInterest).doc(poiId),
      ),
    );
    const pois = poiSnapshots
      .map((snapshot) =>
        snapshot.exists ? mapPoiForTourCreation(snapshot.id, snapshot.data() ?? {}) : null,
      )
      .filter((poi): poi is NonNullable<typeof poi> => poi !== null);

    try {
      const plan = buildTourCreationPlan(
        input,
        asTourCreationGuide(guideSnapshot.id, guideSnapshot.data() ?? {}),
        pois,
        { tourId },
      );
      const updatePayload: Record<string, unknown> = {
        ...plan.tour,
        createdAt: existingData.createdAt ?? Timestamp.fromDate(plan.tour.createdAt),
        media: isRecord(existingData.media) ? existingData.media : plan.tour.media,
        stats: isRecord(existingData.stats) ? existingData.stats : plan.tour.stats,
        updatedAt: Timestamp.fromDate(plan.tour.updatedAt),
      };
      if (isRecord(existingData.paymentPrices)) {
        updatePayload.paymentPrices = existingData.paymentPrices;
      }
      await tourSnapshot.ref.set(updatePayload);
      return plan.response;
    } catch (error: unknown) {
      if (error instanceof TourCreationPlanError) throw toTourCreationHttpsError(error);
      throw error;
    }
  },
);

export const createBooking = onCall<unknown, Promise<BookingCreationPlan['response']>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before creating a booking.');
    }

    const input = parseBookingCreationCallableInput(request.data);
    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'create_booking', 20, 60 * 60_000);
    const tourSnapshot = await db.collection(FIRESTORE_COLLECTIONS.tours).doc(input.tourId).get();

    if (!tourSnapshot.exists) {
      throw new HttpsError('not-found', 'Tour was not found.');
    }

    const tour = mapTourForBooking(tourSnapshot.id, tourSnapshot.data() ?? {});

    if (!tour) {
      throw new HttpsError('failed-precondition', 'Tour data is not bookable.');
    }

    const firstRoutePoint = [...tour.route.points].sort(
      (first, second) => first.order - second.order,
    )[0];

    if (!firstRoutePoint) {
      throw new HttpsError('failed-precondition', 'Tour route does not have a meeting point.');
    }

    const poiSnapshot = await db
      .collection(FIRESTORE_COLLECTIONS.pointsOfInterest)
      .doc(firstRoutePoint.poiId)
      .get();

    if (!poiSnapshot.exists) {
      throw new HttpsError('failed-precondition', 'Tour meeting point was not found.');
    }

    const meetingPoint = mapPoiForBooking(poiSnapshot.id, poiSnapshot.data() ?? {});

    if (!meetingPoint) {
      throw new HttpsError('failed-precondition', 'Tour meeting point data is invalid.');
    }

    const bookingRef = db.collection(FIRESTORE_COLLECTIONS.bookings).doc();

    try {
      const plan = buildBookingCreationPlan(input, tour, meetingPoint, {
        bookingId: bookingRef.id,
        touristId: request.auth.uid,
      });
      const booking = plan.booking;
      const batch = db.batch();

      batch.set(bookingRef, {
        ...booking,
        createdAt: Timestamp.fromDate(booking.createdAt),
        scheduledFor: Timestamp.fromDate(booking.scheduledFor),
        updatedAt: Timestamp.fromDate(booking.updatedAt),
      });

      for (const notification of buildBookingCreatedNotifications(
        {
          bookingId: booking.id,
          communityId: booking.communityId,
          guideId: booking.guideId,
          touristId: booking.touristId,
          tourId: booking.tourId,
        },
        { createdAt: booking.createdAt },
      )) {
        batch.set(
          db.collection(FIRESTORE_COLLECTIONS.notifications).doc(),
          toFirestoreNotification(notification),
        );
      }

      await batch.commit();

      return plan.response;
    } catch (error: unknown) {
      if (error instanceof BookingCreationPlanError) {
        throw toBookingCreationHttpsError(error);
      }

      throw error;
    }
  },
);

function toPaymentHttpsError(error: PaymentPlanError): HttpsError {
  if (error.code === 'invalid_payload') {
    return new HttpsError('invalid-argument', error.message);
  }

  if (error.code === 'permission_denied') {
    return new HttpsError('permission-denied', error.message);
  }

  return new HttpsError('failed-precondition', error.message);
}

type CouponReservation = {
  readonly couponCode: string;
  readonly couponId: string;
  readonly discountAmountCents: number;
  readonly finalAmountCents: number;
  readonly originalAmountCents: number;
  readonly redemptionId: string;
};

async function reserveCouponForPayment(input: {
  readonly amountCents: number;
  readonly bookingId: string;
  readonly code: string;
  readonly currency: FunctionPaymentForRead['currency'];
  readonly db: Firestore;
  readonly tourId: string;
  readonly userId: string;
}): Promise<CouponReservation> {
  const snapshot = await input.db
    .collection(FIRESTORE_COLLECTIONS.coupons)
    .where('code', '==', input.code)
    .where('active', '==', true)
    .limit(1)
    .get();
  const couponDocument = snapshot.docs[0];
  if (!couponDocument) throw new HttpsError('not-found', 'Coupon was not found.');

  const couponRef = couponDocument.ref;
  const redemptionId = `${input.userId}_${input.bookingId}_${couponDocument.id}`;
  const redemptionRef = input.db
    .collection(FIRESTORE_COLLECTIONS.couponRedemptions)
    .doc(redemptionId);

  return input.db.runTransaction(async (transaction) => {
    const [freshCouponSnapshot, redemptionSnapshot] = await Promise.all([
      transaction.get(couponRef),
      transaction.get(redemptionRef),
    ]);
    const coupon = mapCouponForPayment(freshCouponSnapshot.id, freshCouponSnapshot.data() ?? {});
    if (!coupon) throw new HttpsError('failed-precondition', 'Coupon data is invalid.');
    const redemptionData: unknown = redemptionSnapshot.data();
    if (
      redemptionSnapshot.exists &&
      isRecord(redemptionData) &&
      (redemptionData.status === 'applied' || redemptionData.status === 'consumed')
    ) {
      throw new HttpsError('already-exists', 'Coupon is already reserved for this booking.');
    }

    const discount = calculateCouponDiscount({
      amountCents: input.amountCents,
      coupon,
      currency: input.currency,
      tourId: input.tourId,
    });
    const now = Timestamp.now();
    transaction.update(couponRef, {
      redeemedCount: coupon.redeemedCount + 1,
      updatedAt: now,
    });
    transaction.set(redemptionRef, {
      bookingId: input.bookingId,
      code: coupon.code,
      couponId: coupon.id,
      createdAt: now,
      currency: input.currency,
      discountAmountCents: discount.discountAmountCents,
      id: redemptionId,
      status: 'applied',
      updatedAt: now,
      userId: input.userId,
    });

    return {
      couponCode: coupon.code,
      couponId: coupon.id,
      discountAmountCents: discount.discountAmountCents,
      finalAmountCents: discount.finalAmountCents,
      originalAmountCents: input.amountCents,
      redemptionId,
    };
  });
}

async function releaseCouponReservation(
  db: Firestore,
  reservation: CouponReservation,
): Promise<void> {
  const redemptionRef = db
    .collection(FIRESTORE_COLLECTIONS.couponRedemptions)
    .doc(reservation.redemptionId);
  const couponRef = db.collection(FIRESTORE_COLLECTIONS.coupons).doc(reservation.couponId);
  await db.runTransaction(async (transaction) => {
    const [redemptionSnapshot, couponSnapshot] = await Promise.all([
      transaction.get(redemptionRef),
      transaction.get(couponRef),
    ]);
    const redemptionData: unknown = redemptionSnapshot.data();
    const couponData: unknown = couponSnapshot.data();
    if (!isRecord(redemptionData) || redemptionData.status !== 'applied') return;
    transaction.update(redemptionRef, { status: 'released', updatedAt: Timestamp.now() });
    if (isRecord(couponData)) {
      transaction.update(couponRef, {
        redeemedCount: Math.max(0, asNumber(couponData.redeemedCount) - 1),
        updatedAt: Timestamp.now(),
      });
    }
  });
}

export const createPayment = onCall<unknown, Promise<PaymentResponse>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before creating a payment.');
    }

    const userId = request.auth.uid;

    let input;

    try {
      input = parseCreatePaymentRequest(request.data);
    } catch (error: unknown) {
      if (error instanceof PaymentPlanError) {
        throw toPaymentHttpsError(error);
      }

      throw error;
    }

    const db = getFirestore();
    await enforceCallableRateLimit(db, userId, 'create_payment', 10, 10 * 60_000);
    const bookingRef = db.collection(FIRESTORE_COLLECTIONS.bookings).doc(input.bookingId);
    const bookingSnapshot = await bookingRef.get();

    if (!bookingSnapshot.exists) {
      throw new HttpsError('not-found', 'Booking was not found.');
    }

    const booking = mapBookingForPayment(bookingSnapshot.id, bookingSnapshot.data() ?? {});

    if (!booking) {
      throw new HttpsError('failed-precondition', 'Booking data is not payable.');
    }

    const customerEmail = authEmail(request.auth);
    if (booking.payment?.status === 'pending') {
      return resumeBookingPayment({
        bookingId: booking.id,
        customerEmail,
        db,
        paymentId: booking.payment.paymentId,
        userId,
      });
    }

    const tourSnapshot = await db.collection(FIRESTORE_COLLECTIONS.tours).doc(booking.tourId).get();

    if (!tourSnapshot.exists) {
      throw new HttpsError('not-found', 'Tour was not found.');
    }

    const tour = mapTourForPayment(tourSnapshot.id, tourSnapshot.data() ?? {});

    if (!tour) {
      throw new HttpsError('failed-precondition', 'Tour payment data is invalid.');
    }

    const paymentRef = db.collection(FIRESTORE_COLLECTIONS.payments).doc();
    let couponReservation: CouponReservation | undefined;
    let ownsPaymentClaim = false;

    try {
      const plan = buildPaymentCreationPlan(input, booking, tour, {
        paymentId: paymentRef.id,
        userId,
      });
      couponReservation = input.couponCode
        ? await reserveCouponForPayment({
            amountCents: plan.payment.amountCents,
            bookingId: booking.id,
            code: input.couponCode,
            currency: plan.payment.currency,
            db,
            tourId: booking.tourId,
            userId,
          })
        : undefined;
      const payment: PaymentCreationRecord = couponReservation
        ? {
            ...plan.payment,
            amountCents: couponReservation.finalAmountCents,
            couponCode: couponReservation.couponCode,
            couponId: couponReservation.couponId,
            couponRedemptionId: couponReservation.redemptionId,
            discountAmountCents: couponReservation.discountAmountCents,
            originalAmountCents: couponReservation.originalAmountCents,
          }
        : plan.payment;
      const createdAt = new Date();
      const claim = await db.runTransaction(async (transaction) => {
        const freshBookingSnapshot = await transaction.get(bookingRef);
        const freshBooking = mapBookingForPayment(
          freshBookingSnapshot.id,
          freshBookingSnapshot.data() ?? {},
        );

        if (!freshBooking) {
          throw new HttpsError('failed-precondition', 'Booking data is not payable.');
        }

        if (freshBooking.payment?.status === 'pending') {
          return { claimed: false as const, paymentId: freshBooking.payment.paymentId };
        }

        const freshPlan = buildPaymentCreationPlan(input, freshBooking, tour, {
          paymentId: paymentRef.id,
          userId,
        });
        if (freshPlan.payment.amountCents !== plan.payment.amountCents) {
          throw new HttpsError(
            'aborted',
            'Booking changed while payment was being prepared. Try again.',
          );
        }

        transaction.set(paymentRef, toPendingPaymentFirestorePayload(payment, createdAt));
        transaction.update(bookingRef, {
          payment: paymentSummary(payment),
          updatedAt: Timestamp.fromDate(createdAt),
        });
        if (couponReservation) {
          transaction.update(
            db
              .collection(FIRESTORE_COLLECTIONS.couponRedemptions)
              .doc(couponReservation.redemptionId),
            { paymentId: paymentRef.id, updatedAt: Timestamp.fromDate(createdAt) },
          );
        }

        return { claimed: true as const, paymentId: paymentRef.id };
      });

      ownsPaymentClaim = claim.claimed;
      if (!claim.claimed) {
        if (couponReservation) {
          await releaseCouponReservation(db, couponReservation);
          couponReservation = undefined;
        }

        return await resumeBookingPayment({
          bookingId: booking.id,
          customerEmail,
          db,
          paymentId: claim.paymentId,
          userId,
        });
      }

      return await completeGatewayPaymentCreation({
        bookingId: booking.id,
        customerEmail,
        db,
        payment: {
          ...payment,
          createdAtIso: createdAt.toISOString(),
          updatedAtIso: createdAt.toISOString(),
        },
      });
    } catch (error: unknown) {
      if (error instanceof PaymentPlanError) {
        throw toPaymentHttpsError(error);
      }

      if (couponReservation && !ownsPaymentClaim) {
        await releaseCouponReservation(db, couponReservation).catch(() => undefined);
      }

      if (error instanceof CouponActionError) {
        throw new HttpsError('failed-precondition', error.message);
      }

      throw error;
    }
  },
);

export const getPaymentStatus = onCall<unknown, Promise<PaymentResponse>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before reading a payment.');
    }

    let input;

    try {
      input = parseGetPaymentStatusRequest(request.data);
    } catch (error: unknown) {
      if (error instanceof PaymentPlanError) {
        throw toPaymentHttpsError(error);
      }

      throw error;
    }

    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'get_payment_status', 60, 60_000);
    const snapshot = await db.collection(FIRESTORE_COLLECTIONS.payments).doc(input.paymentId).get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Payment was not found.');
    }

    const payment = mapPaymentForRead(snapshot.id, snapshot.data() ?? {});

    if (!payment) {
      throw new HttpsError('failed-precondition', 'Payment data is invalid.');
    }

    if (payment.userId !== request.auth.uid && !hasAdminClaim(request.auth)) {
      throw new HttpsError('permission-denied', 'Only the payment owner can read it.');
    }

    return toPaymentResponse(payment);
  },
);

export const listUserPayments = onCall<unknown, Promise<readonly PaymentResponse[]>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before reading payments.');
    }

    const db = getFirestore();
    await enforceCallableRateLimit(db, request.auth.uid, 'list_user_payments', 30, 60_000);
    const snapshot = await db
      .collection(FIRESTORE_COLLECTIONS.payments)
      .where('userId', '==', request.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    return snapshot.docs
      .map((document) => mapPaymentForRead(document.id, document.data()))
      .filter((payment): payment is FunctionPaymentForRead => payment !== null)
      .map(toPaymentResponse);
  },
);

function webhookEventDocId(eventId: string): string {
  return eventId.replaceAll('/', '_');
}

export const paymentsWebhook = onRequest(
  { region: 'southamerica-east1' },
  async (request, response) => {
    const gatewayParam = request.query.gateway;
    const gateway =
      gatewayParam === 'mercado_pago' || gatewayParam === 'stripe' ? gatewayParam : undefined;

    if (!gateway) {
      response.status(400).json({ ok: false, error: 'Invalid payment gateway.' });
      return;
    }

    const rawBody = rawRequestBody(request);

    let webhook;

    try {
      webhook = await parseGatewayWebhook({
        gateway,
        queryDataId:
          typeof request.query['data.id'] === 'string' ? request.query['data.id'] : undefined,
        rawBody,
        requestId:
          typeof request.headers['x-request-id'] === 'string'
            ? request.headers['x-request-id']
            : undefined,
        signatureHeader:
          gateway === 'stripe'
            ? typeof request.headers['stripe-signature'] === 'string'
              ? request.headers['stripe-signature']
              : undefined
            : typeof request.headers['x-signature'] === 'string'
              ? request.headers['x-signature']
              : undefined,
      });
    } catch (error: unknown) {
      response.status(401).json({
        ok: false,
        error: error instanceof Error ? error.message : 'Invalid webhook.',
      });
      return;
    }

    const db = getFirestore();
    const paymentRef = webhook.localPaymentId
      ? db.collection(FIRESTORE_COLLECTIONS.payments).doc(webhook.localPaymentId)
      : webhook.gatewayPaymentId
        ? (
            await db
              .collection(FIRESTORE_COLLECTIONS.payments)
              .where('gateway', '==', webhook.gateway)
              .where('gatewayPaymentId', '==', webhook.gatewayPaymentId)
              .limit(1)
              .get()
          ).docs[0]?.ref
        : undefined;
    const eventRef = db
      .collection(FIRESTORE_COLLECTIONS.webhookEvents)
      .doc(webhookEventDocId(webhook.eventId));
    const updatedAt = new Date();

    await db.runTransaction(async (transaction) => {
      const eventSnapshot = await transaction.get(eventRef);

      if (eventSnapshot.exists) {
        return;
      }

      if (!paymentRef) {
        transaction.set(eventRef, {
          createdAt: Timestamp.fromDate(updatedAt),
          gateway: webhook.gateway,
          gatewayEventId: webhook.eventId,
          paymentId: webhook.localPaymentId,
          status: 'received',
        });
        return;
      }

      const paymentSnapshot = await transaction.get(paymentRef);

      if (!paymentSnapshot.exists) {
        transaction.set(eventRef, {
          createdAt: Timestamp.fromDate(updatedAt),
          gateway: webhook.gateway,
          gatewayEventId: webhook.eventId,
          paymentId: paymentRef.id,
          status: 'received',
        });
        return;
      }

      const payment = mapPaymentForRead(paymentSnapshot.id, paymentSnapshot.data() ?? {});

      if (!payment) {
        transaction.set(eventRef, {
          createdAt: Timestamp.fromDate(updatedAt),
          gateway: webhook.gateway,
          gatewayEventId: webhook.eventId,
          paymentId: paymentRef.id,
          status: 'received',
        });
        return;
      }

      const gatewayAmountMatches =
        webhook.amountCents === undefined || webhook.amountCents === payment.amountCents;
      const gatewayCurrencyMatches =
        webhook.currency === undefined || webhook.currency === payment.currency;

      if (!gatewayAmountMatches || !gatewayCurrencyMatches) {
        transaction.set(eventRef, {
          createdAt: Timestamp.fromDate(updatedAt),
          gateway: webhook.gateway,
          gatewayEventId: webhook.eventId,
          paymentId: payment.id,
          status: 'rejected_amount_or_currency_mismatch',
        });
        return;
      }

      const nextPaymentStatus = resolvePaymentStatusTransition(payment.status, webhook.status);
      if (nextPaymentStatus === payment.status) {
        transaction.set(eventRef, {
          createdAt: Timestamp.fromDate(updatedAt),
          currentStatus: payment.status,
          gateway: webhook.gateway,
          gatewayEventId: webhook.eventId,
          incomingStatus: webhook.status,
          paymentId: payment.id,
          status:
            webhook.status === payment.status
              ? 'ignored_duplicate_status'
              : 'ignored_status_transition',
        });
        return;
      }

      const bookingRef = payment.bookingId
        ? db.collection(FIRESTORE_COLLECTIONS.bookings).doc(payment.bookingId)
        : undefined;
      const bookingSnapshot = bookingRef ? await transaction.get(bookingRef) : undefined;
      const booking = bookingSnapshot?.exists
        ? mapBookingForPayment(bookingSnapshot.id, bookingSnapshot.data() ?? {})
        : null;
      const accessRef = booking
        ? db.collection(FIRESTORE_COLLECTIONS.accesses).doc(`booking_${booking.id}`)
        : undefined;
      const accessSnapshot = accessRef ? await transaction.get(accessRef) : undefined;
      const redemptionRef = payment.couponRedemptionId
        ? db.collection(FIRESTORE_COLLECTIONS.couponRedemptions).doc(payment.couponRedemptionId)
        : undefined;
      const redemptionSnapshot = redemptionRef ? await transaction.get(redemptionRef) : undefined;
      const redemptionData: unknown = redemptionSnapshot?.data();

      const paymentPatch: Record<string, unknown> = {
        gatewayPaymentId: webhook.gatewayPaymentId ?? payment.gatewayPaymentId,
        status: nextPaymentStatus,
        updatedAt: Timestamp.fromDate(updatedAt),
        ...toPaymentStatusTimestamps(nextPaymentStatus, updatedAt),
      };
      transaction.update(paymentRef, paymentPatch);

      const redemptionStatus =
        isRecord(redemptionData) &&
        (redemptionData.status === 'applied' ||
          redemptionData.status === 'consumed' ||
          redemptionData.status === 'released')
          ? redemptionData.status
          : undefined;
      const redemptionTransition = redemptionStatus
        ? resolveCouponRedemptionTransition(redemptionStatus, nextPaymentStatus)
        : null;
      if (redemptionRef && redemptionTransition) {
        transaction.update(redemptionRef, {
          status: redemptionTransition.status,
          updatedAt: Timestamp.fromDate(updatedAt),
        });
        if (redemptionTransition.decrementQuota && payment.couponId) {
          transaction.update(db.collection(FIRESTORE_COLLECTIONS.coupons).doc(payment.couponId), {
            redeemedCount: FieldValue.increment(-1),
            updatedAt: Timestamp.fromDate(updatedAt),
          });
        }
      }

      if (bookingRef && booking) {
        if (!accessRef) {
          throw new HttpsError('internal', 'Booking access reference could not be created.');
        }
        const bookingPaymentSummary = paymentSummary({
          currency: payment.currency,
          gateway: payment.gateway,
          id: payment.id,
          paymentMethod: payment.paymentMethod,
          status: nextPaymentStatus,
        });

        if (grantsPaidAccess(nextPaymentStatus)) {
          transaction.update(bookingRef, {
            payment: bookingPaymentSummary,
            status: 'confirmed',
            updatedAt: Timestamp.fromDate(updatedAt),
          });
          transaction.set(
            accessRef,
            {
              bookingId: booking.id,
              createdAt: Timestamp.fromDate(updatedAt),
              gatewaySubscriptionId: null,
              id: `booking_${booking.id}`,
              paymentId: payment.id,
              planId: booking.tourId,
              startsAt: Timestamp.fromDate(updatedAt),
              status: 'active',
              updatedAt: Timestamp.fromDate(updatedAt),
              userId: payment.userId,
            },
            { merge: true },
          );

          for (const notification of buildBookingConfirmedNotifications(
            {
              bookingId: booking.id,
              communityId: booking.communityId,
              guideId: booking.guideId,
              touristId: booking.touristId,
              tourId: booking.tourId,
            },
            { createdAt: updatedAt },
          )) {
            transaction.set(
              db.collection(FIRESTORE_COLLECTIONS.notifications).doc(),
              toFirestoreNotification(notification),
            );
          }
        } else if (revokesPaidAccess(nextPaymentStatus)) {
          const revokedAccessStatus =
            nextPaymentStatus === 'chargeback'
              ? 'chargeback'
              : nextPaymentStatus === 'expired'
                ? 'expired'
                : 'refunded';
          if (accessSnapshot?.exists) {
            transaction.set(
              accessRef,
              {
                paymentId: payment.id,
                status: revokedAccessStatus,
                updatedAt: Timestamp.fromDate(updatedAt),
              },
              { merge: true },
            );
          }

          if (booking.status !== 'completed' && booking.status !== 'cancelled') {
            transaction.update(bookingRef, {
              cancellation: {
                cancelledAt: Timestamp.fromDate(updatedAt),
                cancelledBy: 'admin',
                reason: `Payment ${nextPaymentStatus}`,
                refundIssued: nextPaymentStatus === 'refunded',
              },
              payment: bookingPaymentSummary,
              status: 'cancelled',
              updatedAt: Timestamp.fromDate(updatedAt),
            });

            for (const notification of buildBookingCancelledNotifications(
              {
                bookingId: booking.id,
                communityId: booking.communityId,
                guideId: booking.guideId,
                touristId: booking.touristId,
                tourId: booking.tourId,
              },
              { createdAt: updatedAt },
            )) {
              transaction.set(
                db.collection(FIRESTORE_COLLECTIONS.notifications).doc(),
                toFirestoreNotification(notification),
              );
            }
          } else {
            transaction.update(bookingRef, {
              payment: bookingPaymentSummary,
              updatedAt: Timestamp.fromDate(updatedAt),
            });
          }
        } else {
          transaction.update(bookingRef, {
            payment: bookingPaymentSummary,
            updatedAt: Timestamp.fromDate(updatedAt),
          });
        }
      }

      transaction.set(eventRef, {
        createdAt: Timestamp.fromDate(updatedAt),
        gateway: webhook.gateway,
        gatewayEventId: webhook.eventId,
        paymentId: payment.id,
        status: 'processed',
      });
    });

    response.status(200).json({ ok: true });
  },
);

async function deletePrivateStorageFiles(paths: readonly string[]) {
  const bucket = getStorage().bucket();
  const deletionResults = await Promise.allSettled(
    paths.map(async (path) => bucket.file(path).delete()),
  );

  return deletionResults.filter((result) => result.status === 'fulfilled').length;
}

async function deleteStoragePrefix(prefix: string): Promise<number> {
  const [files] = await getStorage().bucket().getFiles({ prefix });
  const results = await Promise.allSettled(files.map(async (file) => file.delete()));
  return results.filter((result) => result.status === 'fulfilled').length;
}

async function eraseRelatedUserData(
  db: Firestore,
  userId: string,
  anonymizedUserId: string,
  erasedAt: Timestamp,
): Promise<number> {
  const [
    notifications,
    payments,
    touristBookings,
    touristReviews,
    userInquiries,
    providerInquiries,
    marketplaceItems,
    guideTours,
    chats,
  ] = await Promise.all([
    db.collection(FIRESTORE_COLLECTIONS.notifications).where('userId', '==', userId).get(),
    db.collection(FIRESTORE_COLLECTIONS.payments).where('userId', '==', userId).get(),
    db.collection(FIRESTORE_COLLECTIONS.bookings).where('touristId', '==', userId).get(),
    db.collection(FIRESTORE_COLLECTIONS.reviews).where('touristId', '==', userId).get(),
    db.collection(FIRESTORE_COLLECTIONS.marketplaceInquiries).where('userId', '==', userId).get(),
    db
      .collection(FIRESTORE_COLLECTIONS.marketplaceInquiries)
      .where('providerId', '==', userId)
      .get(),
    db.collection(FIRESTORE_COLLECTIONS.marketplaceItems).where('providerId', '==', userId).get(),
    db.collection(FIRESTORE_COLLECTIONS.tours).where('guideId', '==', userId).get(),
    db
      .collection(FIRESTORE_COLLECTIONS.chats)
      .where('participants', 'array-contains', userId)
      .get(),
  ]);

  const writer = db.bulkWriter();
  const writePromises: Promise<unknown>[] = [];
  for (const document of notifications.docs) writePromises.push(writer.delete(document.ref));
  for (const document of payments.docs) {
    writePromises.push(
      writer.update(document.ref, { updatedAt: erasedAt, userId: anonymizedUserId }),
    );
  }
  for (const document of touristBookings.docs) {
    writePromises.push(
      writer.update(document.ref, {
        notes: FieldValue.delete(),
        shareableLink: '',
        touristId: anonymizedUserId,
        touristsInfo: [],
        updatedAt: erasedAt,
      }),
    );
  }
  for (const document of touristReviews.docs) {
    writePromises.push(
      writer.update(document.ref, {
        comment: { pt: 'Comentario removido por solicitacao de privacidade.' },
        photos: [],
        touristId: anonymizedUserId,
        updatedAt: erasedAt,
      }),
    );
  }
  const inquiriesById = new Map(
    [...userInquiries.docs, ...providerInquiries.docs].map((document) => [document.id, document]),
  );
  for (const document of inquiriesById.values()) {
    const data: unknown = document.data();
    const currentProviderId =
      isRecord(data) && typeof data.providerId === 'string' ? data.providerId : '';
    const currentUserId = isRecord(data) && typeof data.userId === 'string' ? data.userId : '';
    writePromises.push(
      writer.update(document.ref, {
        message: 'Conteudo removido por solicitacao de privacidade.',
        providerId: currentProviderId === userId ? anonymizedUserId : currentProviderId,
        status: 'closed',
        updatedAt: erasedAt,
        userId: currentUserId === userId ? anonymizedUserId : currentUserId,
      }),
    );
  }
  for (const document of marketplaceItems.docs) {
    writePromises.push(
      writer.update(document.ref, {
        providerId: anonymizedUserId,
        status: 'paused',
        updatedAt: erasedAt,
      }),
    );
  }
  for (const document of guideTours.docs) {
    writePromises.push(
      writer.update(document.ref, {
        guideId: anonymizedUserId,
        status: 'paused',
        updatedAt: erasedAt,
      }),
    );
  }
  const publicGuideRef = db.collection('public_guides').doc(userId);
  const publicGuide = await publicGuideRef.get();
  if (publicGuide.exists) {
    writePromises.push(
      writer.update(publicGuideRef, { active: false, updatedAt: erasedAt, verified: false }),
    );
  }
  await Promise.all([...writePromises, writer.close()]);
  await Promise.all(chats.docs.map(async (document) => db.recursiveDelete(document.ref)));

  return (
    notifications.size +
    payments.size +
    touristBookings.size +
    touristReviews.size +
    inquiriesById.size +
    marketplaceItems.size +
    guideTours.size +
    chats.size +
    (publicGuide.exists ? 1 : 0)
  );
}

export const requestAccountErasure = onCall<unknown, Promise<AccountErasureResponse>>(
  callableOptions,
  async (request) => {
    if (!request.auth) {
      throw new HttpsError('unauthenticated', 'Sign in before requesting account erasure.');
    }

    parseAccountErasureCallableInput(request.data);

    const db = getFirestore();
    await enforceCallableRateLimit(
      db,
      request.auth.uid,
      'request_account_erasure',
      3,
      24 * 60 * 60_000,
    );
    const userRef = db.collection(FIRESTORE_COLLECTIONS.users).doc(request.auth.uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'User profile was not found.');
    }

    const auditLogRef = db.collection(FIRESTORE_COLLECTIONS.auditLogs).doc();
    const [pushTokensSnapshot, rateLimitsSnapshot] = await Promise.all([
      userRef.collection('push_tokens').limit(100).get(),
      db
        .collection(FIRESTORE_COLLECTIONS.rateLimits)
        .where('userId', '==', request.auth.uid)
        .limit(100)
        .get(),
    ]);

    try {
      const plan = buildAccountErasurePlan(asErasureUser(snapshot.id, snapshot.data() ?? {}), {
        auditLogId: auditLogRef.id,
      });
      const erasedAt = Timestamp.fromDate(plan.erasedAt);
      const anonymizedUserId = `erased:${auditLogRef.id}`;
      const updatePayload: Record<string, unknown> = {
        displayName: plan.userPatch.displayName,
        email: plan.userPatch.email,
        notificationsEnabled: plan.userPatch.notificationsEnabled,
        'privacy.anonymizedAt': erasedAt,
        'privacy.erasureRequestedAt': erasedAt,
        'privacy.status': plan.userPatch.privacy.status,
        lastLoginAt: erasedAt,
        updatedAt: erasedAt,
      };

      if (plan.userPatch.guideProfile) {
        updatePayload.guideProfile = plan.userPatch.guideProfile;
      }

      for (const fieldPath of plan.deleteFieldPaths) {
        updatePayload[fieldPath] = FieldValue.delete();
      }

      const batch = db.batch();
      batch.update(userRef, updatePayload);
      batch.set(auditLogRef, {
        ...plan.auditLog,
        createdAt: erasedAt,
      });
      for (const pushTokenDocument of pushTokensSnapshot.docs) {
        batch.delete(pushTokenDocument.ref);
      }
      for (const rateLimitDocument of rateLimitsSnapshot.docs) {
        batch.delete(rateLimitDocument.ref);
      }
      await batch.commit();
      await eraseRelatedUserData(db, request.auth.uid, anonymizedUserId, erasedAt);
      await Promise.all([
        deletePrivateStorageFiles(plan.privateStoragePaths),
        deleteStoragePrefix(`review-media/${request.auth.uid}/`),
        deleteStoragePrefix(`tour-media/${request.auth.uid}/`),
      ]);
      await getAuth().deleteUser(request.auth.uid);

      return plan.response;
    } catch (error: unknown) {
      if (error instanceof AccountErasurePlanError && error.code === 'invalid_user') {
        throw new HttpsError('failed-precondition', error.message);
      }

      throw error;
    }
  },
);
