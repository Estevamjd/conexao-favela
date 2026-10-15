import { resolveLocalizedText } from '@conexao-favela/shared';
import { Send, Store } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Image, StyleSheet, TextInput, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useMarketplaceItems } from '@/hooks/useMarketplaceItems';
import { useAuthStore } from '@/stores/auth-store';
import { useMarketplaceStore } from '@/stores/marketplace-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';
import communityArtImage from '../../assets/images/community-art.webp';
import communityFoodImage from '../../assets/images/community-food.webp';
import communityTourImage from '../../assets/images/community-tour.webp';

const ITEM_IMAGES = {
  art: communityArtImage,
  food: communityFoodImage,
  tour: communityTourImage,
} as const;

export default function MarketplaceRoute() {
  return (
    <RequireAuth role="tourist">
      <MarketplaceScreen />
    </RequireAuth>
  );
}

function MarketplaceScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const { items } = useMarketplaceItems(communityId);
  const currentUser = useAuthStore((state) => state.currentUser);
  const sendInquiry = useMarketplaceStore((state) => state.sendInquiry);
  const inquiries = useMarketplaceStore((state) => state.inquiries);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(item: (typeof items)[number]) {
    if (!currentUser || message.trim().length < 10) return;
    setSending(true);
    try {
      await sendInquiry(item, currentUser.uid, message);
      setMessage('');
      setSelectedId(null);
      Alert.alert(t('marketplaceTitle'), t('marketplaceSent'));
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <Store color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('marketplaceTitle')}</AppText>
      </View>
      <AppText color={theme.colors.textSecondary} variant="body">
        {t('marketplaceBody')}
      </AppText>
      {items.map((item) => {
        const sent = inquiries.some((inquiry) => inquiry.itemId === item.id);
        return (
          <InfoCard
            key={item.id}
            title={resolveLocalizedText(item.title, language)}
            description={resolveLocalizedText(item.description, language)}
          >
            <Image
              accessibilityLabel={resolveLocalizedText(item.title, language)}
              source={ITEM_IMAGES[item.imageKey]}
              style={styles.image}
            />
            <AppText color={theme.colors.primary} variant="label">
              {resolveLocalizedText(item.priceLabel, language)}
            </AppText>
            {sent ? (
              <AppText color={theme.colors.textSecondary} variant="caption">
                {t('marketplaceSent')}
              </AppText>
            ) : null}
            {selectedId === item.id ? (
              <View style={styles.composer}>
                <TextInput
                  accessibilityLabel={t('marketplaceMessage')}
                  multiline
                  onChangeText={setMessage}
                  placeholder={t('marketplaceMessage')}
                  placeholderTextColor={theme.colors.textSecondary}
                  style={[
                    styles.input,
                    { borderColor: theme.colors.border, color: theme.colors.textPrimary },
                  ]}
                  value={message}
                />
                <PrimaryButton
                  disabled={message.trim().length < 10 || sending}
                  icon={<Send color="#ffffff" size={18} />}
                  onPress={() => void submit(item)}
                >
                  {t('send')}
                </PrimaryButton>
              </View>
            ) : (
              <PrimaryButton onPress={() => setSelectedId(item.id)} variant="ghost">
                {t('marketplaceInterest')}
              </PrimaryButton>
            )}
          </InfoCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  composer: { gap: 10 },
  header: { gap: 8 },
  image: { aspectRatio: 1.65, borderRadius: 8, width: '100%' },
  input: { borderRadius: 8, borderWidth: 1, minHeight: 88, padding: 12, textAlignVertical: 'top' },
});
