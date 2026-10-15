import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

type InfoCardProps = {
  readonly children?: ReactNode;
  readonly description?: string;
  readonly title: string;
};

export function InfoCard({ children, description, title }: InfoCardProps) {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <AppText variant="subtitle">{title}</AppText>
      {description ? (
        <AppText color={theme.colors.textSecondary} variant="body">
          {description}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
});
