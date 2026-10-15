import { zodResolver } from '@hookform/resolvers/zod';
import {
  INITIAL_COMMUNITY,
  INITIAL_POIS,
  buildTourFromDraft,
  resolveLocalizedText,
  SUPPORTED_LANGUAGES,
  tourDraftSchema,
  type SupportedLanguageCode,
  type TourCategory,
  type TourDifficulty,
  type TourDraftInput,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Save } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { FormTextField } from '@/features/auth/components/FormTextField';
import { OptionChip } from '@/features/auth/components/OptionChip';
import { resolveActiveGuideId } from '@/features/guide/guide-session';
import { formatTourCategory, formatTourDifficulty } from '@/features/tours/tour-formatters';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import { useAuthStore } from '@/stores/auth-store';
import {
  canUseRemoteTourService,
  createRemoteTour,
  updateRemoteTour,
} from '@/services/tour-service';
import { useCommunityTours } from '@/hooks/useCommunityTours';
import { useSessionStore } from '@/stores/session-store';
import { useTourStore } from '@/stores/tour-store';
import { useAppTheme } from '@/theme/useAppTheme';

const categories: readonly TourCategory[] = [
  'cultural',
  'historico',
  'natureza',
  'arte',
  'gastronomico',
  'fotografico',
];

const difficulties: readonly TourDifficulty[] = ['easy', 'moderate', 'hard'];

function toggleValue<TValue extends string>(
  currentValues: readonly TValue[],
  value: TValue,
): TValue[] {
  return currentValues.includes(value)
    ? currentValues.filter((item) => item !== value)
    : [...currentValues, value];
}

export default function NewGuideTourScreen() {
  return (
    <RequireAuth role="guide">
      <NewGuideTourContent />
    </RequireAuth>
  );
}

