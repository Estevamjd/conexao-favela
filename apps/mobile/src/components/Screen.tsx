import type { ReactNode } from 'react';
import { Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/theme/useAppTheme';

type ScreenProps = {
  readonly children: ReactNode;
  readonly scroll?: boolean;
  readonly contentStyle?: ViewStyle;
};

const webContentFrame = Platform.select<ViewStyle>({
  default: {},
  web: {
    alignSelf: 'center',
    maxWidth: 760,
    width: '100%',
  },
});

export function Screen({ children, scroll = true, contentStyle }: ScreenProps) {
  const theme = useAppTheme();

  if (!scroll) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.content, webContentFrame, contentStyle]}>{children}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={[styles.content, webContentFrame, contentStyle]}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: 20,
    padding: 20,
    paddingBottom: 96,
  },
});
