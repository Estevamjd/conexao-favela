import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

type PrimaryButtonProps = {
  readonly children: ReactNode;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly onPress: () => void;
  readonly style?: ViewStyle;
  readonly variant?: 'primary' | 'secondary' | 'ghost';
};

export function PrimaryButton({
  children,
  disabled = false,
  icon,
  onPress,
  style,
  variant = 'primary',
}: PrimaryButtonProps) {
  const theme = useAppTheme();
  const backgroundColor =
    variant === 'primary'
      ? theme.colors.primaryDark
      : variant === 'secondary'
        ? theme.colors.secondary
        : 'transparent';
  const textColor =
    variant === 'ghost'
      ? theme.colors.primary
      : variant === 'secondary'
        ? theme.colors.background
        : '#ffffff';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: variant === 'ghost' ? theme.colors.border : 'transparent',
          opacity: disabled ? 0.48 : pressed ? 0.82 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.inner}>
        {icon}
        <AppText color={textColor} style={styles.label} variant="label">
          {children}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 18,
  },
  inner: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  label: {
    textAlign: 'center',
  },
});
