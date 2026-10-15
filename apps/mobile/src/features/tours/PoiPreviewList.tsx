import {
  INITIAL_POIS,
  resolveLocalizedText,
  type PointOfInterest,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import { Headphones, MapPinned } from 'lucide-react-native';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/Text';
import { WebHorizontalRail } from '@/components/WebHorizontalRail';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import type { AppTheme } from '@/theme/tokens';
import { useAppTheme } from '@/theme/useAppTheme';

export function PoiPreviewList() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('map');

  if (Platform.OS === 'web') {
    return (
      <WebHorizontalRail accessibilityLabel={t('featuredPoisLabel')} testID="poi-preview-rail">
        {INITIAL_POIS.map((item) => (
          <PoiPreviewCard item={item} key={item.id} language={language} theme={theme} />
        ))}
      </WebHorizontalRail>
    );
  }

  return (
    <FlatList
      horizontal
      contentContainerStyle={styles.list}
      data={INITIAL_POIS}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <PoiPreviewCard item={item} language={language} theme={theme} />}
      showsHorizontalScrollIndicator={false}
    />
  );
}

type PoiPreviewCardProps = {
  readonly item: PointOfInterest;
  readonly language: SupportedLanguageCode;
  readonly theme: AppTheme;
};

function PoiPreviewCard({ item, language, theme }: PoiPreviewCardProps) {
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: theme.colors.surfaceMuted }]}>
        {item.category === 'teleferico' ? (
          <Headphones color={theme.colors.primary} size={20} />
        ) : (
          <MapPinned color={theme.colors.primary} size={20} />
        )}
      </View>
      <AppText variant="label">{resolveLocalizedText(item.name, language)}</AppText>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {item.category}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexShrink: 0,
    gap: 8,
    minHeight: 146,
    padding: 14,
    width: 180,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  list: {
    gap: 12,
    paddingRight: 20,
  },
});
