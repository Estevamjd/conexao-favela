import { zodResolver } from '@hookform/resolvers/zod';
import {
  accountRegistrationSchema,
  emailPasswordSignInSchema,
  type AccountRegistrationInput,
  type EmailPasswordSignInInput,
} from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import type { Href } from 'expo-router';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { BadgeCheck, Mail, UserRound } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Platform, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { CheckboxRow } from '@/features/auth/components/CheckboxRow';
import { FormTextField } from '@/features/auth/components/FormTextField';
import { OptionChip } from '@/features/auth/components/OptionChip';
import { useCurrentLanguage } from '@/hooks/useCurrentLanguage';
import {
  registerWithEmail,
  signInWithEmail,
  signInWithGoogleAccount,
  signInWithGoogleCredential,
} from '@/services/auth-service';
import { hasFirebaseConfig } from '@/services/firebase';
import {
  googleOAuthClientIds,
  hasGoogleOAuthClientForPlatform,
} from '@/services/google-auth-config';
import { useAuthStore, type AuthenticatedProfile } from '@/stores/auth-store';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

type AuthMode = 'signIn' | 'signUp';
type AccountRegistrationFormInput = Omit<AccountRegistrationInput, 'acceptedTerms'> & {
  readonly acceptedTerms: boolean;
};

void WebBrowser.maybeCompleteAuthSession();

const guideRegistrationRoute = '/(auth)/guide-registration' as Href;
const accountRegistrationFormSchema = accountRegistrationSchema.extend({
  acceptedTerms: z.boolean().refine((value) => value, {
    message: 'Aceite os termos para continuar.',
  }),
});

function safePostAuthRoute(next: unknown, fallback: Href): Href {
  if (
    typeof next === 'string' &&
    next.startsWith('/') &&
    !next.startsWith('//') &&
    !next.includes('/sign-in')
  ) {
    return next as Href;
  }

  return fallback;
}

export default function SignInScreen() {
  const [mode, setMode] = useState<AuthMode>('signIn');
  const theme = useAppTheme();
  const { t } = useTranslation(['auth', 'common']);

  return (
    <Screen>
      <View style={styles.header}>
        <AppText color={theme.colors.primary} variant="label">
          {t('common:appName')}
        </AppText>
        <AppText variant="title">{t('auth:signInTitle')}</AppText>
      </View>

      <View style={styles.modeRow}>
        <OptionChip
          label={t('auth:signInTab')}
          onPress={() => setMode('signIn')}
          selected={mode === 'signIn'}
        />
        <OptionChip
          label={t('auth:signUpTab')}
          onPress={() => setMode('signUp')}
          selected={mode === 'signUp'}
        />
      </View>

      {mode === 'signIn' ? <SignInForm /> : <SignUpForm />}
    </Screen>
  );
}

function SignInForm() {
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ next?: string }>();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setSessionProfile = useSessionStore((state) => state.setActiveProfile);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { t } = useTranslation('auth');
  const form = useForm<EmailPasswordSignInInput>({
    defaultValues: {
      email: '',
      password: '',
    },
    resolver: zodResolver(emailPasswordSignInSchema),
  });

  const completeSignIn = (profile: AuthenticatedProfile) => {
    setCurrentUser(profile);
    setSessionProfile(profile.type);
    router.replace(
      safePostAuthRoute(params.next, profile.type === 'guide' ? '/(guide)' : '/(tourist)'),
    );
  };

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setFormError(null);

    try {
      const profile = await signInWithEmail(values.email, values.password);
      completeSignIn(profile);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível entrar.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <View style={styles.form}>
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
        name="password"
        render={({ field, fieldState }) => (
          <FormTextField
            autoCapitalize="none"
            autoComplete="password"
            error={fieldState.error?.message}
            label={t('passwordField')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
          />
        )}
      />
      {formError ? (
        <AppText color={theme.colors.error} variant="caption">
          {formError}
        </AppText>
      ) : null}
      <PrimaryButton
        disabled={submitting}
        icon={<Mail color="#ffffff" size={18} />}
        onPress={() => void submit()}
      >
        {t('signInEmail')}
      </PrimaryButton>
      <GoogleSignInButton
        disabled={submitting}
        label={t('signInGoogle')}
        onComplete={completeSignIn}
        onError={(error) =>
          setFormError(error instanceof Error ? error.message : 'Google Sign-In indisponivel.')
        }
        onFinish={() => setSubmitting(false)}
        onStart={() => {
          setSubmitting(true);
          setFormError(null);
        }}
      />
    </View>
  );
}

type GoogleSignInButtonProps = {
  readonly disabled: boolean;
  readonly label: string;
  readonly onComplete: (profile: AuthenticatedProfile) => void;
  readonly onError: (error: unknown) => void;
  readonly onFinish: () => void;
  readonly onStart: () => void;
};

