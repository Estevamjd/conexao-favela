import { zodResolver } from '@hookform/resolvers/zod';
import {
  bookingRequestSchema,
  resolveLocalizedText,
  type BookingRequestInput,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarCheck } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { FormTextField } from '@/features/auth/components/FormTextField';
import { formatTourPrice } from '@/features/tours/tour-formatters';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAuthStore } from '@/stores/auth-store';
import { useBookingStore } from '@/stores/booking-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

type BookingFormInput = z.infer<typeof bookingFormSchema>;

const bookingFormSchema = z
  .object({
    numberOfTourists: z.number().int().min(1).max(30),
    primaryTouristName: z.string().trim().min(2).max(80),
    scheduledDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    scheduledTime: z.string().regex(/^\d{2}:\d{2}$/),
  })
  .strict();

function buildTouristsInfo(
  primaryName: string,
  numberOfTourists: number,
  getCompanionName: (position: number) => string,
) {
  return Array.from({ length: numberOfTourists }, (_, index) => ({
    name: index === 0 ? primaryName : getCompanionName(index + 1),
  }));
}

function formatDateInput(date: Date) {
  const year = date.getFullYear().toString();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function resolveDefaultScheduledDate() {
  const date = new Date();

  date.setDate(date.getDate() + 14);

  return formatDateInput(date);
}

function resolveBookingErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message.trim().length > 0 ? error.message : fallback;
}

export default function BookTourScreen() {
  return (
    <RequireAuth role="tourist">
      <BookTourContent />
    </RequireAuth>
  );
}

function BookTourContent() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation(['bookings', 'tours']);
  const params = useLocalSearchParams<{ tourId?: string }>();
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const { tours } = useCommunityTours(currentCommunityId);
  const tourId = typeof params.tourId === 'string' ? params.tourId : undefined;
  const tour = tours.find((item) => item.id === tourId);
  const currentUser = useAuthStore((state) => state.currentUser);
  const createBooking = useBookingStore((state) => state.createBooking);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<BookingFormInput>({
    defaultValues: {
      numberOfTourists: tour?.capacity.minTourists ?? 1,
      primaryTouristName: currentUser?.displayName ?? t('bookings:defaultTouristName'),
      scheduledDate: resolveDefaultScheduledDate(),
      scheduledTime: tour?.schedule.availableHours?.[0] ?? '09:00',
    },
    resolver: zodResolver(bookingFormSchema),
  });
  const numberOfTourists = form.watch('numberOfTourists');

  if (!tour) {
    return (
      <Screen>
        <InfoCard
          description={t('tours:unavailableDescription')}
          title={t('tours:unavailableTitle')}
        />
      </Screen>
    );
  }

  const submit = form.handleSubmit(async (values) => {
    const request: BookingRequestInput = bookingRequestSchema.parse({
      communityId: tour.communityId,
      guideId: tour.guideId,
      numberOfTourists: values.numberOfTourists,
      scheduledForIso: `${values.scheduledDate}T${values.scheduledTime}:00-03:00`,
      tourId: tour.id,
      touristId: currentUser?.uid ?? 'local-tourist',
      touristsInfo: buildTouristsInfo(
        values.primaryTouristName,
        values.numberOfTourists,
        (position) => t('bookings:companionName', { count: position }),
      ),
    });

    setFormError(null);
    setSubmitting(true);

    try {
      const booking = await createBooking(request, tour);

      router.replace(`/(tourist)/payment/${booking.id}`);
    } catch (error: unknown) {
      setFormError(resolveBookingErrorMessage(error, t('bookings:bookingError')));
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {t('bookings:offlineNotice')}
        </AppText>
        <AppText variant="title">{t('bookings:reserveTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {resolveLocalizedText(tour.title, language)} / {formatTourPrice(tour, language)}
        </AppText>
      </View>

      <Controller
        control={form.control}
        name="primaryTouristName"
        render={({ field, fieldState }) => (
          <FormTextField
            autoComplete="name"
            error={fieldState.error?.message}
            label={t('bookings:primaryTouristName')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />

      <View style={styles.inlineFields}>
        <Controller
          control={form.control}
          name="scheduledDate"
          render={({ field, fieldState }) => (
            <FormTextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              label={t('bookings:scheduledDate')}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder={resolveDefaultScheduledDate()}
              value={field.value}
            />
          )}
        />
        <Controller
          control={form.control}
          name="scheduledTime"
          render={({ field, fieldState }) => (
            <FormTextField
              autoCapitalize="none"
              error={fieldState.error?.message}
              label={t('bookings:scheduledTime')}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder="09:00"
              value={field.value}
            />
          )}
        />
      </View>

      <Controller
        control={form.control}
        name="numberOfTourists"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            keyboardType="number-pad"
            label={t('bookings:numberOfTourists')}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(Number.parseInt(value, 10) || 1)}
            value={field.value.toString()}
          />
        )}
      />

      <InfoCard
        description={t('bookings:pendingDescription')}
        title={t('bookings:pendingTitle', { count: numberOfTourists })}
      />

      <PrimaryButton
        disabled={submitting}
        icon={<CalendarCheck color="#ffffff" size={18} />}
        onPress={() => void submit()}
      >
        {submitting ? t('bookings:bookingSubmitting') : t('bookings:confirmBooking')}
      </PrimaryButton>

      {formError ? (
        <AppText color={theme.colors.error} variant="body">
          {formError}
        </AppText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 8,
  },
  inlineFields: {
    gap: 14,
  },
});
