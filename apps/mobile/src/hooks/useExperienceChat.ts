import type { Chat, ChatMessage } from '@conexao-favela/shared';
import { useEffect, useMemo, useState } from 'react';
import { subscribeChatMessages, subscribeUserChats } from '@/services/experience-read-service';
import { useChatStore } from '@/stores/chat-store';

function mergeById<T extends { readonly id: string }>(
  remote: readonly T[],
  local: readonly T[],
): T[] {
  const values = new Map<string, T>();
  for (const item of local) values.set(item.id, item);
  for (const item of remote) values.set(item.id, item);
  return [...values.values()];
}

export function useExperienceChats(userId: string | undefined) {
  const localChats = useChatStore((state) => state.chats);
  const [remoteChats, setRemoteChats] = useState<readonly Chat[]>([]);

  useEffect(() => {
    if (!userId) return undefined;
    return subscribeUserChats(userId, setRemoteChats);
  }, [userId]);

  return useMemo(
    () =>
      mergeById(remoteChats, localChats).sort((a, b) => b.updatedAt.seconds - a.updatedAt.seconds),
    [localChats, remoteChats],
  );
}

export function useExperienceMessages(chatId: string | undefined) {
  const localMessages = useChatStore((state) => state.messages);
  const [remoteMessages, setRemoteMessages] = useState<readonly ChatMessage[]>([]);

  useEffect(() => {
    if (!chatId) return undefined;
    return subscribeChatMessages(chatId, setRemoteMessages);
  }, [chatId]);

  return useMemo(
    () =>
      mergeById(
        remoteMessages,
        localMessages.filter((message) => message.chatId === chatId),
      ).sort((a, b) => a.sentAt.seconds - b.sentAt.seconds),
    [chatId, localMessages, remoteMessages],
  );
}
