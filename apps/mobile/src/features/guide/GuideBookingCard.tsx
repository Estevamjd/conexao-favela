import {
  getBookingCancellationState,
  getBookingCheckInState,
  INITIAL_TOURS,
  resolveLocalizedText,
  type Booking,
  type SupportedLanguageCode,
  type Tour,
} from '@conexao-favela/shared';
import { CircleCheckBig, Eye, LogIn, LogOut, ShieldCheck, XCircle } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AppText } from '@/components/Text';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAppTheme } from '@/theme/useAppTheme';

const localeByLanguage: Record<SupportedLanguageCode, string> = {
  pt: 'pt-BR',
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  zh: 'zh-CN',
  ja: 'ja-JP',
};

type GuideBookingCardProps = {
  readonly booking: Booking;
  readonly onCancel?: () => void;
  readonly onCheckIn?: () => void;
  readonly onCheckOut?: () => void;
  readonly onConfirm?: () => void;
  readonly onViewDetails?: () => void;
  readonly tour?: Tour;
};

export function GuideBookingCard({
  booking,
  onCancel,
  onCheckIn,
  onCheckOut,
  onConfirm,
  onViewDetails,
  tour: providedTour,
}: GuideBookingCardProps) {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('guide');
  const tour = providedTour ?? INITIAL_TOURS.find((item) => item.id === booking.tourId);
  const title = tour ? resolveLocalizedText(tour.title, language) : booking.tourId;
  const dateFormatter = new Intl.DateTimeFormat(localeByLanguage[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  const priceFormatter = new Intl.NumberFormat(localeByLanguage[language], {
    currency: booking.pricing.currency,
    maximumFractionDigits: 0,
    style: 'currency',
  });
  const canConfirm = booking.status === 'pending' && Boolean(onConfirm);
  const canCancel = getBookingCancellationState(booking, 'guide').canCancel && Boolean(onCancel);
  const canCheckIn = getBookingCheckInState(booking).canCheckIn && Boolean(onCheckIn);
  const canCheckOut = booking.status === 'in_progress' && !booking.checkOut && Boolean(onCheckOut);

  return (
    <InfoCard
      description={`${dateFormatter.format(booking.scheduledFor.toDate())} / ${priceFormatter.format(
        booking.pricing.totalPrice,
      )}`}
      title={title}
    >
      <View style={styles.metaGrid}>
        <View style={[styles.metaItem, { backgroundColor: theme.colors.surfaceMuted }]}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('statusLabel')}
          </AppText>
          <AppText variant="label">{t(`status.${booking.status}`)}</AppText>
        </View>
        <View style={[styles.metaItem, { backgroundColor: theme.colors.surfaceMuted }]}>
          <AppText color={theme.colors.textSecondary} variant="caption">
            {t('touristsCount', { count: booking.numberOfTourists })}
          </AppText>
          <AppText variant="label">{priceFormatter.format(booking.pricing.totalPrice)}</AppText>
        </View>
      </View>
      <AppText color={theme.colors.textSecondary} variant="caption">
        {t('meetingPoint')}: {booking.meetingPoint.name}
      </AppText>
      <View style={styles.actions}>
        {onViewDetails ? (
          <PrimaryButton
            icon={<Eye color="#ffffff" size={18} />}
            onPress={() => onViewDetails()}
            style={styles.actionButton}
          >
            {t('viewBookingDetails')}
          </PrimaryButton>
        ) : null}
        {canConfirm ? (
          <PrimaryButton
            icon={<ShieldCheck color="#ffffff" size={18} />}
            onPress={() => onConfirm?.()}
            style={styles.actionButton}
          >
            {t('confirm')}
          </PrimaryButton>
        ) : null}
        {canCheckIn ? (
          <PrimaryButton
            icon={<LogIn color="#ffffff" size={18} />}
            onPress={() => onCheckIn?.()}
            style={styles.actionButton}
          >
            {t('checkIn')}
          </PrimaryButton>
        ) : null}
        {canCheckOut ? (
          <PrimaryButton
            icon={<LogOut color="#ffffff" size={18} />}
            onPress={() => onCheckOut?.()}
            style={styles.actionButton}
          >
            {t('checkOut')}
          </PrimaryButton>
        ) : null}
        {booking.status === 'completed' ? (
          <PrimaryButton
            disabled
            icon={<CircleCheckBig color="#ffffff" size={18} />}
            onPress={() => undefined}
            style={styles.actionButton}
            variant="secondary"
          >
            {t('status.completed')}
          </PrimaryButton>
        ) : null}
        {canCancel ? (
          <PrimaryButton
            icon={<XCircle color={theme.colors.primary} size={18} />}
            onPress={() => onCancel?.()}
            style={styles.actionButton}
            variant="ghost"
          >
            {t('cancel')}
          </PrimaryButton>
        ) : null}
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    flexGrow: 1,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  metaItem: {
    borderRadius: 12,
    flexBasis: 130,
    flexGrow: 1,
    gap: 3,
    padding: 12,
  },
});
