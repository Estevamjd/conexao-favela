import { router, type Href } from 'expo-router';
import { MessageCircleMore } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { useExperienceChats } from '@/hooks/useExperienceChat';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

type ChatListScreenProps = { readonly role: 'guide' | 'tourist' };

export function ChatListScreen({ role }: ChatListScreenProps) {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const currentUser = useAuthStore((state) => state.currentUser);
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const userId = role === 'guide' ? resolveActiveGuideId(currentUser) : currentUser?.uid;
  const chats = useExperienceChats(userId)
    .filter((chat) => chat.communityId === communityId)
    .sort((first, second) => second.updatedAt.seconds - first.updatedAt.seconds);

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <AppText variant="title">{t('chatListTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('hubBody')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={chats}
        keyExtractor={(chat) => chat.id}
        ListEmptyComponent={
          <InfoCard description={t('chatEmptyBody')} title={t('chatEmptyTitle')}>
            <MessageCircleMore color={theme.colors.primary} size={30} />
          </InfoCard>
        }
        renderItem={({ item }) => {
          const route = role === 'guide' ? `/guide-chat/${item.id}` : `/chat/${item.id}`;
          return (
            <InfoCard
              description={item.lastMessage?.text ?? t('noMessages')}
              title={t('chatTitle')}
            >
              <PrimaryButton
                icon={<MessageCircleMore color="#ffffff" size={18} />}
                onPress={() => router.push(route as Href)}
              >
                {t('open')}
              </PrimaryButton>
            </InfoCard>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 6 },
  list: { gap: 12, paddingBottom: 96 },
  screen: { flex: 1 },
});
