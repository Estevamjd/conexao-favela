import type { ReactNode } from 'react';
import { StyleSheet, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

type FormTextFieldProps = {
  readonly autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  readonly autoComplete?: 'email' | 'name' | 'password' | 'off';
  readonly error?: string;
  readonly keyboardType?: KeyboardTypeOptions;
  readonly label: string;
  readonly multiline?: boolean;
  readonly onBlur?: () => void;
  readonly onChangeText: (value: string) => void;
  readonly placeholder?: string;
  readonly rightSlot?: ReactNode;
  readonly secureTextEntry?: boolean;
  readonly value: string;
};

export function FormTextField({
  autoCapitalize = 'sentences',
  autoComplete,
  error,
  keyboardType,
  label,
  multiline = false,
  onBlur,
  onChangeText,
  placeholder,
  rightSlot,
  secureTextEntry = false,
  value,
}: FormTextFieldProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.wrapper}>
      <AppText variant="label">{label}</AppText>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.error : theme.colors.border,
          },
          multiline ? styles.inputShellMultiline : undefined,
        ]}
      >
        <TextInput
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          keyboardType={keyboardType}
          multiline={multiline}
          onBlur={onBlur}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry={secureTextEntry}
          selectionColor={theme.colors.primary}
          style={[
            styles.input,
            {
              color: theme.colors.textPrimary,
              fontFamily: theme.fonts.bodyRegular,
            },
            multiline ? styles.inputMultiline : undefined,
          ]}
          value={value}
        />
        {rightSlot}
      </View>
      {error ? (
        <AppText color={theme.colors.error} variant="caption">
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    flex: 1,
    fontSize: 15,
    minHeight: 46,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 104,
    textAlignVertical: 'top',
  },
  inputShell: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  inputShellMultiline: {
    alignItems: 'flex-start',
  },
  wrapper: {
    gap: 7,
  },
});
