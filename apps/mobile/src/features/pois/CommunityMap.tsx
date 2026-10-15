import { MapPinned } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';
import {
  buildCommunityMapRegion,
  positionPoiInRegion,
  type CommunityMapProps,
} from './community-map';

function toPercent(value: number): `${number}%` {
  return String(value).concat('%') as `${number}%`;
}

export function CommunityMap({
  center,
  getPoiLabel,
  onSelectPoi,
  pois,
  selectedPoiId,
}: CommunityMapProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('map');
  const region = buildCommunityMapRegion(center, pois);

  return (
    <View
      accessibilityLabel={t('interactiveMapLabel')}
      style={[
        styles.map,
        { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border },
      ]}
    >
      <View
        pointerEvents="none"
        style={[styles.horizontalRoad, { borderColor: theme.colors.border }]}
      />
      <View
        pointerEvents="none"
        style={[styles.verticalRoad, { borderColor: theme.colors.border }]}
      />
      <View pointerEvents="none" style={styles.mapLabel}>
        <MapPinned color={theme.colors.textSecondary} size={16} />
        <AppText color={theme.colors.textSecondary} variant="caption">
          {t('webPreview')}
        </AppText>
      </View>

      {pois.map((poi, index) => {
        const selected = poi.id === selectedPoiId;
        const position = positionPoiInRegion(poi.coordinates, region);

        return (
          <Pressable
            accessibilityLabel={getPoiLabel(poi)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            key={poi.id}
            onPress={() => onSelectPoi(poi.id)}
            style={({ pressed }) => [
              styles.marker,
              {
                backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                borderColor: selected ? theme.colors.primaryLight : theme.colors.primary,
                left: toPercent(position.leftPercent),
                opacity: pressed ? 0.72 : 1,
                top: toPercent(position.topPercent),
                transform: [{ translateX: -18 }, { translateY: -18 }],
              },
            ]}
          >
            <AppText color={selected ? '#ffffff' : theme.colors.primary} variant="caption">
              {String(index + 1)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalRoad: {
    borderTopWidth: 1,
    left: 0,
    position: 'absolute',
    right: 0,
    top: '58%',
    transform: [{ rotate: '-8deg' }],
  },
  map: {
    borderRadius: 16,
    borderWidth: 1,
    height: 270,
    overflow: 'hidden',
    position: 'relative',
  },
  mapLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    left: 14,
    position: 'absolute',
    top: 12,
  },
  marker: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    width: 36,
  },
  verticalRoad: {
    borderLeftWidth: 1,
    bottom: 0,
    left: '62%',
    position: 'absolute',
    top: 0,
    transform: [{ rotate: '14deg' }],
  },
});
