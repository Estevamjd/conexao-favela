import { router } from 'expo-router';
import { ArrowRight, Languages, LogIn, Sparkles } from 'lucide-react-native';
import { FlatList, Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { INITIAL_COMMUNITY } from '@conexao-favela/shared';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { WebHorizontalRail } from '@/components/WebHorizontalRail';
import { CommunityOverview } from '@/features/home/CommunityOverview';
import { PoiPreviewList } from '@/features/tours/PoiPreviewList';
import { TourCard } from '@/features/tours/TourCard';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function TouristHomeScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation(['common', 'experience', 'tours']);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const currentLanguage = useCurrentLanguage();
  const { tours: featuredTours } = useCommunityTours(currentCommunityId);

  return (
    <Screen>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <AppText color={theme.colors.primary} variant="label">
            {t('common:appName')}
          </AppText>
          <AppText variant="title">{t('common:tagline')}</AppText>
        </View>
        <PrimaryButton
          icon={<Languages color={theme.colors.primary} size={18} />}
          onPress={() => router.push('/(auth)/language')}
          variant="ghost"
        >
          {currentLanguage.toUpperCase()}
        </PrimaryButton>
      </View>

      <CommunityOverview />

      <PrimaryButton
        icon={<LogIn color="#ffffff" size={18} />}
        onPress={() => router.push('/(auth)/sign-in')}
      >
        {t('common:signInCta')}
      </PrimaryButton>

      <PrimaryButton
        icon={<Sparkles color={theme.colors.primary} size={18} />}
        onPress={() => router.push('/experience')}
        variant="ghost"
      >
        {t('experience:hubTitle')}
      </PrimaryButton>

      <View style={styles.sectionHeaderWithAction}>
        <AppText variant="subtitle">{t('tours:featuredTours')}</AppText>
        <PrimaryButton
          icon={<ArrowRight color="#ffffff" size={18} />}
          onPress={() => router.push('/(tourist)/explore')}
        >
          {t('common:explore')}
        </PrimaryButton>
      </View>
      {Platform.OS === 'web' ? (
        <WebHorizontalRail
          accessibilityLabel={t('tours:featuredTours')}
          testID="featured-tour-rail"
        >
          {featuredTours.map((item) => (
            <TourCard
              compact
              key={item.id}
              onPress={() => router.push(`/tour/${item.id}`)}
              subAreas={INITIAL_COMMUNITY.subAreas}
              tour={item}
            />
          ))}
        </WebHorizontalRail>
      ) : (
        <FlatList
          horizontal
          contentContainerStyle={styles.tourList}
          data={featuredTours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourCard
              compact
              onPress={() => router.push(`/tour/${item.id}`)}
              subAreas={INITIAL_COMMUNITY.subAreas}
              tour={item}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />
      )}

      <View style={styles.sectionHeader}>
        <AppText variant="subtitle">{t('common:pointsOfInterest')}</AppText>
      </View>
      <PoiPreviewList />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
    minWidth: 0,
  },
  sectionHeader: {
    marginBottom: -8,
  },
  sectionHeaderWithAction: {
    gap: 12,
  },
  tourList: {
    gap: 12,
    paddingRight: 20,
  },
});
