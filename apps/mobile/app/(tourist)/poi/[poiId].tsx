import { INITIAL_COMMUNITY, INITIAL_POIS, resolveLocalizedText } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import {
  ArrowLeft,
  Clock3,
  Image,
  Info,
  MapPinned,
  Route,
  Square,
  Volume2,
} from 'lucide-react-native';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import {
  findPoiForCommunity,
  findPoiSubArea,
  formatPoiCoordinates,
} from '@/features/pois/poi-detail';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function PoiDetailScreen() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['experience', 'map', 'tours']);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const params = useLocalSearchParams<{ poiId?: string }>();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const poiId = typeof params.poiId === 'string' ? params.poiId : undefined;
  const poi = findPoiForCommunity(INITIAL_POIS, poiId, currentCommunityId);

  useEffect(() => () => void Speech.stop(), []);

  if (!poi) {
    return (
      <Screen>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('tours:back')}
        </PrimaryButton>
        <InfoCard description={t('map:poiNotFoundBody')} title={t('map:poiNotFoundTitle')} />
      </Screen>
    );
  }

  const title = resolveLocalizedText(poi.name, language);
  const description = resolveLocalizedText(poi.description, language);
  const subArea = findPoiSubArea(INITIAL_COMMUNITY, poi);
  const category = t(`map:categoryLabels.${poi.category}`);
  const transcript =
    poi.audioGuide?.[language]?.transcript ??
    (poi.historicalInfo ? resolveLocalizedText(poi.historicalInfo, language) : description);

  function toggleAudioGuide() {
    if (isSpeaking) {
      void Speech.stop();
      setIsSpeaking(false);
      return;
    }

    Speech.speak(transcript, {
      language: speechLanguage(language),
      onDone: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
      onStopped: () => setIsSpeaking(false),
    });
    setIsSpeaking(true);
  }

  return (
    <Screen>
      <PrimaryButton
        icon={<ArrowLeft color={theme.colors.primary} size={18} />}
        onPress={() => router.back()}
        variant="ghost"
      >
        {t('tours:back')}
      </PrimaryButton>

      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {category}
        </AppText>
        <AppText variant="hero">{title}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {description}
        </AppText>
      </View>

      <InfoCard title={t('map:poiDetailTitle')}>
        <View style={styles.detailGrid}>
          <DetailItem
            icon={<Route color={theme.colors.primary} size={18} />}
            label={t('map:subArea')}
            value={subArea?.name ?? ''}
          />
          <DetailItem
            icon={<MapPinned color={theme.colors.primary} size={18} />}
            label={t('map:coordinates')}
            value={formatPoiCoordinates(poi)}
          />
          <DetailItem
            icon={<Clock3 color={theme.colors.primary} size={18} />}
            label={t('map:bestTime')}
            value={poi.bestTimeToVisit ?? t('map:no')}
          />
          <DetailItem
            icon={<Info color={theme.colors.primary} size={18} />}
            label={t('map:category')}
            value={category}
          />
        </View>
      </InfoCard>

      <InfoCard title={t('map:accessibility')}>
        <View style={styles.accessibilityRow}>
          <StatusPill active={poi.accessibility.wheelchairAccessible} label={t('map:wheelchair')} />
          <StatusPill active={poi.accessibility.hasRestrooms} label={t('map:restrooms')} />
          <StatusPill active={poi.accessibility.hasParking} label={t('map:parking')} />
        </View>
      </InfoCard>

      <InfoCard description={transcript} title={t('experience:audioTitle')}>
        <PrimaryButton
          icon={
            isSpeaking ? (
              <Square color="#ffffff" size={18} />
            ) : (
              <Volume2 color="#ffffff" size={18} />
            )
          }
          onPress={toggleAudioGuide}
        >
          {isSpeaking ? t('experience:audioStop') : t('experience:audioPlay')}
        </PrimaryButton>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {t('experience:transcript')}
        </AppText>
      </InfoCard>

      <InfoCard description={t('map:mediaPreviewBody')} title={t('map:mediaPreviewTitle')}>
        <View style={styles.mediaRow}>
          <View style={[styles.mediaThumb, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Image color={theme.colors.primary} size={24} />
          </View>
          <View style={styles.mediaText}>
            <AppText variant="label">{poi.media.coverImageUrl}</AppText>
            <AppText color={theme.colors.textSecondary} variant="caption">
              {t('map:localGuideReviewNotice')}
            </AppText>
          </View>
        </View>
      </InfoCard>

      <PrimaryButton
        icon={<MapPinned color="#ffffff" size={18} />}
        onPress={() => router.push('/map')}
      >
        {t('map:returnToMap')}
      </PrimaryButton>
    </Screen>
  );
}

function speechLanguage(language: string): string {
  const languageMap: Readonly<Record<string, string>> = {
    de: 'de-DE',
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    it: 'it-IT',
    ja: 'ja-JP',
    pt: 'pt-BR',
    zh: 'zh-CN',
  };
  return languageMap[language] ?? 'pt-BR';
}

type DetailItemProps = {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: string;
};

function DetailItem({ icon, label, value }: DetailItemProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.detailItem, { backgroundColor: theme.colors.surfaceMuted }]}>
      {icon}
      <View style={styles.detailText}>
        <AppText color={theme.colors.textSecondary} variant="caption">
          {label}
        </AppText>
        <AppText variant="label">{value}</AppText>
      </View>
    </View>
  );
}

type StatusPillProps = {
  readonly active: boolean;
  readonly label: string;
};

function StatusPill({ active, label }: StatusPillProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('map');

  return (
    <View
      style={[
        styles.statusPill,
        {
          backgroundColor: active ? theme.colors.surfaceMuted : theme.colors.surface,
          borderColor: active ? theme.colors.success : theme.colors.border,
        },
      ]}
    >
      <AppText color={active ? theme.colors.success : theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{active ? t('yes') : t('no')}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  accessibilityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  detailItem: {
    alignItems: 'flex-start',
    borderRadius: 12,
    flexBasis: 150,
    flexDirection: 'row',
    flexGrow: 1,
    gap: 10,
    padding: 12,
  },
  detailText: {
    flex: 1,
    gap: 3,
  },
  header: {
    gap: 8,
  },
  mediaRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
  },
  mediaText: {
    flex: 1,
    gap: 3,
  },
  mediaThumb: {
    alignItems: 'center',
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    width: 54,
  },
  statusPill: {
    borderRadius: 12,
    borderWidth: 1,
    gap: 3,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
});
