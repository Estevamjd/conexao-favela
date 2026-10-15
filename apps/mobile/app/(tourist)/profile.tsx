import {
  SUPPORTED_CURRENCIES,
  SUPPORTED_LANGUAGES,
  profileUpdateSchema,
  type CurrencyCode,
  type ProfileUpdateInput,
  type SupportedLanguageCode,
} from '@conexao-favela/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import type { Href } from 'expo-router';
import {
  BadgeCheck,
  BellRing,
  Languages,
  LogOut,
  ShieldAlert,
  Trash2,
  UserRound,
  WalletCards,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { RequireAuth } from '@/components/RequireAuth';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { FormTextField } from '@/features/auth/components/FormTextField';
import { OptionChip } from '@/features/auth/components/OptionChip';
import { requestAccountErasure, signOut, updateCurrentUserProfile } from '@/services/auth-service';
import { hasFirebaseConfig } from '@/services/firebase';
import { useAuthStore } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

const guideRegistrationRoute = '/(auth)/guide-registration' as Href;
const paymentHistoryRoute = '/(tourist)/payments' as Href;

export default function TouristProfileScreen() {
  return (
    <RequireAuth>
      <TouristProfileContent />
    </RequireAuth>
  );
}

function TouristProfileContent() {
  const theme = useAppTheme();
  const { i18n, t } = useTranslation(['common', 'auth']);
  const currentUser = useAuthStore((state) => state.currentUser);
  const clearCurrentUser = useAuthStore((state) => state.clearCurrentUser);
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const [isErasingAccount, setIsErasingAccount] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const sessionNotificationsEnabled = useSessionStore((state) => state.notificationsEnabled);
  const sessionPreferredCurrency = useSessionStore((state) => state.preferredCurrency);
  const sessionPreferredLanguage = useSessionStore((state) => state.preferredLanguage);
  const setActiveProfile = useSessionStore((state) => state.setActiveProfile);
  const setNotificationsEnabled = useSessionStore((state) => state.setNotificationsEnabled);
  const setPreferredCurrency = useSessionStore((state) => state.setPreferredCurrency);
  const setPreferredLanguage = useSessionStore((state) => state.setPreferredLanguage);
  const form = useForm<ProfileUpdateInput>({
    defaultValues: {
      displayName: currentUser?.displayName ?? '',
      notificationsEnabled: currentUser?.notificationsEnabled ?? sessionNotificationsEnabled,
      preferredCurrency: currentUser?.preferredCurrency ?? sessionPreferredCurrency,
      preferredLanguage: currentUser?.preferredLanguage ?? sessionPreferredLanguage,
    },
    resolver: zodResolver(profileUpdateSchema),
  });
  const watchedNotificationsEnabled = form.watch('notificationsEnabled');
  const watchedPreferredCurrency = form.watch('preferredCurrency');
  const watchedPreferredLanguage = form.watch('preferredLanguage');

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    form.reset({
      displayName: currentUser.displayName,
      notificationsEnabled: currentUser.notificationsEnabled,
      preferredCurrency: currentUser.preferredCurrency,
      preferredLanguage: currentUser.preferredLanguage,
    });
  }, [currentUser, form]);

  function handleLanguageChange(language: SupportedLanguageCode) {
    form.setValue('preferredLanguage', language, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  function handleCurrencyChange(currency: CurrencyCode) {
    form.setValue('preferredCurrency', currency, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }

  async function saveProfile(input: ProfileUpdateInput) {
    if (!currentUser) {
      return;
    }

    setIsSavingProfile(true);

    try {
      const profile = await updateCurrentUserProfile(currentUser, input);

      setCurrentUser(profile);
      setPreferredLanguage(profile.preferredLanguage);
      setPreferredCurrency(profile.preferredCurrency);
      setNotificationsEnabled(profile.notificationsEnabled);
      await i18n.changeLanguage(profile.preferredLanguage);
      form.reset({
        displayName: profile.displayName,
        notificationsEnabled: profile.notificationsEnabled,
        preferredCurrency: profile.preferredCurrency,
        preferredLanguage: profile.preferredLanguage,
      });
      Alert.alert(t('common:profileSavedTitle'), t('common:profileSavedBody'));
    } catch (error: unknown) {
      Alert.alert(
        t('common:profileSaveErrorTitle'),
        error instanceof Error ? error.message : t('common:profileSaveErrorBody'),
      );
    } finally {
      setIsSavingProfile(false);
    }
  }

  async function eraseCurrentAccount() {
    setIsErasingAccount(true);

    try {
      await requestAccountErasure();
      clearCurrentUser();
      Alert.alert(t('common:accountDeletionDoneTitle'), t('common:accountDeletionDoneBody'));
      router.replace('/(tourist)');
    } catch (error: unknown) {
      Alert.alert(
        t('common:accountDeletionErrorTitle'),
        error instanceof Error ? error.message : t('common:accountDeletionErrorBody'),
      );
    } finally {
      setIsErasingAccount(false);
    }
  }

  function handleAccountErasurePress() {
    Alert.alert(t('common:accountDeletionTitle'), t('common:accountDeletionConfirmBody'), [
      {
        style: 'cancel',
        text: t('common:cancelCta'),
      },
      {
        onPress: () => {
          void eraseCurrentAccount();
        },
        style: 'destructive',
        text: t('common:accountDeletionConfirmCta'),
      },
    ]);
  }

  if (!currentUser) {
    return (
      <Screen>
        <AppText variant="title">{t('common:profile')}</AppText>
        <InfoCard description={t('common:profileSyncBody')} title={t('common:touristAccountTitle')}>
          <UserRound color={theme.colors.primary} size={28} />
        </InfoCard>
        <PrimaryButton
          icon={<UserRound color="#ffffff" size={18} />}
          onPress={() => router.push('/(auth)/sign-in')}
        >
          {t('common:signInCta')}
        </PrimaryButton>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppText variant="title">{t('common:profile')}</AppText>
      <InfoCard description={currentUser.email} title={currentUser.displayName}>
        <UserRound color={theme.colors.primary} size={28} />
      </InfoCard>
      {!hasFirebaseConfig() ? (
        <InfoCard description={t('common:demoModeBody')} title={t('common:demoModeTitle')} />
      ) : null}

      <InfoCard description={t('common:preferencesBody')} title={t('common:preferencesTitle')}>
        <Controller
          control={form.control}
          name="displayName"
          render={({ field, fieldState }) => (
            <FormTextField
              autoComplete="name"
              label={t('common:displayNameField')}
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              placeholder={t('common:displayNamePlaceholder')}
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />

        <View style={styles.preferenceBlock}>
          <View style={styles.preferenceHeader}>
            <Languages color={theme.colors.primary} size={20} />
            <AppText variant="label">{t('common:languageTitle')}</AppText>
          </View>
          <View style={styles.chipGroup}>
            {SUPPORTED_LANGUAGES.map((language) => (
              <OptionChip
                key={language.code}
                label={`${language.flag} ${language.nativeName}`}
                onPress={() => handleLanguageChange(language.code)}
                selected={watchedPreferredLanguage === language.code}
              />
            ))}
          </View>
        </View>

        <View style={styles.preferenceBlock}>
          <View style={styles.preferenceHeader}>
            <WalletCards color={theme.colors.primary} size={20} />
            <AppText variant="label">{t('common:currencyTitle')}</AppText>
          </View>
          <View style={styles.chipGroup}>
            {SUPPORTED_CURRENCIES.map((currency) => (
              <OptionChip
                key={currency.code}
                label={currency.label}
                onPress={() => handleCurrencyChange(currency.code)}
                selected={watchedPreferredCurrency === currency.code}
              />
            ))}
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.preferenceHeader}>
            <BellRing color={theme.colors.primary} size={20} />
            <View style={styles.toggleText}>
              <AppText variant="label">{t('common:notificationsTitle')}</AppText>
              <AppText color={theme.colors.textSecondary} variant="caption">
                {watchedNotificationsEnabled
                  ? t('common:notificationsEnabled')
                  : t('common:notificationsDisabled')}
              </AppText>
            </View>
          </View>
          <Switch
            accessibilityLabel={t('common:notificationsTitle')}
            onValueChange={(enabled) =>
              form.setValue('notificationsEnabled', enabled, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            thumbColor="#ffffff"
            trackColor={{
              false: theme.colors.border,
              true: theme.colors.primary,
            }}
            value={watchedNotificationsEnabled}
          />
        </View>
        <PrimaryButton
          disabled={isSavingProfile}
          icon={<BadgeCheck color="#ffffff" size={18} />}
          onPress={form.handleSubmit((input) => {
            void saveProfile(input);
          })}
        >
          {isSavingProfile ? t('common:profileSavingCta') : t('common:profileSaveCta')}
        </PrimaryButton>
      </InfoCard>

      <PrimaryButton
        icon={<BadgeCheck color="#ffffff" size={18} />}
        onPress={() => {
          setActiveProfile('guide');
          router.push(currentUser.type === 'guide' ? '/(guide)' : guideRegistrationRoute);
        }}
      >
        {t('common:switchToGuideCta')}
      </PrimaryButton>
      <PrimaryButton
        icon={<WalletCards color={theme.colors.primary} size={18} />}
        onPress={() => router.push(paymentHistoryRoute)}
        variant="ghost"
      >
        {t('common:paymentHistoryCta')}
      </PrimaryButton>
      <InfoCard
        description={t('common:accountDeletionBody')}
        title={t('common:accountDeletionTitle')}
      >
        <ShieldAlert color={theme.colors.warning} size={28} />
      </InfoCard>
      <PrimaryButton
        disabled={isErasingAccount}
        icon={<Trash2 color={theme.colors.primary} size={18} />}
        onPress={handleAccountErasurePress}
        variant="ghost"
      >
        {isErasingAccount ? t('common:accountDeletionProgress') : t('common:accountDeletionCta')}
      </PrimaryButton>
      <PrimaryButton
        icon={<LogOut color={theme.colors.primary} size={18} />}
        onPress={() => {
          void signOut().then(() => clearCurrentUser());
        }}
        variant="ghost"
      >
        {t('common:logoutCta')}
      </PrimaryButton>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  preferenceBlock: {
    gap: 12,
  },
  preferenceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  toggleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 14,
    justifyContent: 'space-between',
  },
  toggleText: {
    flexShrink: 1,
    gap: 4,
  },
});
