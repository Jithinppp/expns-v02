import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { fonts, palette, radius } from '@/constants/theme';
import { formatMoney } from '@/lib/format';
import type { BudgetStatus } from '@/lib/types';

interface BudgetCardProps {
  budget: BudgetStatus;
  currency: string;
  onLongPress?: () => void;
  onPress?: () => void;
}

export function BudgetCard({ budget, currency, onLongPress, onPress }: BudgetCardProps) {
  const ratio = budget.amount_limit > 0 ? budget.spent / budget.amount_limit : 0;
  const percent = Math.round(ratio * 100);
  const over = budget.spent > budget.amount_limit;
  const close = !over && percent >= budget.alert_threshold;

  const status = over
    ? { label: 'Exceeded', text: palette.red, bg: palette.redSoft }
    : close
      ? { label: 'Almost out', text: palette.lime, bg: palette.limeSoft }
      : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${budget.category_name ?? 'All expenses'} budget, ${percent}% used`}
      onLongPress={onLongPress}
      onPress={onPress}
      style={({ pressed }) => [styles.card, over && styles.cardOver, pressed && styles.pressed]}>
      <View style={styles.topRow}>
        <View style={styles.iconWrap}>
          <AppText style={styles.emoji}>{budget.category_icon ?? '🎯'}</AppText>
        </View>
        <View style={styles.titleBlock}>
          <AppText variant="label" numberOfLines={1}>
            {budget.category_name ?? 'All expenses'}
          </AppText>
          <AppText variant="caption" color={palette.textDim}>
            {`${formatMoney(budget.spent, currency)} of ${formatMoney(budget.amount_limit, currency)} · ${budget.period}`}
          </AppText>
        </View>
        <View style={styles.percentBlock}>
          <AppText style={[styles.percent, { color: over ? palette.red : palette.white }]}>
            {`${percent}%`}
          </AppText>
          {status ? (
            <View style={[styles.statusChip, { backgroundColor: status.bg }]}>
              <AppText variant="tiny" color={status.text} style={styles.statusText}>
                {status.label}
              </AppText>
            </View>
          ) : null}
        </View>
      </View>
      <ProgressBar
        value={ratio}
        height={10}
        color={over ? palette.red : palette.lime}
        stripe="rgba(255,255,255,0.14)"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 16,
  },
  cardOver: { borderColor: 'rgba(255,122,107,0.4)' },
  pressed: { opacity: 0.9 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 17 },
  titleBlock: { flex: 1, gap: 2 },
  percentBlock: { alignItems: 'flex-end', gap: 4 },
  percent: { fontFamily: fonts.bold, fontSize: 20, letterSpacing: -0.5 },
  statusChip: { borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { letterSpacing: 0.4 },
});
