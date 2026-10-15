import type { PaymentCurrency } from '@conexao-favela/shared';
import { WalletCards } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { formatPaymentAmount } from '@/features/payments/payment-formatters';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useAuthStore } from '@/stores/auth-store';
import { usePaymentStore } from '@/stores/payment-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

const currencies: readonly PaymentCurrency[] = ['BRL', 'USD', 'EUR'];

export default function GuideFinanceRoute() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const currentUser = useAuthStore((state) => state.currentUser);
  const communityId = useSessionStore((state) => state.currentCommunityId);
  const guideId = resolveActiveGuideId(currentUser);
  const { bookings } = useCurrentUserBookings();
  const payments = usePaymentStore((state) => state.localPayments);
  const bookingIds = new Set(
    bookings
      .filter((booking) => booking.communityId === communityId && booking.guideId === guideId)
      .map((booking) => booking.id),
  );
  const guidePayments = payments.filter(
    (payment) => payment.bookingId && bookingIds.has(payment.bookingId),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <WalletCards color={theme.colors.primary} size={30} />
        <AppText variant="title">{t('financeTitle')}</AppText>
      </View>
      {currencies.map((currency) => {
        const currencyPayments = guidePayments.filter((payment) => payment.currency === currency);
        const approved = currencyPayments
          .filter((payment) => payment.status === 'approved')
          .reduce((total, payment) => total + payment.amountCents, 0);
        const pending = currencyPayments
          .filter((payment) => payment.status === 'pending')
          .reduce((total, payment) => total + payment.amountCents, 0);
        const refunded = currencyPayments
          .filter((payment) => payment.status === 'refunded' || payment.status === 'chargeback')
          .reduce((total, payment) => total + payment.amountCents, 0);

        return (
          <InfoCard key={currency} title={currency}>
            <FinanceRow
              label={t('grossRevenue')}
              value={formatPaymentAmount(approved, currency, language)}
            />
            <FinanceRow
              label={t('pendingRevenue')}
              value={formatPaymentAmount(pending, currency, language)}
            />
            <FinanceRow
              label={t('refundedRevenue')}
              value={formatPaymentAmount(refunded, currency, language)}
            />
          </InfoCard>
        );
      })}
    </Screen>
  );
}

function FinanceRow({ label, value }: { readonly label: string; readonly value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <AppText color={theme.colors.textSecondary} variant="body">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: 8 },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
});
