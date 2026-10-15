import type { Chat, ChatMessage, FirestoreTimestamp, TourReview } from '@conexao-favela/shared';
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFirebaseServices, hasFirebaseConfig } from '@/services/firebase';

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null;
}

function asTimestamp(value: unknown): FirestoreTimestamp | null {
  return isRecord(value) && typeof value.seconds === 'number' && typeof value.toDate === 'function'
    ? (value as FirestoreTimestamp)
    : null;
}

function asStringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

function mapChat(snapshot: QueryDocumentSnapshot): Chat | null {
  const data: unknown = snapshot.data();
  if (!isRecord(data)) return null;
  const participants = asStringArray(data.participants);
  const guideId = typeof data.guideId === 'string' ? data.guideId : null;
  const touristId = typeof data.touristId === 'string' ? data.touristId : null;
  const communityId = typeof data.communityId === 'string' ? data.communityId : null;
  const createdAt = asTimestamp(data.createdAt);
  const updatedAt = asTimestamp(data.updatedAt);
  if (
    participants.length !== 2 ||
    !guideId ||
    !touristId ||
    !communityId ||
    !createdAt ||
    !updatedAt
  ) {
    return null;
  }
  const lastMessageData = isRecord(data.lastMessage) ? data.lastMessage : null;
  const lastSentAt = asTimestamp(lastMessageData?.sentAt);
  const lastMessage =
    lastMessageData &&
    typeof lastMessageData.text === 'string' &&
    typeof lastMessageData.senderId === 'string' &&
    typeof lastMessageData.read === 'boolean' &&
    lastSentAt
      ? {
          read: lastMessageData.read,
          senderId: lastMessageData.senderId,
          sentAt: lastSentAt,
          text: lastMessageData.text,
        }
      : undefined;

  return {
    bookingId: typeof data.bookingId === 'string' ? data.bookingId : undefined,
    communityId,
    createdAt,
    guideId,
    id: snapshot.id,
    lastMessage,
    participants: [participants[0] ?? guideId, participants[1] ?? touristId],
    touristId,
    updatedAt,
  };
}

function mapMessage(snapshot: QueryDocumentSnapshot, chatId: string): ChatMessage | null {
  const data: unknown = snapshot.data();
  if (!isRecord(data)) return null;
  const senderId = typeof data.senderId === 'string' ? data.senderId : null;
  const text = typeof data.text === 'string' ? data.text : null;
  const sentAt = asTimestamp(data.sentAt);
  if (!senderId || !text || !sentAt) return null;

  return {
    chatId,
    id: snapshot.id,
    read: data.read === true,
    readAt: asTimestamp(data.readAt) ?? undefined,
    senderId,
    sentAt,
    text,
  };
}

function mapReview(snapshot: QueryDocumentSnapshot): TourReview | null {
  const data: unknown = snapshot.data();
  if (!isRecord(data) || !isRecord(data.comment)) return null;
  const createdAt = asTimestamp(data.createdAt);
  const updatedAt = asTimestamp(data.updatedAt);
  const rating =
    typeof data.rating === 'number' && [1, 2, 3, 4, 5].includes(data.rating)
      ? (data.rating as 1 | 2 | 3 | 4 | 5)
      : null;
  const status =
    data.status === 'pending_moderation' ||
    data.status === 'published' ||
    data.status === 'rejected'
      ? data.status
      : null;
  const required = [data.bookingId, data.tourId, data.guideId, data.touristId, data.communityId];
  if (
    !createdAt ||
    !updatedAt ||
    !rating ||
    !status ||
    required.some((value) => typeof value !== 'string')
  ) {
    return null;
  }
  const commentEntries = Object.entries(data.comment).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string',
  );
  const comment = Object.fromEntries(commentEntries);
  if (typeof comment.pt !== 'string') return null;

  return {
    bookingId: data.bookingId as string,
    comment: comment as TourReview['comment'],
    communityId: data.communityId as string,
    createdAt,
    guideId: data.guideId as string,
    id: snapshot.id,
    photos: asStringArray(data.photos),
    rating,
    status,
    tourId: data.tourId as string,
    touristId: data.touristId as string,
    updatedAt,
  };
}

export function subscribeUserChats(
  userId: string,
  onData: (chats: readonly Chat[]) => void,
): Unsubscribe | undefined {
  if (!hasFirebaseConfig()) return undefined;
  const { db } = getFirebaseServices();
  return onSnapshot(
    query(
      collection(db, 'chats'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc'),
    ),
    (snapshot) => onData(snapshot.docs.map(mapChat).filter((chat): chat is Chat => chat !== null)),
  );
}

export function subscribeChatMessages(
  chatId: string,
  onData: (messages: readonly ChatMessage[]) => void,
): Unsubscribe | undefined {
  if (!hasFirebaseConfig()) return undefined;
  const { db } = getFirebaseServices();
  return onSnapshot(
    query(collection(db, 'chats', chatId, 'messages'), orderBy('sentAt', 'asc')),
    (snapshot) =>
      onData(
        snapshot.docs
          .map((document) => mapMessage(document, chatId))
          .filter((message): message is ChatMessage => message !== null),
      ),
  );
}

export function subscribeGuideReviews(
  guideId: string,
  onData: (reviews: readonly TourReview[]) => void,
): Unsubscribe | undefined {
  if (!hasFirebaseConfig()) return undefined;
  const { db } = getFirebaseServices();
  return onSnapshot(
    query(collection(db, 'reviews'), where('guideId', '==', guideId), orderBy('createdAt', 'desc')),
    (snapshot) =>
      onData(
        snapshot.docs.map(mapReview).filter((review): review is TourReview => review !== null),
      ),
  );
}

export function subscribeTourReviews(
  tourId: string,
  onData: (reviews: readonly TourReview[]) => void,
): Unsubscribe | undefined {
  if (!hasFirebaseConfig()) return undefined;
  const { db } = getFirebaseServices();
  return onSnapshot(
    query(
      collection(db, 'reviews'),
      where('tourId', '==', tourId),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc'),
    ),
    (snapshot) =>
      onData(
        snapshot.docs.map(mapReview).filter((review): review is TourReview => review !== null),
      ),
  );
}
