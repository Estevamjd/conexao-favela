import { router, type Href } from 'expo-router';
import { CreditCard, RefreshCw } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import {
  formatGateway,
  formatPaymentAmount,
  paymentMethodKey,
  paymentStatusKey,
} from '@/features/payments/payment-formatters';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { usePaymentStore } from '@/stores/payment-store';
import { useAppTheme } from '@/theme/useAppTheme';

function formatDate(iso: string | undefined, language: string): string {
  if (!iso) {
    return '-';
  }

  return new Intl.DateTimeFormat(language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function paymentRoute(bookingId: string): Href {
  return `/(tourist)/payment/${bookingId}`;
}

export default function PaymentHistoryScreen() {
  return (
    <RequireAuth role="tourist">
      <PaymentHistoryContent />
    </RequireAuth>
  );
}

function PaymentHistoryContent() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('payments');
  const payments = usePaymentStore((state) => state.localPayments);
  const syncPaymentHistory = usePaymentStore((state) => state.syncPaymentHistory);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    void syncPaymentHistory();
  }, [syncPaymentHistory]);

  async function refresh() {
    setSyncing(true);

    try {
      await syncPaymentHistory();
    } finally {
      setSyncing(false);
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t('historyTitle')}</AppText>
        <PrimaryButton
          disabled={syncing}
          icon={<RefreshCw color={theme.colors.primary} size={18} />}
          onPress={() => void refresh()}
          variant="ghost"
        >
          {t('refreshStatus')}
        </PrimaryButton>
      </View>

      {payments.length === 0 ? (
        <InfoCard description={t('emptyHistory')} title={t('historyTitle')}>
          <CreditCard color={theme.colors.primary} size={28} />
        </InfoCard>
      ) : null}

      {payments.map((payment) => {
        const paymentBookingId = payment.bookingId;

        return (
          <InfoCard
            key={payment.paymentId}
            description={formatDate(payment.createdAtIso, language)}
            title={formatPaymentAmount(payment.amountCents, payment.currency, language)}
          >
            <View style={styles.paymentMeta}>
              <Meta label={t('gateway')} value={formatGateway(payment.gateway)} />
              <Meta label={t('methodTitle')} value={t(paymentMethodKey(payment.paymentMethod))} />
              <Meta label={t('transactionId')} value={payment.gatewayPaymentId} />
              <Meta label={t('nextRenewal')} value={t('noRenewal')} />
              <AppText color={theme.colors.primary} variant="label">
                {t(paymentStatusKey(payment.status))}
              </AppText>
            </View>
            {paymentBookingId ? (
              <PrimaryButton
                icon={<CreditCard color={theme.colors.primary} size={18} />}
                onPress={() => router.push(paymentRoute(paymentBookingId))}
                variant="ghost"
              >
                {t('title')}
              </PrimaryButton>
            ) : null}
          </InfoCard>
        );
      })}
    </Screen>
  );
}

type MetaProps = {
  readonly label: string;
  readonly value: string;
};

function Meta({ label, value }: MetaProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.metaItem}>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 12,
  },
  metaItem: {
    gap: 3,
  },
  paymentMeta: {
    gap: 10,
  },
});
