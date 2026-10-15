import { router, useLocalSearchParams, type Href } from 'expo-router';
import { CircleCheckBig, CircleX, RefreshCw, WalletCards } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { paymentStatusKey } from '@/features/payments/payment-formatters';
import { usePaymentStore } from '@/stores/payment-store';
import { useAppTheme } from '@/theme/useAppTheme';

const paymentHistoryRoute = '/(tourist)/payments' as Href;

type PaymentReturnScreenProps = {
  readonly kind: 'cancel' | 'success';
};

export function PaymentReturnScreen({ kind }: PaymentReturnScreenProps) {
  return (
    <RequireAuth role="tourist">
      <PaymentReturnContent kind={kind} />
    </RequireAuth>
  );
}

function PaymentReturnContent({ kind }: PaymentReturnScreenProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('payments');
  const params = useLocalSearchParams<{ paymentId?: string }>();
  const paymentId = typeof params.paymentId === 'string' ? params.paymentId : undefined;
  const payments = usePaymentStore((state) => state.localPayments);
  const refreshPayment = usePaymentStore((state) => state.refreshPayment);
  const payment = payments.find((item) => item.paymentId === paymentId);
  const [checking, setChecking] = useState(kind === 'success' && Boolean(paymentId));
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    if (!paymentId) {
      setError(t('notFoundBody'));
      setChecking(false);
      return;
    }

    setChecking(true);
    setError(null);

    try {
      await refreshPayment(paymentId);
    } catch (refreshError: unknown) {
      setError(refreshError instanceof Error ? refreshError.message : t('notFoundBody'));
    } finally {
      setChecking(false);
    }
  }, [paymentId, refreshPayment, t]);

  useEffect(() => {
    if (kind === 'success') {
      void checkStatus();
    }
  }, [checkStatus, kind]);

  const approved = payment?.status === 'approved';
  const approvedBookingId = approved ? payment.bookingId : undefined;
  const title =
    kind === 'cancel'
      ? t('returnCancelTitle')
      : approved
        ? t('returnSuccessTitle')
        : t('returnPendingTitle');
  const body =
    kind === 'cancel'
      ? t('returnCancelBody')
      : approved
        ? t('returnSuccessBody')
        : t('returnPendingBody');

  return (
    <Screen>
      <AppText color={theme.colors.primary} variant="label">
        {payment ? t(paymentStatusKey(payment.status)) : t('title')}
      </AppText>
      <InfoCard description={body} title={title}>
        {kind === 'cancel' ? (
          <CircleX color={theme.colors.warning} size={44} />
        ) : approved ? (
          <CircleCheckBig color={theme.colors.success} size={44} />
        ) : (
          <WalletCards color={theme.colors.primary} size={44} />
        )}
        {checking ? (
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('returnChecking')}
          </AppText>
        ) : null}
        {error ? (
          <AppText color={theme.colors.error} variant="body">
            {error}
          </AppText>
        ) : null}
      </InfoCard>

      {kind === 'success' && !approved ? (
        <PrimaryButton
          disabled={checking}
          icon={<RefreshCw color="#ffffff" size={18} />}
          onPress={() => void checkStatus()}
        >
          {t('refreshStatus')}
        </PrimaryButton>
      ) : null}

      {approvedBookingId ? (
        <PrimaryButton
          icon={<CircleCheckBig color="#ffffff" size={18} />}
          onPress={() => router.replace(`/(tourist)/booking/${approvedBookingId}`)}
        >
          {t('successCta')}
        </PrimaryButton>
      ) : null}

      <PrimaryButton
        icon={<WalletCards color={theme.colors.primary} size={18} />}
        onPress={() => router.replace(paymentHistoryRoute)}
        variant="ghost"
      >
        {t('backToPaymentHistory')}
      </PrimaryButton>
    </Screen>
  );
}
