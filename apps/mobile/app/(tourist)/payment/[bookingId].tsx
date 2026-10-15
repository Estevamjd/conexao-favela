import {
  calculateBookingPaymentAmount,
  INITIAL_COUPONS,
  normalizeCouponCode,
  validateCoupon,
  type PaymentMethod,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  ArrowLeft,
  CircleCheckBig,
  Copy,
  CreditCard,
  QrCode,
  RefreshCw,
  TicketPercent,
} from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Alert, AppState, Image, Platform, StyleSheet, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { OptionChip } from '@/features/auth/components/OptionChip';
import {
  formatGateway,
  formatPaymentAmount,
  paymentMethodKey,
  paymentStatusKey,
} from '@/features/payments/payment-formatters';
import { formatBookingDate } from '@/features/bookings/booking-formatters';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { canUseRemotePaymentService } from '@/services/payment-service';
import { useCouponStore } from '@/stores/coupon-store';
import { usePaymentStore } from '@/stores/payment-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

const paymentHistoryRoute = '/(tourist)/payments' as Href;

function resolveQrUri(pixQrCode: string | undefined): string | null {
  if (!pixQrCode || pixQrCode.startsWith('demo-qr:')) {
    return null;
  }

  return pixQrCode.startsWith('data:image') ? pixQrCode : `data:image/png;base64,${pixQrCode}`;
}

async function copyText(value: string): Promise<void> {
  const clipboard = Platform.OS === 'web' ? globalThis.navigator.clipboard : undefined;

  if (clipboard) {
    await clipboard.writeText(value);
  }
}

export default function PaymentScreen() {
  return (
    <RequireAuth role="tourist">
      <PaymentContent />
    </RequireAuth>
  );
}

