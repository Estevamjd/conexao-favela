import type { Booking, Chat, ChatMessage, FirestoreTimestamp } from '../types';
import { timestampFromDate } from './timestamps';

export function buildChatId(guideId: string, touristId: string): string {
  return [guideId.trim(), touristId.trim()].sort().join('_');
}

export function buildChatFromBooking(
  booking: Pick<Booking, 'communityId' | 'guideId' | 'id' | 'touristId'>,
  now = new Date(),
): Chat {
  const timestamp = timestampFromDate(now);

  return {
    bookingId: booking.id,
    communityId: booking.communityId,
    createdAt: timestamp,
    guideId: booking.guideId,
    id: buildChatId(booking.guideId, booking.touristId),
    participants: [booking.guideId, booking.touristId],
    touristId: booking.touristId,
    updatedAt: timestamp,
  };
}

export function buildChatMessage(input: {
  readonly chatId: string;
  readonly id: string;
  readonly senderId: string;
  readonly text: string;
  readonly sentAt?: Date;
}): ChatMessage {
  return {
    chatId: input.chatId,
    id: input.id,
    read: false,
    senderId: input.senderId,
    sentAt: timestampFromDate(input.sentAt ?? new Date()),
    text: input.text.trim(),
  };
}

export function applyMessageToChat(chat: Chat, message: ChatMessage): Chat {
  if (message.chatId !== chat.id || !chat.participants.includes(message.senderId)) {
    return chat;
  }

  return {
    ...chat,
    lastMessage: {
      read: message.read,
      senderId: message.senderId,
      sentAt: message.sentAt,
      text: message.text,
    },
    updatedAt: message.sentAt,
  };
}

export function reviveChatTimestamp(value: FirestoreTimestamp): FirestoreTimestamp {
  if (typeof value.toDate === 'function') {
    return value;
  }

  const date = new Date(value.seconds * 1000 + Math.floor(value.nanoseconds / 1_000_000));
  return { ...value, toDate: () => date };
}

export function reviveChat(chat: Chat): Chat {
  return {
    ...chat,
    createdAt: reviveChatTimestamp(chat.createdAt),
    lastMessage: chat.lastMessage
      ? { ...chat.lastMessage, sentAt: reviveChatTimestamp(chat.lastMessage.sentAt) }
      : undefined,
    updatedAt: reviveChatTimestamp(chat.updatedAt),
  };
}

export function reviveChatMessage(message: ChatMessage): ChatMessage {
  return {
    ...message,
    readAt: message.readAt ? reviveChatTimestamp(message.readAt) : undefined,
    sentAt: reviveChatTimestamp(message.sentAt),
  };
}
