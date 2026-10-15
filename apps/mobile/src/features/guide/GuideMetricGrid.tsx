import type { GuideActivitySummary } from '@conexao-favela/shared';
import { CalendarCheck, FilePenLine, Star, UsersRound } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/Text';
import { useAppTheme } from '@/theme/useAppTheme';

type GuideMetricGridProps = {
  readonly summary: GuideActivitySummary;
};

function formatRating(rating: number | null): string {
  return rating === null ? '-' : rating.toFixed(1);
}

export function GuideMetricGrid({ summary }: GuideMetricGridProps) {
  const theme = useAppTheme();
  const { t } = useTranslation('guide');
  const metrics = [
    {
      icon: CalendarCheck,
      label: t('metrics.publishedTours'),
      value: summary.publishedTourCount.toString(),
    },
    { icon: FilePenLine, label: t('metrics.drafts'), value: summary.draftTourCount.toString() },
    { icon: UsersRound, label: t('metrics.bookings'), value: summary.bookingCount.toString() },
    { icon: Star, label: t('metrics.rating'), value: formatRating(summary.averageRating) },
  ] as const;

  return (
    <View style={styles.grid}>
      {metrics.map((metric) => {
        const Icon = metric.icon;

        return (
          <View
            key={metric.label}
            style={[
              styles.card,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
              },
            ]}
          >
            <Icon color={theme.colors.primary} size={20} />
            <AppText variant="title">{metric.value}</AppText>
            <AppText color={theme.colors.textSecondary} variant="caption">
              {metric.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    flexGrow: 1,
    gap: 6,
    minWidth: 140,
    padding: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
});
