import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { InfoCard } from '@/components/InfoCard';
import { PrimaryButton } from '@/components/PrimaryButton';

type ExperienceLinkCardProps = {
  readonly description: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly onPress: () => void;
  readonly title: string;
};

export function ExperienceLinkCard({
  description,
  icon,
  label,
  onPress,
  title,
}: ExperienceLinkCardProps) {
  return (
    <InfoCard description={description} title={title}>
      <View style={styles.row}>
        {icon}
        <PrimaryButton onPress={onPress} style={styles.button} variant="ghost">
          {label}
        </PrimaryButton>
      </View>
    </InfoCard>
  );
}

const styles = StyleSheet.create({
  button: { flexGrow: 1 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 12 },
});
