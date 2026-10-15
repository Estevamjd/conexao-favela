import { FlatList, Pressable, StyleSheet } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

export type FilterChipOption<TValue extends string> = {
  readonly id: TValue;
  readonly label: string;
};

type FilterChipRowProps<TValue extends string> = {
  readonly onSelect: (id: TValue) => void;
  readonly options: readonly FilterChipOption<TValue>[];
  readonly selectedId: TValue;
};

export function FilterChipRow<TValue extends string>({
  onSelect,
  options,
  selectedId,
}: FilterChipRowProps<TValue>) {
  const theme = useAppTheme();

  return (
    <FlatList
      horizontal
      contentContainerStyle={styles.list}
      data={options}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => {
        const selected = selectedId === item.id;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onSelect(item.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? theme.colors.primaryDark : theme.colors.surface,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
                opacity: pressed ? 0.78 : 1,
              },
            ]}
          >
            <AppText color={selected ? '#ffffff' : theme.colors.textPrimary} variant="label">
              {item.label}
            </AppText>
          </Pressable>
        );
      }}
      showsHorizontalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  list: {
    gap: 10,
    paddingRight: 20,
  },
});
