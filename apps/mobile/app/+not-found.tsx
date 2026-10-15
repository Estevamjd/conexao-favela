import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAppTheme } from '@/theme/useAppTheme';

export default function NotFoundScreen() {
  const theme = useAppTheme();
  const { t } = useTranslation('common');

  return (
    <>
      <Stack.Screen options={{ title: t('notFoundTitle') }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {t('notFoundTitle')}
        </Text>
        <Link href="/" style={[styles.link, { backgroundColor: theme.colors.primary }]}>
          <Text style={styles.linkText}>{t('backHome')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    borderRadius: 12,
    marginTop: 15,
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  linkText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
