import { canReviewBooking } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Camera, Star } from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, TextInput, View } from 'react-native';
import { RequireAuth } from '@/components/RequireAuth';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { OptionChip } from '@/features/auth/components/OptionChip';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useCurrentUserBookings } from '@/hooks/useCurrentUserBookings';
import { useReviewStore } from '@/stores/review-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function ReviewRoute() {
  return (
    <RequireAuth role="tourist">
      <ReviewScreen />
    </RequireAuth>
  );
}

function ReviewScreen() {
  const { t } = useTranslation('experience');
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = typeof params.bookingId === 'string' ? params.bookingId : undefined;
  const { bookings } = useCurrentUserBookings();
  const reviews = useReviewStore((state) => state.localReviews);
  const submitReview = useReviewStore((state) => state.submitReview);
  const booking = bookings.find((item) => item.id === bookingId);
  const existingReview = reviews.find((review) => review.bookingId === bookingId);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<readonly string[]>([]);

  if (!booking || (!canReviewBooking(booking) && !existingReview)) {
    return (
      <Screen>
        <InfoCard description={t('reviewUnavailable')} title={t('reviewTitle')} />
        <PrimaryButton onPress={() => router.back()} variant="ghost">
          {t('back')}
        </PrimaryButton>
      </Screen>
    );
  }

  async function selectPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ['images'],
      quality: 0.8,
      selectionLimit: 5,
    });
    if (!result.canceled) setPhotos(result.assets.map((asset) => asset.uri));
  }

  async function handleSubmit() {
    if (!booking || comment.trim().length < 10) {
      Alert.alert(t('reviewTitle'), t('commentPlaceholder'));
      return;
    }
    try {
      await submitReview({ booking, comment, language, photos, rating });
      Alert.alert(t('reviewTitle'), t('reviewSuccess'));
      router.replace(`/booking/${booking.id}`);
    } catch (error: unknown) {
      Alert.alert(
        t('reviewTitle'),
        error instanceof Error ? error.message : t('reviewUnavailable'),
      );
    }
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText variant="title">{t('reviewTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {t('reviewBody')}
        </AppText>
      </View>
      {existingReview ? (
        <InfoCard description={t('reviewSuccess')} title={t('reviewTitle')}>
          <AppText variant="title">{'★'.repeat(existingReview.rating)}</AppText>
        </InfoCard>
      ) : (
        <>
          <InfoCard title={t('rating')}>
            <View style={styles.ratingRow}>
              {([1, 2, 3, 4, 5] as const).map((value) => (
                <OptionChip
                  key={value}
                  label={value.toString()}
                  onPress={() => setRating(value)}
                  selected={rating === value}
                />
              ))}
            </View>
          </InfoCard>
          <InfoCard title={t('comment')}>
            <TextInput
              accessibilityLabel={t('comment')}
              multiline
              onChangeText={setComment}
              placeholder={t('commentPlaceholder')}
              placeholderTextColor={theme.colors.textSecondary}
              style={[
                styles.commentInput,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.textPrimary,
                },
              ]}
              value={comment}
            />
          </InfoCard>
          <PrimaryButton
            icon={<Camera color={theme.colors.primary} size={18} />}
            onPress={() => void selectPhotos()}
            variant="ghost"
          >
            {photos.length > 0 ? t('photoCount', { count: photos.length }) : t('addPhotos')}
          </PrimaryButton>
          <PrimaryButton
            icon={<Star color="#ffffff" size={18} />}
            onPress={() => void handleSubmit()}
          >
            {t('submitReview')}
          </PrimaryButton>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  commentInput: {
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 130,
    padding: 12,
    textAlignVertical: 'top',
  },
  header: { gap: 8 },
  ratingRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
