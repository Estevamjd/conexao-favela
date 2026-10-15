import type { ReactNode } from 'react';
import { Text as NativeText, StyleSheet, type TextStyle } from 'react-native';
import { useAppTheme } from '@/theme/useAppTheme';

type AppTextProps = {
  readonly children: ReactNode;
  readonly color?: string;
  readonly style?: TextStyle;
  readonly variant?: 'hero' | 'title' | 'subtitle' | 'body' | 'caption' | 'label';
};

export function AppText({ children, variant = 'body', color, style }: AppTextProps) {
  const theme = useAppTheme();
  const variantStyle = styles[variant];

  return (
    <NativeText
      style={[
        variantStyle,
        {
          color: color ?? theme.colors.textPrimary,
          fontFamily:
            variant === 'hero' || variant === 'title'
              ? theme.fonts.headingBold
              : theme.fonts.bodyRegular,
        },
        style,
      ]}
    >
      {children}
    </NativeText>
  );
}

const styles = StyleSheet.create({
  hero: {
    fontSize: 36,
    letterSpacing: 0,
    lineHeight: 42,
  },
  title: {
    fontSize: 24,
    letterSpacing: 0,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 18,
    letterSpacing: 0,
    lineHeight: 25,
  },
  body: {
    fontSize: 15,
    letterSpacing: 0,
    lineHeight: 22,
  },
  caption: {
    fontSize: 12,
    letterSpacing: 0,
    lineHeight: 17,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 18,
  },
});
