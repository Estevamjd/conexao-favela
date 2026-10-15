import {
  INITIAL_PUBLIC_GUIDES,
  INITIAL_MARKETPLACE_ITEMS,
  INITIAL_TOURS,
  filterPublicGuidesByCommunity,
  filterToursByCommunity,
  type AppNotification,
  type Booking,
  type MarketplaceItem,
  type PublicGuide,
  type Tour,
} from '@conexao-favela/shared';
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';
import {
  mapFirestoreBooking,
  mapFirestoreNotification,
  mapFirestoreMarketplaceItem,
  mapFirestorePublicGuide,
  mapFirestoreTour,
} from '@/services/firestore-mappers';

function byScheduledDate(first: Booking, second: Booking) {
  return first.scheduledFor.seconds - second.scheduledFor.seconds;
}

function byTourTitle(first: Tour, second: Tour) {
  return first.id.localeCompare(second.id);
}

function byGuideName(first: PublicGuide, second: PublicGuide) {
  return first.displayName.localeCompare(second.displayName);
}

function byNotificationDate(first: AppNotification, second: AppNotification) {
  return second.createdAt.seconds - first.createdAt.seconds;
}

export function canUseFirestoreReads(): boolean {
  return hasFirebaseConfig();
}

export async function fetchPublishedToursForCommunity(
  communityId: string,
): Promise<readonly Tour[]> {
  if (!hasFirebaseConfig()) {
    return filterToursByCommunity(INITIAL_TOURS, communityId);
  }

  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, 'tours'),
      where('communityId', '==', communityId),
      where('status', '==', 'published'),
    ),
  );
  const tours = snapshot.docs
    .map((document) => mapFirestoreTour(document.id, document.data()))
    .filter((tour): tour is Tour => tour !== null)
    .sort(byTourTitle);

  return tours;
}

export async function fetchPublishedMarketplaceItems(
  communityId: string,
): Promise<readonly MarketplaceItem[]> {
  if (!hasFirebaseConfig()) {
    return INITIAL_MARKETPLACE_ITEMS.filter((item) => item.communityId === communityId);
  }
  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, 'marketplace_items'),
      where('communityId', '==', communityId),
      where('status', '==', 'published'),
    ),
  );
  return snapshot.docs
    .map((document) => mapFirestoreMarketplaceItem(document.id, document.data()))
    .filter((item): item is MarketplaceItem => item !== null);
}

export async function fetchPublicGuidesForCommunity(
  communityId: string,
): Promise<readonly PublicGuide[]> {
  if (!hasFirebaseConfig()) {
    return filterPublicGuidesByCommunity(INITIAL_PUBLIC_GUIDES, communityId);
  }

  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, 'public_guides'),
      where('communityId', '==', communityId),
      where('active', '==', true),
      where('verified', '==', true),
    ),
  );

  return snapshot.docs
    .map((document) => mapFirestorePublicGuide(document.id, document.data()))
    .filter((guide): guide is PublicGuide => guide !== null)
    .sort(byGuideName);
}

export async function fetchBookingsForUser(userId: string): Promise<readonly Booking[]> {
  if (!hasFirebaseConfig()) {
    return [];
  }

  const { db } = getFirebaseServices();
  const [touristSnapshot, guideSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'bookings'), where('touristId', '==', userId))),
    getDocs(query(collection(db, 'bookings'), where('guideId', '==', userId))),
  ]);
  const bookingsById = new Map<string, Booking>();

  for (const document of [...touristSnapshot.docs, ...guideSnapshot.docs]) {
    const booking = mapFirestoreBooking(document.id, document.data());

    if (booking) {
      bookingsById.set(booking.id, booking);
    }
  }

  return [...bookingsById.values()].sort(byScheduledDate);
}

export async function fetchNotificationsForUser(
  userId: string,
): Promise<readonly AppNotification[]> {
  if (!hasFirebaseConfig()) {
    return [];
  }

  const { db } = getFirebaseServices();
  const snapshot = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50),
    ),
  );

  return snapshot.docs
    .map((document) => mapFirestoreNotification(document.id, document.data()))
    .filter((notification): notification is AppNotification => notification !== null)
    .sort(byNotificationDate);
}

export async function markRemoteNotificationRead(notificationId: string): Promise<void> {
  if (!hasFirebaseConfig()) {
    return;
  }

  const { db } = getFirebaseServices();

  await updateDoc(doc(db, 'notifications', notificationId), {
    read: true,
    readAt: serverTimestamp(),
  });
}
