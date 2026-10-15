import type { CommunitySubArea, Tour } from '@conexao-favela/shared';
import { resolveLocalizedText } from '@conexao-favela/shared';
import { Clock3, MapPinned, UsersRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAppTheme } from '@/theme/useAppTheme';
import {
  formatTourCategory,
  formatTourDifficulty,
  formatTourDuration,
  formatTourPrice,
} from './tour-formatters';

type TourCardProps = {
  readonly compact?: boolean;
  readonly onPress: () => void;
  readonly subAreas: readonly CommunitySubArea[];
  readonly tour: Tour;
};

export function TourCard({ compact = false, onPress, subAreas, tour }: TourCardProps) {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const title = resolveLocalizedText(tour.title, language);
  const description = resolveLocalizedText(tour.description, language);
  const subAreaNames = tour.subAreaIds
    .map((subAreaId) => subAreas.find((subArea) => subArea.id === subAreaId)?.name)
    .filter((name): name is string => Boolean(name));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        compact ? styles.compactCard : null,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          opacity: pressed ? 0.78 : 1,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <AppText variant="subtitle">{title}</AppText>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {subAreaNames.join(' + ')}
          </AppText>
        </View>
        <View style={[styles.pricePill, { backgroundColor: theme.colors.surfaceMuted }]}>
          <AppText color={theme.colors.primary} variant="label">
            {formatTourPrice(tour, language)}
          </AppText>
        </View>
      </View>

      <AppText color={theme.colors.textSecondary} variant="body">
        {compact ? `${description.slice(0, 96)}...` : description}
      </AppText>

      <View style={styles.metaRow}>
        <View style={styles.metaItem}>
          <Clock3 color={theme.colors.primary} size={16} />
          <AppText variant="caption">{formatTourDuration(tour.route.estimatedDuration)}</AppText>
        </View>
        <View style={styles.metaItem}>
          <UsersRound color={theme.colors.primary} size={16} />
          <AppText variant="caption">{tour.capacity.maxTourists.toString()}</AppText>
        </View>
        <View style={styles.metaItem}>
          <MapPinned color={theme.colors.primary} size={16} />
          <AppText variant="caption">
            {formatTourCategory(tour.category, language)} /{' '}
            {formatTourDifficulty(tour.difficulty, language)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  compactCard: {
    flexShrink: 0,
    minHeight: 218,
    width: 300,
  },
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  metaItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pricePill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  titleBlock: {
    flex: 1,
    gap: 4,
  },
});