function GoogleSignInButton(props: GoogleSignInButtonProps) {
  const usesNativeFirebaseOAuth = Platform.OS !== 'web' && hasFirebaseConfig();

  if (usesNativeFirebaseOAuth && (Platform.OS === 'android' || Platform.OS === 'ios')) {
    if (!hasGoogleOAuthClientForPlatform(Platform.OS)) {
      return (
        <PrimaryButton
          disabled={props.disabled}
          onPress={() => {
            props.onStart();
            props.onError(
              new Error(
                `Google Sign-In requer EXPO_PUBLIC_GOOGLE_${Platform.OS.toUpperCase()}_CLIENT_ID.`,
              ),
            );
            props.onFinish();
          }}
          variant="ghost"
        >
          {props.label}
        </PrimaryButton>
      );
    }

    return <NativeGoogleSignInButton {...props} />;
  }

  return (
    <PrimaryButton
      disabled={props.disabled}
      onPress={() => {
        props.onStart();
        void signInWithGoogleAccount()
          .then(props.onComplete)
          .catch(props.onError)
          .finally(props.onFinish);
      }}
      variant="ghost"
    >
      {props.label}
    </PrimaryButton>
  );
}

function NativeGoogleSignInButton({
  disabled,
  label,
  onComplete,
  onError,
  onFinish,
  onStart,
}: GoogleSignInButtonProps) {
  const processedResponse = useRef<string | null>(null);
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    androidClientId: googleOAuthClientIds.android,
    iosClientId: googleOAuthClientIds.ios,
    selectAccount: true,
    webClientId: googleOAuthClientIds.web,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      return;
    }

    const idToken = response.params.id_token ?? response.authentication?.idToken;
    const accessToken = response.params.access_token ?? response.authentication?.accessToken;

    if (!idToken || processedResponse.current === idToken) {
      if (!idToken) {
        onError(new Error('Google nao retornou o token necessario para autenticar no Firebase.'));
        onFinish();
      }
      return;
    }

    processedResponse.current = idToken;
    void signInWithGoogleCredential(idToken, accessToken)
      .then(onComplete)
      .catch(onError)
      .finally(onFinish);
  }, [onComplete, onError, onFinish, response]);

  return (
    <PrimaryButton
      disabled={disabled || !request}
      onPress={() => {
        onStart();
        void promptAsync().then(
          (result) => {
            if (result.type === 'cancel' || result.type === 'dismiss') {
              onFinish();
            } else if (result.type === 'error') {
              onError(new Error(result.error?.message ?? 'Falha ao abrir o Google Sign-In.'));
              onFinish();
            }
          },
          (error: unknown) => {
            onError(error);
            onFinish();
          },
        );
      }}
      variant="ghost"
    >
      {label}
    </PrimaryButton>
  );
}

function SignUpForm() {
  const language = useCurrentLanguage();
  const theme = useAppTheme();
  const params = useLocalSearchParams<{ next?: string }>();
  const setCurrentUser = useAuthStore((state) => state.setCurrentUser);
  const setSessionProfile = useSessionStore((state) => state.setActiveProfile);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { t } = useTranslation('auth');
  const form = useForm<AccountRegistrationFormInput>({
    defaultValues: {
      acceptedTerms: false,
      country: 'BR',
      displayName: '',
      email: '',
      password: '',
      preferredLanguage: language,
      type: 'tourist',
    },
    resolver: zodResolver(accountRegistrationFormSchema),
  });

  const selectedType = form.watch('type');
  const acceptedTerms = form.watch('acceptedTerms');

  const submit = form.handleSubmit(async (values) => {
    setSubmitting(true);
    setFormError(null);

    try {
      const parsed = accountRegistrationSchema.parse(values);
      const profile = await registerWithEmail(parsed);
      setCurrentUser(profile);
      setSessionProfile(profile.type);
      router.replace(
        safePostAuthRoute(
          params.next,
          profile.type === 'guide' ? guideRegistrationRoute : '/(tourist)',
        ),
      );
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <View style={styles.form}>
      <Controller
        control={form.control}
        name="displayName"
        render={({ field, fieldState }) => (
          <FormTextField
            autoComplete="name"
            error={fieldState.error?.message}
            label={t('nameField')}
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
        name="password"
        render={({ field, fieldState }) => (
          <FormTextField
            autoCapitalize="none"
            autoComplete="password"
            error={fieldState.error?.message}
            label={t('passwordField')}
            onBlur={field.onBlur}
            onChangeText={field.onChange}
            secureTextEntry
            value={field.value}
          />
        )}
      />
      <InfoCard title={t('accountTypeTitle')}>
        <View style={styles.modeRow}>
          <OptionChip
            label={t('tourist')}
            onPress={() => form.setValue('type', 'tourist', { shouldValidate: true })}
            selected={selectedType === 'tourist'}
          />
          <OptionChip
            label={t('guide')}
            onPress={() => form.setValue('type', 'guide', { shouldValidate: true })}
            selected={selectedType === 'guide'}
          />
        </View>
      </InfoCard>
      <CheckboxRow
        checked={acceptedTerms}
        label={
          <AppText color={theme.colors.textSecondary} variant="body">
            {t('acceptTerms')}
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
          {t('acceptTermsError')}
        </AppText>
      ) : null}
      {formError ? (
        <AppText color={theme.colors.error} variant="caption">
          {formError}
        </AppText>
      ) : null}
      <PrimaryButton
        disabled={submitting}
        icon={
          selectedType === 'guide' ? (
            <BadgeCheck color="#ffffff" size={18} />
          ) : (
            <UserRound color="#ffffff" size={18} />
          )
        }
        onPress={() => void submit()}
      >
        {t('createAccount')}
      </PrimaryButton>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
  },
  header: {
    gap: 6,
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
});
