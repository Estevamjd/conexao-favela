import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  applyMessageToChat,
  buildChatFromBooking,
  buildChatMessage,
  reviveChat,
  reviveChatMessage,
  timestampFromDate,
  type Booking,
  type Chat,
  type ChatMessage,
} from '@conexao-favela/shared';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import {
  canUseRemoteExperienceService,
  createRemoteChat,
  markRemoteChatRead,
  sendRemoteChatMessage,
} from '@/services/experience-service';

type ChatState = {
  readonly chats: readonly Chat[];
  readonly cacheChat: (chat: Chat) => void;
  readonly messages: readonly ChatMessage[];
  readonly ensureChat: (booking: Booking) => Chat;
  readonly markChatRead: (chatId: string, readerId: string) => void;
  readonly resetChats: () => void;
  readonly sendMessage: (chatId: string, senderId: string, text: string) => ChatMessage;
};

type PersistedChatState = Pick<ChatState, 'chats' | 'messages'>;

function isPersistedChatState(value: unknown): value is PersistedChatState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as { readonly chats?: unknown; readonly messages?: unknown };
  return Array.isArray(state.chats) && Array.isArray(state.messages);
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      cacheChat: (chat) =>
        set((state) => ({
          chats: state.chats.some((item) => item.id === chat.id)
            ? state.chats.map((item) => (item.id === chat.id ? chat : item))
            : [chat, ...state.chats],
        })),
      ensureChat: (booking) => {
        const existing = get().chats.find(
          (chat) =>
            chat.communityId === booking.communityId &&
            chat.guideId === booking.guideId &&
            chat.touristId === booking.touristId,
        );
        if (existing) return existing;

        const chat = buildChatFromBooking(booking);
        set((state) => ({ chats: [chat, ...state.chats] }));
        if (canUseRemoteExperienceService() && !booking.id.startsWith('local-booking-')) {
          void createRemoteChat(booking.id).catch(() => undefined);
        }
        return chat;
      },
      markChatRead: (chatId, readerId) => {
        const readAt = timestampFromDate(new Date());
        set((state) => {
          const messages = state.messages.map((message) =>
            message.chatId === chatId && message.senderId !== readerId
              ? { ...message, read: true, readAt }
              : message,
          );
          return {
            chats: state.chats.map((chat) => {
              if (chat.id !== chatId || !chat.lastMessage) return chat;
              return chat.lastMessage.senderId === readerId
                ? chat
                : { ...chat, lastMessage: { ...chat.lastMessage, read: true } };
            }),
            messages,
          };
        });
        const chat = get().chats.find((item) => item.id === chatId);
        if (chat && canUseRemoteExperienceService() && !chat.id.startsWith('local-')) {
          void markRemoteChatRead(chatId).catch(() => undefined);
        }
      },
      messages: [],
      resetChats: () => set({ chats: [], messages: [] }),
      sendMessage: (chatId, senderId, text) => {
        const chat = get().chats.find((item) => item.id === chatId);
        if (!chat?.participants.includes(senderId)) {
          throw new Error('Chat indisponivel para este usuario.');
        }
        const message = buildChatMessage({
          chatId,
          id: `local-message-${Date.now().toString(36)}`,
          senderId,
          text,
        });
        set((state) => ({
          chats: state.chats.map((item) =>
            item.id === chatId ? applyMessageToChat(item, message) : item,
          ),
          messages: [...state.messages, message],
        }));
        if (canUseRemoteExperienceService() && !chat.id.startsWith('local-')) {
          void sendRemoteChatMessage({ chatId, text: message.text }).catch(() => undefined);
        }
        return message;
      },
    }),
    {
      merge: (persisted, current) => {
        if (!isPersistedChatState(persisted)) return current;
        return {
          ...current,
          chats: persisted.chats.map(reviveChat),
          messages: persisted.messages.map(reviveChatMessage),
        };
      },
      name: 'conexao-favela:chats:v1',
      partialize: (state): PersistedChatState => ({
        chats: state.chats,
        messages: state.messages,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
