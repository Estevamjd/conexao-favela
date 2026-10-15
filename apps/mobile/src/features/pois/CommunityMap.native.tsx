import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/useAppTheme';
import { buildCommunityMapRegion, type CommunityMapProps } from './community-map';

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
    <View style={[styles.frame, { borderColor: theme.colors.border }]}>
      <MapView
        accessibilityLabel={t('interactiveMapLabel')}
        initialRegion={region}
        mapType="standard"
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        rotateEnabled={false}
        showsCompass
        showsMyLocationButton={false}
        style={styles.map}
        toolbarEnabled={false}
      >
        {pois.map((poi) => (
          <Marker
            accessibilityLabel={getPoiLabel(poi)}
            coordinate={{ latitude: poi.coordinates.lat, longitude: poi.coordinates.lng }}
            description={getPoiLabel(poi)}
            key={poi.id}
            onPress={() => onSelectPoi(poi.id)}
            pinColor={poi.id === selectedPoiId ? theme.colors.accent : theme.colors.primary}
            title={getPoiLabel(poi)}
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: 16,
    borderWidth: 1,
    height: 280,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },
});
