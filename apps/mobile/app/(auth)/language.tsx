import { SUPPORTED_LANGUAGES, type SupportedLanguageCode } from '@conexao-favela/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/Text';
import { useSessionStore } from '@/stores/session-store';
import { useAppTheme } from '@/theme/useAppTheme';

export default function LanguageScreen() {
  const theme = useAppTheme();
  const { i18n, t } = useTranslation('auth');
  const params = useLocalSearchParams<{ next?: string }>();
  const setPreferredLanguage = useSessionStore((state) => state.setPreferredLanguage);
  const nextRoute = params.next === 'tourist' ? '/(tourist)' : null;

  const selectLanguage = (language: SupportedLanguageCode) => {
    setPreferredLanguage(language);
    void i18n.changeLanguage(language);

    if (nextRoute) {
      router.replace(nextRoute);
      return;
    }

    router.back();
  };

  return (
    <Screen>
      <AppText variant="title">{t('chooseLanguage')}</AppText>
      <View style={styles.grid}>
        {SUPPORTED_LANGUAGES.map((language) => (
          <Pressable
            accessibilityRole="button"
            key={language.code}
            onPress={() => selectLanguage(language.code)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <AppText variant="title">{language.flag}</AppText>
            <AppText variant="label">{language.nativeName}</AppText>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  option: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    minHeight: 112,
    padding: 14,
    width: '47%',
  },
});
