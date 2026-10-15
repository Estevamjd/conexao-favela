import { Check } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

type CheckboxRowProps = {
  readonly checked: boolean;
  readonly label: ReactNode;
  readonly onToggle: () => void;
};

export function CheckboxRow({ checked, label, onToggle }: CheckboxRowProps) {
  const theme = useAppTheme();

  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={onToggle}>
      <View style={styles.row}>
        <View
          style={[
            styles.box,
            {
              backgroundColor: checked ? theme.colors.primary : theme.colors.surface,
              borderColor: checked ? theme.colors.primary : theme.colors.border,
            },
          ]}
        >
          {checked ? <Check color={theme.colors.background} size={16} /> : null}
        </View>
        {typeof label === 'string' ? <AppText variant="body">{label}</AppText> : label}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: 'center',
    borderRadius: 7,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
});
