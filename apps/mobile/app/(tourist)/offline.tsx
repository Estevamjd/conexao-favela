import { INITIAL_POIS } from '@conexao-favela/shared';
import { Download, Trash2, WifiOff } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { RequireAuth } from '@/components/RequireAuth';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useOfflineStore } from '@/stores/offline-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function OfflineRoute() {
  return (
    <RequireAuth role="tourist">
      <OfflineScreen />
    </RequireAuth>
  );
}

function OfflineScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const language = useCurrentLanguage();
  const { tours } = useCommunityTours(communityId);
  const packs = useOfflineStore((state) => state.packs);
  const downloadPack = useOfflineStore((state) => state.downloadPack);
  const removePack = useOfflineStore((state) => state.removePack);
  const pack = packs.find((item) => item.communityId === communityId);

  return (
    <Screen>
      <View style={styles.header}>
        <WifiOff color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('offlineTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('offlineBody')}
        </AppText>
      </View>
      {pack ? (
        <InfoCard
          description={t('offlineItems', {
            pois: pack.poiIds.length,
            tours: pack.tourIds.length,
          })}
          title={t('offlineReady')}
        >
          <PrimaryButton
            icon={<Trash2 color={theme.colors.primary} size={18} />}
            onPress={() => removePack(communityId)}
            variant="ghost"
          >
            {t('removeOffline')}
          </PrimaryButton>
        </InfoCard>
      ) : (
        <InfoCard description={t('offlineBody')} title={t('offlineTitle')}>
          <PrimaryButton
            icon={<Download color="#ffffff" size={18} />}
            onPress={() =>
              downloadPack({
                communityId,
                languages: [language],
                pois: INITIAL_POIS,
                tours,
              })
            }
          >
            {t('downloadOffline')}
          </PrimaryButton>
        </InfoCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ header: { gap: 8 } });
