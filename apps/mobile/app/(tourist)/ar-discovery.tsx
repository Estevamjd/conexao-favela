import { INITIAL_POIS, resolveLocalizedText } from '@conexao-favela/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router } from 'expo-router';
import { ArrowLeft, Camera, MapPinned, ScanLine } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function ArDiscoveryRoute() {
  return (
    <RequireAuth role="tourist">
      {Platform.OS === 'web' ? <WebFallback /> : <NativeAr />}
    </RequireAuth>
  );
}

function WebFallback() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  return (
    <Screen>
      <ScanLine color={theme.colors.primary} size={36} />
      <AppText variant="title">{t('arTitle')}</AppText>
      <InfoCard description={t('arWebFallback')} title={t('arBody')}>
        <PrimaryButton
          icon={<MapPinned color="#ffffff" size={18} />}
          onPress={() => router.replace('/map')}
        >
          {t('open')}
        </PrimaryButton>
      </InfoCard>
    </Screen>
  );
}

function NativeAr() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const [permission, requestPermission] = useCameraPermissions();
  const nearby = INITIAL_POIS.filter((poi) => poi.communityId === communityId).slice(0, 3);

  if (!permission?.granted) {
    return (
      <Screen>
        <Camera color={theme.colors.primary} size={36} />
        <AppText variant="title">{t('arTitle')}</AppText>
        <InfoCard description={t('arPermission')} title={t('arBody')}>
          <PrimaryButton onPress={() => void requestPermission()}>{t('arOpen')}</PrimaryButton>
        </InfoCard>
      </Screen>
    );
  }

  return (
    <View style={styles.root}>
      <CameraView facing="back" style={styles.camera} />
      <View style={styles.scrim} />
      <View style={styles.topBar}>
        <PrimaryButton
          icon={<ArrowLeft color="#ffffff" size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('back')}
        </PrimaryButton>
        <AppText color="#ffffff" variant="subtitle">
          {t('arTitle')}
        </AppText>
      </View>
      <View style={styles.targets}>
        {nearby.map((poi, index) => (
          <View key={poi.id} style={[styles.target, { marginLeft: index % 2 === 0 ? 20 : 110 }]}>
            <ScanLine color="#5ee5df" size={20} />
            <View>
              <AppText color="#ffffff" variant="label">
                {resolveLocalizedText(poi.name, language)}
              </AppText>
              <AppText color="rgba(255,255,255,0.78)" variant="caption">
                {resolveLocalizedText(poi.description, language).slice(0, 70)}
              </AppText>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: '#081216', flex: 1 },
  camera: { bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 },
  scrim: {
    backgroundColor: 'rgba(0,0,0,0.22)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  target: {
    backgroundColor: 'rgba(4,25,29,0.78)',
    borderColor: '#5ee5df',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    maxWidth: 280,
    padding: 12,
  },
  targets: { flex: 1, gap: 58, justifyContent: 'center', paddingHorizontal: 18 },
  topBar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 18,
    paddingTop: 58,
  },
});
