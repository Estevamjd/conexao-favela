import 'dotenv/config';
import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import {
  INITIAL_COMMUNITY,
  INITIAL_COUPONS,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_POIS,
  INITIAL_PUBLIC_GUIDES,
  INITIAL_REVIEWS,
  INITIAL_TOURS,
} from '@conexao-favela/shared';
import { FIRESTORE_COLLECTIONS } from './collections';

function initializeFirebaseAdmin(): void {
  if (getApps().length > 0) {
    return;
  }

  // Application Default Credentials keeps local emulator, CI, and service-account flows aligned.
  initializeApp({
    credential: applicationDefault(),
    projectId: process.env.FIREBASE_PROJECT_ID ?? 'conexao-favela',
  });
}

async function seedPois(): Promise<void> {
  initializeFirebaseAdmin();

  const db = getFirestore();
  const batch = db.batch();
  const serverTimestamp = FieldValue.serverTimestamp();

  const communityRef = db.collection(FIRESTORE_COLLECTIONS.communities).doc(INITIAL_COMMUNITY.id);

  batch.set(
    communityRef,
    {
      ...INITIAL_COMMUNITY,
      createdAt: serverTimestamp,
      updatedAt: serverTimestamp,
    },
    { merge: true },
  );

  for (const poi of INITIAL_POIS) {
    const poiRef = db.collection(FIRESTORE_COLLECTIONS.pointsOfInterest).doc(poi.id);

    batch.set(
      poiRef,
      {
        ...poi,
        createdAt: serverTimestamp,
        updatedAt: serverTimestamp,
        needsLocalGuideReview: true,
      },
      { merge: true },
    );
  }

  for (const guide of INITIAL_PUBLIC_GUIDES) {
    const guideRef = db.collection(FIRESTORE_COLLECTIONS.publicGuides).doc(guide.id);

    batch.set(
      guideRef,
      {
        ...guide,
        updatedAt: serverTimestamp,
        verifiedAt: serverTimestamp,
      },
      { merge: true },
    );
  }

  for (const tour of INITIAL_TOURS) {
    const tourRef = db.collection(FIRESTORE_COLLECTIONS.tours).doc(tour.id);
    batch.set(
      tourRef,
      { ...tour, createdAt: serverTimestamp, updatedAt: serverTimestamp },
      { merge: true },
    );
  }

  for (const review of INITIAL_REVIEWS) {
    const reviewRef = db.collection(FIRESTORE_COLLECTIONS.reviews).doc(review.id);
    batch.set(
      reviewRef,
      { ...review, createdAt: serverTimestamp, updatedAt: serverTimestamp },
      { merge: true },
    );
  }

  for (const coupon of INITIAL_COUPONS) {
    const couponRef = db.collection(FIRESTORE_COLLECTIONS.coupons).doc(coupon.id);
    batch.set(
      couponRef,
      {
        ...coupon,
        createdAt: serverTimestamp,
        expiresAt: Timestamp.fromDate(coupon.expiresAt.toDate()),
        startsAt: Timestamp.fromDate(coupon.startsAt.toDate()),
        updatedAt: serverTimestamp,
      },
      { merge: true },
    );
  }

  for (const item of INITIAL_MARKETPLACE_ITEMS) {
    const itemRef = db.collection(FIRESTORE_COLLECTIONS.marketplaceItems).doc(item.id);
    batch.set(
      itemRef,
      { ...item, createdAt: serverTimestamp, updatedAt: serverTimestamp },
      { merge: true },
    );
  }

  await batch.commit();

  console.info(
    `Seed completed: 1 community, ${String(INITIAL_POIS.length)} POIs, ${String(INITIAL_PUBLIC_GUIDES.length)} guides, ${String(INITIAL_TOURS.length)} tours, ${String(INITIAL_REVIEWS.length)} reviews, ${String(INITIAL_COUPONS.length)} coupons, and ${String(INITIAL_MARKETPLACE_ITEMS.length)} marketplace items.`,
  );
}

seedPois().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown seed error';
  console.error(`Seed failed: ${message}`);
  process.exitCode = 1;
});
