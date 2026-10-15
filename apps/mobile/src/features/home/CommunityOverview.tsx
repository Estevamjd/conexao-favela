import { INITIAL_COMMUNITY, INITIAL_POIS, resolveLocalizedText } from '@conexao-favela/shared';
import { MapPin, ShieldCheck, UsersRound } from 'lucide-react-native';
import { ImageBackground, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAppTheme } from '@/theme/useAppTheme';
import communityTourImage from '../../../assets/images/community-tour.webp';

export function CommunityOverview() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('common');
  const description = resolveLocalizedText(INITIAL_COMMUNITY.description, language);

  return (
    <ImageBackground
      imageStyle={styles.image}
      source={communityTourImage}
      style={[
        styles.container,
        {
          backgroundColor: theme.colors.primaryDark,
          borderColor: theme.colors.primary,
        },
      ]}
    >
      <View style={styles.overlay} />
      <View style={[styles.badge, { backgroundColor: theme.colors.surface }]}>
        <MapPin color={theme.colors.secondary} size={16} />
        <AppText color={theme.colors.secondary} variant="caption">
          {INITIAL_COMMUNITY.city}, {INITIAL_COMMUNITY.state}
        </AppText>
      </View>

      <AppText color="#ffffff" variant="hero">
        {INITIAL_COMMUNITY.name}
      </AppText>
      <AppText color="rgba(255, 255, 255, 0.88)" variant="body">
        {description}
      </AppText>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <ShieldCheck color="#ffffff" size={18} />
          <AppText color="#ffffff" variant="label">
            {t('verifiedGuides')}
          </AppText>
        </View>
        <View style={styles.stat}>
          <UsersRound color="#ffffff" size={18} />
          <AppText color="#ffffff" variant="label">
            {t('seededPois', { count: INITIAL_POIS.length })}
          </AppText>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 999,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  container: {
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
    overflow: 'hidden',
    padding: 20,
    position: 'relative',
  },
  image: { borderRadius: 16 },
  overlay: {
    backgroundColor: 'rgba(5, 35, 38, 0.7)',
    bottom: 0,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  stat: {
    alignItems: 'center',
    backgroundColor: 'rgba(8, 56, 59, 0.28)',
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
