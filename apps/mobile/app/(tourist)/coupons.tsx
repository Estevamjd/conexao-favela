import { INITIAL_COUPONS, resolveLocalizedText } from '@conexao-favela/shared';
import { Tags } from 'lucide-react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { RequireAuth } from '@/components/RequireAuth';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function CouponsRoute() {
  return (
    <RequireAuth role="tourist">
      <CouponsScreen />
    </RequireAuth>
  );
}

function CouponsScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const coupons = INITIAL_COUPONS.filter(
    (coupon) => coupon.communityId === communityId && coupon.active,
  );

  return (
    <Screen contentStyle={styles.screen} scroll={false}>
      <View style={styles.header}>
        <Tags color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('couponsTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('couponsBody')}
        </AppText>
      </View>
      <FlatList
        contentContainerStyle={styles.list}
        data={coupons}
        keyExtractor={(coupon) => coupon.id}
        renderItem={({ item }) => (
          <InfoCard
            description={resolveLocalizedText(item.description, language)}
            title={item.code}
          >
            <AppText color={theme.colors.primary} variant="label">
              {item.discount.type === 'percentage'
                ? `${item.discount.percentage.toString()}%`
                : new Intl.NumberFormat(language, {
                    currency: 'BRL',
                    style: 'currency',
                  }).format(item.discount.amountCents / 100)}
            </AppText>
          </InfoCard>
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  list: { gap: 12, paddingBottom: 96 },
  screen: { flex: 1 },
});
