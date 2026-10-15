import { INITIAL_POIS, resolveLocalizedText } from '@conexao-favela/shared';
import { router } from 'expo-router';
import { MapPinned } from 'lucide-react-native';
import { FlatList, Image, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '@/components/RequireAuth';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';
import communityArtImage from '../../assets/images/community-art.webp';
import communityFoodImage from '../../assets/images/community-food.webp';
import communityTourImage from '../../assets/images/community-tour.webp';

const GALLERY_IMAGES = [communityTourImage, communityArtImage, communityFoodImage] as const;

export default function CommunityGalleryRoute() {
  return (
    <RequireAuth role="tourist">
      <CommunityGalleryScreen />
    </RequireAuth>
  );
}

function CommunityGalleryScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const pois = INITIAL_POIS.filter((poi) => poi.communityId === communityId);

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <AppText variant="title">{t('galleryTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('galleryBody')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={pois}
        keyExtractor={(poi) => poi.id}
        numColumns={2}
        columnWrapperStyle={styles.columns}
        renderItem={({ index, item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Image
              accessibilityLabel={resolveLocalizedText(item.name, language)}
              source={GALLERY_IMAGES[index % GALLERY_IMAGES.length]}
              style={styles.visual}
            />
            <AppText variant="label">{resolveLocalizedText(item.name, language)}</AppText>
            <PrimaryButton
              icon={<MapPinned color={theme.colors.primary} size={16} />}
              onPress={() => router.push(`/poi/${item.id}`)}
              variant="ghost"
            >
              {t('open')}
            </PrimaryButton>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 8, borderWidth: 1, flex: 1, gap: 10, padding: 10 },
  columns: { gap: 10 },
  header: { gap: 8 },
  list: { gap: 10, paddingBottom: 96 },
  screen: { flex: 1 },
  visual: { aspectRatio: 1.35, borderRadius: 6, width: '100%' },
});
