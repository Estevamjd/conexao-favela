import {
  INITIAL_COUPONS,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_POIS,
  INITIAL_REVIEWS,
  INITIAL_TOURS,
  type PromotionCoupon,
  type TourReview,
} from '@conexao-favela/shared';
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import { httpsCallable, type Functions } from 'firebase/functions';

export type AdminContentRow = {
  readonly communityId: string;
  readonly id: string;
  readonly kind: 'marketplace' | 'poi' | 'tour';
  readonly label: string;
  readonly status: string;
};

export type AdminReviewRow = Pick<
  TourReview,
  'communityId' | 'guideId' | 'id' | 'rating' | 'status' | 'tourId'
> & { readonly comment: string };

export type AdminCouponRow = Pick<
  PromotionCoupon,
  'active' | 'code' | 'communityId' | 'currencies' | 'id' | 'redeemedCount'
> & { readonly description: string; readonly expiresAt: Date };

export type OperationsRepository = {
  readonly moderateReview: (reviewId: string, status: 'published' | 'rejected') => Promise<void>;
  readonly setCouponActive: (couponId: string, active: boolean) => Promise<void>;
  readonly setMarketplaceStatus: (itemId: string, status: 'paused' | 'published') => Promise<void>;
  readonly setTourStatus: (tourId: string, status: 'paused' | 'published') => Promise<void>;
  readonly subscribeCoupons: (
    onNext: (rows: readonly AdminCouponRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribePois: (
    onNext: (rows: readonly AdminContentRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribeMarketplace: (
    onNext: (rows: readonly AdminContentRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribeReviews: (
    onNext: (rows: readonly AdminReviewRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
  readonly subscribeTours: (
    onNext: (rows: readonly AdminContentRow[]) => void,
    onError: (error: Error) => void,
  ) => Unsubscribe;
};

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function readString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function localizedLabel(value: unknown): string | null {
  if (!isRecord(value)) return null;
  return readString(value.pt) ?? readString(value.en) ?? readString(Object.values(value)[0]);
}

function readDate(value: unknown): Date | null {
  if (!isRecord(value) || typeof value.toDate !== 'function') return null;
  const date = (value as { readonly toDate: () => unknown }).toDate();
  return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
}

function readStrings(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

export function mapContentDocument(
  id: string,
  data: DocumentData,
  kind: AdminContentRow['kind'],
): AdminContentRow | null {
  const record = data as Readonly<Record<string, unknown>>;
  const communityId = readString(record.communityId);
  const label = localizedLabel(kind === 'poi' ? record.name : record.title);
  const status = kind === 'poi' ? 'published' : readString(record.status);
  return communityId && label && status ? { communityId, id, kind, label, status } : null;
}

export function mapReviewDocument(id: string, data: DocumentData): AdminReviewRow | null {
  const record = data as Readonly<Record<string, unknown>>;
  const communityId = readString(record.communityId);
  const guideId = readString(record.guideId);
  const tourId = readString(record.tourId);
  const comment = localizedLabel(record.comment);
  const rating =
    typeof record.rating === 'number' && [1, 2, 3, 4, 5].includes(record.rating)
      ? (record.rating as 1 | 2 | 3 | 4 | 5)
      : null;
  const status =
    record.status === 'pending_moderation' ||
    record.status === 'published' ||
    record.status === 'rejected'
      ? record.status
      : null;
  if (!communityId || !guideId || !tourId || !comment || !rating || !status) return null;
  return { comment, communityId, guideId, id, rating, status, tourId };
}

export function mapCouponDocument(id: string, data: DocumentData): AdminCouponRow | null {
  const record = data as Readonly<Record<string, unknown>>;
  const code = readString(record.code);
  const communityId = readString(record.communityId);
  const description = localizedLabel(record.description);
  const expiresAt = readDate(record.expiresAt);
  const currencies = readStrings(record.currencies).filter(
    (value): value is 'BRL' | 'USD' | 'EUR' =>
      value === 'BRL' || value === 'USD' || value === 'EUR',
  );
  if (!code || !communityId || !description || !expiresAt || currencies.length === 0) return null;
  return {
    active: record.active === true,
    code,
    communityId,
    currencies,
    description,
    expiresAt,
    id,
    redeemedCount: typeof record.redeemedCount === 'number' ? record.redeemedCount : 0,
  };
}

export function createOperationsRepository(
  db: Firestore,
  functions: Functions,
): OperationsRepository {
  return {
    async moderateReview(reviewId, status) {
      const callable = httpsCallable(functions, 'moderateReview');
      await callable({ reviewId, status });
    },
    async setCouponActive(couponId, active) {
      await updateDoc(doc(db, 'coupons', couponId), { active, updatedAt: new Date() });
    },
    async setMarketplaceStatus(itemId, status) {
      await updateDoc(doc(db, 'marketplace_items', itemId), { status, updatedAt: new Date() });
    },
    async setTourStatus(tourId, status) {
      await updateDoc(doc(db, 'tours', tourId), { status, updatedAt: new Date() });
    },
    subscribeCoupons(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'coupons'), orderBy('code'), limit(100)),
        (snapshot) =>
          onNext(
            snapshot.docs
              .map((item) => mapCouponDocument(item.id, item.data()))
              .filter((item): item is AdminCouponRow => item !== null),
          ),
        onError,
      );
    },
    subscribePois(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'points_of_interest'), limit(200)),
        (snapshot) =>
          onNext(
            snapshot.docs
              .map((item) => mapContentDocument(item.id, item.data(), 'poi'))
              .filter((item): item is AdminContentRow => item !== null),
          ),
        onError,
      );
    },
    subscribeMarketplace(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'marketplace_items'), limit(100)),
        (snapshot) =>
          onNext(
            snapshot.docs
              .map((item) => mapContentDocument(item.id, item.data(), 'marketplace'))
              .filter((item): item is AdminContentRow => item !== null),
          ),
        onError,
      );
    },
    subscribeReviews(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'reviews'), orderBy('createdAt', 'desc'), limit(100)),
        (snapshot) =>
          onNext(
            snapshot.docs
              .map((item) => mapReviewDocument(item.id, item.data()))
              .filter((item): item is AdminReviewRow => item !== null),
          ),
        onError,
      );
    },
    subscribeTours(onNext, onError) {
      return onSnapshot(
        query(collection(db, 'tours'), limit(100)),
        (snapshot) =>
          onNext(
            snapshot.docs
              .map((item) => mapContentDocument(item.id, item.data(), 'tour'))
              .filter((item): item is AdminContentRow => item !== null),
          ),
        onError,
      );
    },
  };
}

