import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Send } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useExperienceChats, useExperienceMessages } from '@/hooks/useExperienceChat';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useAppTheme } from '@/theme/useAppTheme';

type ChatConversationScreenProps = { readonly role: 'guide' | 'tourist' };

export function ChatConversationScreen({ role }: ChatConversationScreenProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('experience');
  const params = useLocalSearchParams<{ chatId?: string }>();
  const chatId = typeof params.chatId === 'string' ? params.chatId : undefined;
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentUserId = role === 'guide' ? resolveActiveGuideId(currentUser) : currentUser?.uid;
  const chats = useExperienceChats(currentUserId);
  const cacheChat = useChatStore((state) => state.cacheChat);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const markChatRead = useChatStore((state) => state.markChatRead);
  const chat = chats.find((item) => item.id === chatId);
  const actorId = role === 'guide' ? chat?.guideId : chat?.touristId;
  const messages = useExperienceMessages(chatId);
  const [text, setText] = useState('');

  useEffect(() => {
    if (chat && actorId) {
      cacheChat(chat);
      markChatRead(chat.id, actorId);
    }
  }, [actorId, cacheChat, chat, markChatRead]);

  if (!chat || !actorId) {
    return (
      <Screen>
        <PrimaryButton onPress={() => router.back()} variant="ghost">
          {t('back')}
        </PrimaryButton>
        <InfoCard description={t('chatEmptyBody')} title={t('chatEmptyTitle')} />
      </Screen>
    );
  }

  function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || !chat || !actorId) return;
    sendMessage(chat.id, actorId, trimmed);
    setText('');
  }

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('back')}
        </PrimaryButton>
        <AppText variant="subtitle">{t('chatTitle')}</AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.messages}
        data={messages}
        keyExtractor={(message) => message.id}
        ListEmptyComponent={
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('noMessages')}
          </AppText>
        }
        renderItem={({ item }) => {
          const own = item.senderId === actorId;
          return (
            <View
              style={[
                styles.bubble,
                {
                  alignSelf: own ? 'flex-end' : 'flex-start',
                  backgroundColor: own ? theme.colors.primary : theme.colors.surface,
                  borderColor: own ? theme.colors.primary : theme.colors.border,
                },
              ]}
            >
              <AppText color={own ? '#ffffff' : theme.colors.textPrimary} variant="body">
                {item.text}
              </AppText>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel={t('messagePlaceholder')}
          multiline
          onChangeText={setText}
          placeholder={t('messagePlaceholder')}
          placeholderTextColor={theme.colors.textSecondary}
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.textPrimary,
            },
          ]}
          value={text}
        />
        <PrimaryButton
          disabled={!text.trim()}
          icon={<Send color="#ffffff" size={18} />}
          onPress={handleSend}
        >
          {t('send')}
        </PrimaryButton>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bubble: { borderRadius: 12, borderWidth: 1, maxWidth: '82%', padding: 12 },
  composer: { alignItems: 'flex-end', flexDirection: 'row', gap: 8 },
  header: { gap: 8 },
  input: { borderRadius: 12, borderWidth: 1, flex: 1, maxHeight: 100, minHeight: 48, padding: 12 },
  messages: { flexGrow: 1, gap: 10, justifyContent: 'flex-end' },
  screen: { flex: 1, paddingBottom: 20 },
});
