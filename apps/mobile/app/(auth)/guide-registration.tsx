import { zodResolver } from '@hookform/resolvers/zod';
import {
  guideRegistrationSchema,
  INITIAL_COMMUNITY,
  INITIAL_COMMUNITY_ID,
  SUPPORTED_LANGUAGES,
  type GuideRegistrationInput,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { FileCheck2, Upload } from 'lucide-react-native';
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
import { CheckboxRow } from '@/features/auth/components/CheckboxRow';
import { FormTextField } from '@/features/auth/components/FormTextField';
import { OptionChip } from '@/features/auth/components/OptionChip';
import { submitGuideRegistration, uploadGuideDocuments } from '@/services/auth-service';
import { useAuthStore } from '@/stores/auth-store';
import { useAppTheme } from '@/theme/useAppTheme';

type GuideRegistrationFormInput = Omit<GuideRegistrationInput, 'acceptedTerms' | 'documentUrls'> & {
  readonly acceptedTerms: boolean;
};

const guideRegistrationFormSchema = guideRegistrationSchema
  .omit({
    documentUrls: true,
  })
  .extend({
    acceptedTerms: z.boolean().refine((value) => value, {
      message: 'Confirme a verificação manual para continuar.',
    }),
  });

export default function GuideRegistrationScreen() {
  return (
    <RequireAuth>
      <GuideRegistrationContent />
    </RequireAuth>
  );
}

function GuideRegistrationContent() {
  const currentUser = useAuthStore((state) => state.currentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const theme = useAppTheme();
  const { t } = useTranslation('auth');
  const [documents, setDocuments] = useState<readonly DocumentPicker.DocumentPickerAsset[]>([]);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const form = useForm<GuideRegistrationFormInput>({
    defaultValues: {
      acceptedTerms: false,
      bio: { pt: '' },
      communityId: INITIAL_COMMUNITY_ID,
      displayName: currentUser?.displayName ?? '',
      email: currentUser?.email ?? '',
      languagesSpoken: ['pt'],
      subAreaIds: [INITIAL_COMMUNITY.subAreas[0]?.id ?? ''],
      yearsOfExperience: 0,
    },
    resolver: zodResolver(guideRegistrationFormSchema),
  });

  const selectedSubAreas = form.watch('subAreaIds');
  const selectedLanguages = form.watch('languagesSpoken');
  const acceptedTerms = form.watch('acceptedTerms');

  const toggleSubArea = (subAreaId: string) => {
    const next = selectedSubAreas.includes(subAreaId)
      ? selectedSubAreas.filter((id) => id !== subAreaId)
      : [...selectedSubAreas, subAreaId];

    form.setValue('subAreaIds', next, { shouldDirty: true, shouldValidate: true });
  };

  const toggleLanguage = (language: SupportedLanguageCode) => {
    const next = selectedLanguages.includes(language)
      ? selectedLanguages.filter((code) => code !== language)
      : [...selectedLanguages, language];

    form.setValue('languagesSpoken', next, { shouldDirty: true, shouldValidate: true });
  };

  const pickDocuments = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: true,
      type: ['image/*', 'application/pdf'],
    });

    if (!result.canceled) {
      setDocuments(result.assets);
      setDocumentError(null);
    }
  };

  const submit = form.handleSubmit(async (values) => {
    if (!currentUser) {
      setFormError(t('guideRegistration.accountFirstError'));
      return;
    }

    if (documents.length === 0) {
      setDocumentError(t('guideRegistration.documentRequiredError'));
      return;
    }

    setSubmitting(true);
    setFormError(null);

    try {
      const uploaded = await uploadGuideDocuments(currentUser.uid, documents);
      const parsed = guideRegistrationSchema.parse({
        ...values,
        documentUrls: uploaded.map((document) => document.storagePath),
      });
      const profile = await submitGuideRegistration(currentUser.uid, parsed);

      setCurrentUser(profile);
      router.replace('/(guide)');
    } catch (error) {
      setFormError(error instanceof Error ? error.message : t('guideRegistration.submitError'));
    } finally {
      setSubmitting(false);
    }
  });

  if (!currentUser) {
    return (
      <Screen>
        <AppText variant="title">{t('guideRegistration.title')}</AppText>
        <InfoCard
          description={t('guideRegistration.accountRequiredBody')}
          title={t('guideRegistration.accountRequiredTitle')}
        />
        <PrimaryButton onPress={() => router.replace('/(auth)/sign-in')}>
          {t('guideRegistration.signIn')}
        </PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {t('guideRegistration.manualReview')}
        </AppText>
        <AppText variant="title">{t('guideRegistration.title')}</AppText>
      </View>

      <Controller
        control={form.control}
        name="displayName"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            label={t('guideRegistration.publicName')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="email"
        render={({ field, fieldState }) => (
          <FormTextField
            autoCapitalize="none"
            autoComplete="email"
            error={fieldState.error?.message}
            keyboardType="email-address"
            label={t('emailField')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="bio.pt"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            label={t('guideRegistration.bioPortuguese')}
            multiline
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            value={field.value}
          />
        )}
      />
      <Controller
        control={form.control}
        name="yearsOfExperience"
        render={({ field, fieldState }) => (
          <FormTextField
            error={fieldState.error?.message}
            keyboardType="number-pad"
            label={t('guideRegistration.yearsExperience')}
            onBlur={field.onBlur}
            onChangeText={(value) => field.onChange(Number.parseInt(value, 10) || 0)}
            value={field.value.toString()}
          />
        )}
      />

      <InfoCard title={t('guideRegistration.subAreas')}>
        <View style={styles.chipRow}>
          {INITIAL_COMMUNITY.subAreas.map((subArea) => (
            <OptionChip
              key={subArea.id}
              label={subArea.name}
              onPress={() => toggleSubArea(subArea.id)}
              selected={selectedSubAreas.includes(subArea.id)}
            />
          ))}
        </View>
      </InfoCard>

      <InfoCard title={t('guideRegistration.languages')}>
        <View style={styles.chipRow}>
          {SUPPORTED_LANGUAGES.map((language) => (
            <OptionChip
              key={language.code}
              label={`${language.flag} ${language.nativeName}`}
              onPress={() => toggleLanguage(language.code)}
              selected={selectedLanguages.includes(language.code)}
            />
          ))}
        </View>
      </InfoCard>

      <InfoCard
        description={t('guideRegistration.selectedFiles', { count: documents.length })}
        title={t('guideRegistration.documents')}
      >
        <PrimaryButton
          icon={<Upload color="#ffffff" size={18} />}
          onPress={() => void pickDocuments()}
        >
          {t('guideRegistration.uploadDocuments')}
        </PrimaryButton>
        {documents.map((document) => (
          <View key={`${document.uri}-${document.name}`} style={styles.documentRow}>
            <FileCheck2 color={theme.colors.success} size={18} />
            <AppText variant="caption">{document.name}</AppText>
          </View>
        ))}
        {documentError ? (
          <AppText color={theme.colors.error} variant="caption">
            {documentError}
          </AppText>
        ) : null}
      </InfoCard>

      <CheckboxRow
        checked={acceptedTerms}
        label={
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('guideRegistration.residencyConfirmation')}
          </AppText>
        }
        onToggle={() =>
          form.setValue('acceptedTerms', !acceptedTerms, {
            shouldDirty: true,
            shouldValidate: true,
          })
        }
      />
      {form.formState.errors.acceptedTerms ? (
        <AppText color={theme.colors.error} variant="caption">
          {t('guideRegistration.confirmationError')}
        </AppText>
      ) : null}
      {formError ? (
        <AppText color={theme.colors.error} variant="caption">
          {formError}
        </AppText>
      ) : null}

      <PrimaryButton disabled={submitting} onPress={() => void submit()}>
        {t('guideRegistration.submit')}
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
  documentRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  header: {
    gap: 6,
  },
});
