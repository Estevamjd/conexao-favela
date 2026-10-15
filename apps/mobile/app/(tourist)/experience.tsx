import { router } from 'expo-router';
import {
  GalleryHorizontal,
  MessageCircleMore,
  ScanLine,
  ShoppingBag,
  Sparkles,
  Tags,
  WifiOff,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { ExperienceLinkCard } from '@/features/experience/ExperienceLinkCard';
import { useAppTheme } from '@/theme/useAppTheme';

export default function ExperienceHubRoute() {
  return (
    <RequireAuth role="tourist">
      <ExperienceHub />
    </RequireAuth>
  );
}

function ExperienceHub() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();

  return (
    <Screen>
      <AppText variant="title">{t('hubTitle')}</AppText>
      <AppText color={theme.colors.textSecondary} variant="body">
        {t('hubBody')}
      </AppText>
      <ExperienceLinkCard
        description={t('chatEmptyBody')}
        icon={<MessageCircleMore color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/chats')}
        title={t('chatListTitle')}
      />
      <ExperienceLinkCard
        description={t('recommendationsBody')}
        icon={<Sparkles color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/recommendations')}
        title={t('recommendationsTitle')}
      />
      <ExperienceLinkCard
        description={t('galleryBody')}
        icon={<GalleryHorizontal color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/community-gallery')}
        title={t('galleryTitle')}
      />
      <ExperienceLinkCard
        description={t('marketplaceBody')}
        icon={<ShoppingBag color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/marketplace')}
        title={t('marketplaceTitle')}
      />
      <ExperienceLinkCard
        description={t('arBody')}
        icon={<ScanLine color={theme.colors.primary} size={28} />}
        label={t('arOpen')}
        onPress={() => router.push('/ar-discovery')}
        title={t('arTitle')}
      />
      <ExperienceLinkCard
        description={t('couponsBody')}
        icon={<Tags color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/coupons')}
        title={t('couponsTitle')}
      />
      <ExperienceLinkCard
        description={t('offlineBody')}
        icon={<WifiOff color={theme.colors.primary} size={28} />}
        label={t('open')}
        onPress={() => router.push('/offline')}
        title={t('offlineTitle')}
      />
    </Screen>
  );
}