function NewGuideTourContent() {
  const theme = useAppTheme();
  const language = useCurrentLanguage();
  const { t } = useTranslation('guide');
  const currentUser = useAuthStore((state) => state.currentUser);
  const currentCommunityId = useSessionStore((state) => state.currentCommunityId);
  const params = useLocalSearchParams<{ tourId?: string }>();
  const editingTourId = typeof params.tourId === 'string' ? params.tourId : undefined;
  const { tours } = useCommunityTours(currentCommunityId);
  const editingTour = tours.find((tour) => tour.id === editingTourId);
  const createLocalDraft = useTourStore((state) => state.createLocalDraft);
  const upsertLocalDraft = useTourStore((state) => state.upsertLocalDraft);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canPublishRemote =
    canUseRemoteTourService() && currentUser?.type === 'guide' && currentUser.guideVerified;
  const form = useForm<TourDraftInput>({
    defaultValues: {
      category: editingTour?.category ?? 'cultural',
      communityId: currentCommunityId,
      description: editingTour?.description ?? { pt: '' },
      difficulty: editingTour?.difficulty ?? 'easy',
      guideId: resolveActiveGuideId(currentUser),
      languages: [...(editingTour?.languages ?? ['pt'])],
      maxPrice: editingTour?.pricing.maxPrice ?? 0,
      maxTourists: editingTour?.capacity.maxTourists ?? 8,
      minPrice: editingTour?.pricing.minPrice ?? 0,
      poiIds: editingTour?.route.points.map((point) => point.poiId) ?? [INITIAL_POIS[0]?.id ?? ''],
      subAreaIds: [...(editingTour?.subAreaIds ?? [INITIAL_COMMUNITY.subAreas[0]?.id ?? ''])],
      title: editingTour?.title ?? { pt: '' },
    },
    resolver: zodResolver(tourDraftSchema),
  });
  const selectedSubAreaIds = form.watch('subAreaIds');
  const selectedPoiIds = form.watch('poiIds');
  const selectedLanguages = form.watch('languages');
  const selectedCategory = form.watch('category');
  const selectedDifficulty = form.watch('difficulty');
  const availablePois = useMemo(
    () => INITIAL_POIS.filter((poi) => selectedSubAreaIds.includes(poi.subAreaId)),
    [selectedSubAreaIds],
  );

  const toggleSubArea = (subAreaId: string) => {
    const nextSubAreas = toggleValue(selectedSubAreaIds, subAreaId);
    const nextPoiIds = selectedPoiIds.filter((poiId) => {
      const poi = INITIAL_POIS.find((item) => item.id === poiId);
      return poi ? nextSubAreas.includes(poi.subAreaId) : false;
    });

    form.setValue('subAreaIds', nextSubAreas, { shouldDirty: true, shouldValidate: true });
    form.setValue('poiIds', nextPoiIds, { shouldDirty: true, shouldValidate: true });
  };

  const togglePoi = (poiId: string) => {
    form.setValue('poiIds', toggleValue(selectedPoiIds, poiId), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleLanguage = (selectedLanguage: SupportedLanguageCode) => {
    form.setValue('languages', toggleValue(selectedLanguages, selectedLanguage), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const submit = form.handleSubmit(async (values) => {
    const parsed = tourDraftSchema.parse(values);

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      if (canPublishRemote) {
        const tour =
          editingTour && !editingTour.id.startsWith('local-')
            ? await updateRemoteTour(editingTour.id, parsed)
            : await createRemoteTour(parsed);
        upsertLocalDraft(tour);
      } else if (editingTour) {
        upsertLocalDraft(
          buildTourFromDraft(parsed, { id: editingTour.id, status: editingTour.status }),
        );
      } else {
        createLocalDraft(parsed);
      }

      router.replace('/(guide)');
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : t('remoteCreateError'));
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {canPublishRemote ? t('publishLabel') : t('privateDraftLabel')}
        </AppText>
        <AppText variant="title">{editingTour ? t('editTourTitle') : t('createTourTitle')}</AppText>
        <AppText color={theme.colors.textSecondary} variant="body">
          {canPublishRemote ? t('publishTourDescription') : t('createTourDescription')}
        </AppText>
      </View>

      <Controller
        control={form.control}
        name="title.pt"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            label={t('titlePt')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />

      <Controller
        control={form.control}
        name="description.pt"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            label={t('descriptionPt')}
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />

      <View style={styles.inlineFields}>
        <Controller
          control={form.control}
          name="minPrice"
          render={({ field, fieldState }) => (
            <FormTextField
              error={fieldState.error?.message}
              keyboardType="number-pad"
              label={t('minPrice')}
              onBlur={field.onBlur}
              onChangeText={(value) => field.onChange(Number.parseInt(value, 10) || 0)}
              value={field.value.toString()}
            />
          )}
        />
        <Controller
          control={form.control}
          name="maxPrice"
          render={({ field, fieldState }) => (
            <FormTextField
              error={fieldState.error?.message}
              keyboardType="number-pad"
              label={t('maxPrice')}
              onBlur={field.onBlur}
              onChangeText={(value) => field.onChange(Number.parseInt(value, 10) || 0)}
              value={field.value.toString()}
            />
          )}
        />
      </View>

      <Controller
        control={form.control}
        name="maxTourists"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            keyboardType="number-pad"
            label={t('maxCapacity')}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(Number.parseInt(value, 10) || 1)}
            value={field.value.toString()}
          />
        )}
      />

      <InfoCard title={t('routeSubAreas')}>
        <View style={styles.chipRow}>
          {INITIAL_COMMUNITY.subAreas.map((subArea) => (
            <OptionChip
              key={subArea.id}
              label={subArea.name}
              onPress={() => toggleSubArea(subArea.id)}
              selected={selectedSubAreaIds.includes(subArea.id)}
            />
          ))}
        </View>
        {form.formState.errors.subAreaIds?.message ? (
          <AppText color={theme.colors.error} variant="caption">
            {form.formState.errors.subAreaIds.message}
          </AppText>
        ) : null}
      </InfoCard>

      <InfoCard title={t('routePois')}>
        <View style={styles.chipRow}>
          {availablePois.map((poi) => (
            <OptionChip
              key={poi.id}
              label={resolveLocalizedText(poi.name, language)}
              onPress={() => togglePoi(poi.id)}
              selected={selectedPoiIds.includes(poi.id)}
            />
          ))}
        </View>
        {form.formState.errors.poiIds?.message ? (
          <AppText color={theme.colors.error} variant="caption">
            {form.formState.errors.poiIds.message}
          </AppText>
        ) : null}
      </InfoCard>

      <InfoCard title={t('languages')}>
        <View style={styles.chipRow}>
          {SUPPORTED_LANGUAGES.map((supportedLanguage) => (
            <OptionChip
              key={supportedLanguage.code}
              label={`${supportedLanguage.flag} ${supportedLanguage.nativeName}`}
              onPress={() => toggleLanguage(supportedLanguage.code)}
              selected={selectedLanguages.includes(supportedLanguage.code)}
            />
          ))}
        </View>
      </InfoCard>

      <InfoCard title={t('category')}>
        <View style={styles.chipRow}>
          {categories.map((category) => (
            <OptionChip
              key={category}
              label={formatTourCategory(category, language)}
              onPress={() => form.setValue('category', category, { shouldValidate: true })}
              selected={selectedCategory === category}
            />
          ))}
        </View>
      </InfoCard>

      <InfoCard title={t('difficulty')}>
        <View style={styles.chipRow}>
          {difficulties.map((difficulty) => (
            <OptionChip
              key={difficulty}
              label={formatTourDifficulty(difficulty, language)}
              onPress={() => form.setValue('difficulty', difficulty, { shouldValidate: true })}
              selected={selectedDifficulty === difficulty}
            />
          ))}
        </View>
      </InfoCard>

      {submitError ? (
        <AppText color={theme.colors.error} variant="caption">
          {submitError}
        </AppText>
      ) : null}

      <PrimaryButton
        disabled={isSubmitting}
        icon={<Save color="#ffffff" size={18} />}
        onPress={() => void submit()}
      >
        {isSubmitting ? t('savingTour') : canPublishRemote ? t('publishTour') : t('saveDraft')}
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  header: {
    gap: 8,
  },
  inlineFields: {
    gap: 14,
  },
});