export const DEMO_CONTENT: readonly AdminContentRow[] = [
  ...INITIAL_TOURS.map((tour) => ({
    communityId: tour.communityId,
    id: tour.id,
    kind: 'tour' as const,
    label: tour.title.pt,
    status: tour.status,
  })),
  ...INITIAL_POIS.map((poi) => ({
    communityId: poi.communityId,
    id: poi.id,
    kind: 'poi' as const,
    label: poi.name.pt,
    status: 'published',
  })),
  ...INITIAL_MARKETPLACE_ITEMS.map((item) => ({
    communityId: item.communityId,
    id: item.id,
    kind: 'marketplace' as const,
    label: item.title.pt,
    status: item.status,
  })),
];

export const DEMO_REVIEWS: readonly AdminReviewRow[] = INITIAL_REVIEWS.map((review, index) => ({
  comment: review.comment.pt,
  communityId: review.communityId,
  guideId: review.guideId,
  id: review.id,
  rating: review.rating,
  status: index === 0 ? 'pending_moderation' : review.status,
  tourId: review.tourId,
}));

export const DEMO_COUPONS: readonly AdminCouponRow[] = INITIAL_COUPONS.map((coupon) => ({
  active: coupon.active,
  code: coupon.code,
  communityId: coupon.communityId,
  currencies: coupon.currencies,
  description: coupon.description.pt,
  expiresAt: coupon.expiresAt.toDate(),
  id: coupon.id,
  redeemedCount: coupon.redeemedCount,
}));