function PaymentContent() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['payments', 'bookings', 'tours', 'experience']);
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;
  const preferredCurrency = useSessionStore((state) => state.preferredCurrency);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { bookings } = useCurrentUserBookings();
  const { tours } = useCommunityTours(currentCommunityId);
  const booking = bookings.find((item) => item.id === bookingId);
  const tour = tours.find((item) => item.id === booking?.tourId);
  const createPayment = usePaymentStore((state) => state.createPayment);
  const refreshPayment = usePaymentStore((state) => state.refreshPayment);
  const approveLocalPayment = usePaymentStore((state) => state.approveLocalPayment);
  const payments = usePaymentStore((state) => state.localPayments);
  const appliedCoupons = useCouponStore((state) => state.appliedCoupons);
  const applyCoupon = useCouponStore((state) => state.applyCoupon);
  const clearCoupon = useCouponStore((state) => state.clearCoupon);
  const existingPayment = useMemo(
    () =>
      [...payments]
        .filter((payment) => payment.bookingId === bookingId)
        .sort((first, second) =>
          (second.createdAtIso ?? '').localeCompare(first.createdAtIso ?? ''),
        )[0],
    [bookingId, payments],
  );
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    preferredCurrency === 'BRL' ? 'pix' : 'card',
  );
  const appliedCoupon = appliedCoupons.find((item) => item.bookingId === bookingId);
  const [couponDraft, setCouponDraft] = useState(appliedCoupon?.code ?? '');
  const [couponFeedback, setCouponFeedback] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isRemoteMode = canUseRemotePaymentService();
  const previewAmount = useMemo(() => {
    if (!booking || !tour) {
      return null;
    }

    try {
      return calculateBookingPaymentAmount(booking, tour, preferredCurrency);
    } catch {
      return null;
    }
  }, [booking, preferredCurrency, tour]);

  useEffect(() => {
    if (!isRemoteMode || existingPayment?.status !== 'pending') {
      return undefined;
    }

    const paymentId = existingPayment.paymentId;
    const refreshPendingPayment = () => {
      void refreshPayment(paymentId).catch(() => undefined);
    };
    const interval = setInterval(refreshPendingPayment, 8_000);
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshPendingPayment();
      }
    });

    return () => {
      clearInterval(interval);
      appStateSubscription.remove();
    };
  }, [existingPayment?.paymentId, existingPayment?.status, isRemoteMode, refreshPayment]);

  if (!booking) {
    return (
      <Screen>
        <PrimaryButton
          icon={<ArrowLeft color={theme.colors.primary} size={18} />}
          onPress={() => router.back()}
          variant="ghost"
        >
          {t('tours:back')}
        </PrimaryButton>
        <InfoCard
          description={t('payments:bookingNotFoundBody')}
          title={t('payments:bookingNotFoundTitle')}
        />
      </Screen>
    );
  }

  const payableBooking = booking;
  const country = preferredCurrency === 'BRL' ? 'BR' : 'US';
  const availableMethods: readonly PaymentMethod[] =
    preferredCurrency === 'BRL' ? ['pix', 'card', 'boleto'] : ['card'];
  const payment = existingPayment;
  const displayAmount = payment
    ? formatPaymentAmount(payment.amountCents, payment.currency, language)
    : appliedCoupon?.currency === preferredCurrency
      ? formatPaymentAmount(appliedCoupon.finalAmountCents, preferredCurrency, language)
      : previewAmount
        ? formatPaymentAmount(previewAmount.amountCents, previewAmount.currency, language)
        : '-';
  const qrUri = resolveQrUri(payment?.pixQrCode);

  function handleApplyCoupon() {
    if (!bookingId || !tour || !previewAmount) return;
    const code = normalizeCouponCode(couponDraft);
    const coupon = INITIAL_COUPONS.find((item) => item.code === code);
    const result = coupon
      ? validateCoupon({
          amountCents: previewAmount.amountCents,
          coupon,
          currency: preferredCurrency,
          tourId: tour.id,
        })
      : null;

    if (!coupon || !result?.valid) {
      clearCoupon(bookingId);
      setCouponFeedback(t('experience:couponInvalid'));
      return;
    }

    applyCoupon({
      bookingId,
      code,
      currency: preferredCurrency,
      discountAmountCents: result.discountAmountCents,
      finalAmountCents: result.finalAmountCents,
    });
    setCouponDraft(code);
    setCouponFeedback(
      t('experience:couponApplied', {
        amount: formatPaymentAmount(result.discountAmountCents, preferredCurrency, language),
      }),
    );
  }

  async function handleCreatePayment() {
    if (!tour || !previewAmount) {
      Alert.alert(
        t('payments:currencyUnavailableTitle'),
        t('payments:currencyUnavailableBody', { currency: preferredCurrency }),
      );
      return;
    }

    setSubmitting(true);

    try {
      await createPayment(
        {
          bookingId: payableBooking.id,
          country,
          couponCode:
            appliedCoupon?.currency === preferredCurrency ? appliedCoupon.code : undefined,
          currency: preferredCurrency,
          paymentMethod: selectedMethod,
        },
        payableBooking,
        tour,
      );
    } catch (error: unknown) {
      Alert.alert(
        t('payments:tryAgain'),
        error instanceof Error ? error.message : t('bookings:bookingError'),
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRefreshPayment() {
    if (!payment) {
      return;
    }

    setSubmitting(true);

    try {
      await refreshPayment(payment.paymentId);
    } finally {
      setSubmitting(false);
    }
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
          {payment ? t(`payments:${paymentStatusKey(payment.status)}`) : t('payments:title')}
        </AppText>
        <AppText variant="title">{t('payments:title')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {formatBookingDate(booking.scheduledFor.toDate(), language)}
        </AppText>
      </View>

      {!isRemoteMode ? (
        <InfoCard description={t('payments:demoNotice')} title={t('payments:demoTitle')} />
      ) : null}

      <InfoCard title={t('payments:summaryTitle')}>
        <DetailRow label={t('payments:amount')} value={displayAmount} />
        {payment?.discountAmountCents ? (
          <DetailRow
            label={t('experience:couponsTitle')}
            value={`-${formatPaymentAmount(payment.discountAmountCents, payment.currency, language)}`}
          />
        ) : appliedCoupon?.currency === preferredCurrency ? (
          <DetailRow
            label={t('experience:couponsTitle')}
            value={`-${formatPaymentAmount(appliedCoupon.discountAmountCents, preferredCurrency, language)}`}
          />
        ) : null}
        <DetailRow label={t('bookings:bookingCode')} value={payableBooking.id} />
        {payment ? (
          <>
            <DetailRow label={t('payments:gateway')} value={formatGateway(payment.gateway)} />
            <DetailRow label={t('payments:transactionId')} value={payment.gatewayPaymentId} />
          </>
        ) : null}
      </InfoCard>

      {!payment && !previewAmount ? (
        <InfoCard
          description={t('payments:currencyUnavailableBody', { currency: preferredCurrency })}
          title={t('payments:currencyUnavailableTitle')}
        />
      ) : null}

      {!payment ? (
        <>
          <InfoCard title={t('experience:couponsTitle')}>
            <View style={styles.couponRow}>
              <TextInput
                accessibilityLabel={t('experience:couponPlaceholder')}
                autoCapitalize="characters"
                onChangeText={(value) => {
                  setCouponDraft(value);
                  setCouponFeedback(null);
                }}
                placeholder={t('experience:couponPlaceholder')}
                placeholderTextColor={theme.colors.textSecondary}
                style={[
                  styles.couponInput,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textPrimary,
                  },
                ]}
                value={couponDraft}
              />
              <PrimaryButton
                disabled={!couponDraft.trim()}
                icon={<TicketPercent color={theme.colors.primary} size={18} />}
                onPress={handleApplyCoupon}
                variant="ghost"
              >
                {t('experience:applyCoupon')}
              </PrimaryButton>
            </View>
            {couponFeedback ? (
              <AppText color={theme.colors.textSecondary} variant="caption">
                {couponFeedback}
              </AppText>
            ) : null}
          </InfoCard>
          <InfoCard title={t('payments:methodTitle')}>
            <View style={styles.chipGroup}>
              {availableMethods.map((method) => (
                <OptionChip
                  key={method}
                  label={t(`payments:${paymentMethodKey(method)}`)}
                  onPress={() => setSelectedMethod(method)}
                  selected={selectedMethod === method}
                />
              ))}
            </View>
            <PrimaryButton
              disabled={submitting || !previewAmount}
              icon={<CreditCard color="#ffffff" size={18} />}
              onPress={() => void handleCreatePayment()}
            >
              {submitting ? t('payments:creatingPayment') : t('payments:createPayment')}
            </PrimaryButton>
          </InfoCard>
        </>
      ) : null}

      {payment?.paymentMethod === 'pix' ? (
        <InfoCard title={t('payments:pixQrTitle')}>
          {qrUri ? (
            <Image
              accessibilityLabel={t('payments:pixQrTitle')}
              source={{ uri: qrUri }}
              style={styles.qrImage}
            />
          ) : (
            <View style={[styles.qrFallback, { backgroundColor: theme.colors.surfaceMuted }]}>
              <QrCode color={theme.colors.primary} size={52} />
              <AppText color={theme.colors.textSecondary} variant="caption">
                {payment.pixQrCode ?? 'demo'}
              </AppText>
            </View>
          )}
          {payment.pixCopyPaste ? (
            <>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {payment.pixCopyPaste}
              </AppText>
              <PrimaryButton
                icon={<Copy color={theme.colors.primary} size={18} />}
                onPress={() => void copyText(payment.pixCopyPaste ?? '')}
                variant="ghost"
              >
                {t('payments:copyPix')}
              </PrimaryButton>
            </>
          ) : null}
        </InfoCard>
      ) : null}

      {payment?.checkoutUrl ? (
        <PrimaryButton
          icon={<CreditCard color="#ffffff" size={18} />}
          onPress={() => void WebBrowser.openBrowserAsync(payment.checkoutUrl ?? '')}
        >
          {t('payments:openCheckout')}
        </PrimaryButton>
      ) : null}

      {payment ? (
        <InfoCard
          description={
            payment.status === 'approved' ? t('payments:approvedBody') : t('payments:pendingBody')
          }
          title={t(`payments:${paymentStatusKey(payment.status)}`)}
        >
          <View style={styles.actions}>
            <PrimaryButton
              disabled={submitting}
              icon={<RefreshCw color={theme.colors.primary} size={18} />}
              onPress={() => void handleRefreshPayment()}
              variant="ghost"
            >
              {t('payments:refreshStatus')}
            </PrimaryButton>
            {!isRemoteMode && payment.status === 'pending' ? (
              <PrimaryButton
                icon={<CircleCheckBig color="#ffffff" size={18} />}
                onPress={() => approveLocalPayment(payment.paymentId)}
              >
                {t('payments:simulateApproval')}
              </PrimaryButton>
            ) : null}
            {payment.status === 'approved' ? (
              <PrimaryButton
                icon={<CircleCheckBig color="#ffffff" size={18} />}
                onPress={() => router.replace(`/booking/${payableBooking.id}`)}
              >
                {t('payments:successCta')}
              </PrimaryButton>
            ) : null}
          </View>
        </InfoCard>
      ) : null}

      <PrimaryButton
        icon={<CreditCard color={theme.colors.primary} size={18} />}
        onPress={() => router.push(paymentHistoryRoute)}
        variant="ghost"
      >
        {t('payments:historyCta')}
      </PrimaryButton>
    </Screen>
  );
}

type DetailRowProps = {
  readonly label: string;
  readonly value: string;
};

function DetailRow({ label, value }: DetailRowProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.detailRow}>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {label}
      </AppText>
      <AppText variant="label">{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  couponInput: {
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  couponRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  detailRow: {
    gap: 3,
  },
  header: {
    gap: 8,
  },
  qrFallback: {
    alignItems: 'center',
    borderRadius: 12,
    gap: 8,
    justifyContent: 'center',
    minHeight: 180,
    padding: 16,
  },
  qrImage: {
    alignSelf: 'center',
    borderRadius: 12,
    height: 220,
    width: 220,
  },
});
