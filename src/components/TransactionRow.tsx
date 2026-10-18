import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { fonts, palette, radius } from '@/constants/theme';
import { dayLabel, formatMoney } from '@/lib/format';
import type { TransactionRow as TransactionRowType } from '@/lib/types';

interface TransactionRowProps {
  tx: TransactionRowType;
  currency: string;
  showDate?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function TransactionRow({
  tx,
  currency,
  showDate = true,
  onPress,
  onLongPress,
}: TransactionRowProps) {
  const title =
    tx.category?.name ?? (tx.type === 'transfer' ? 'Transfer' : tx.type === 'income' ? 'Income' : 'Uncategorized');
  const subtitle = tx.note || tx.account?.name || null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${formatMoney(tx.amount, currency)}`}
      onPress={onPress}
      onLongPress={onLongPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.iconWrap}>
        <AppText style={styles.emoji}>{tx.category?.icon ?? '💸'}</AppText>
      </View>
      <View style={styles.middle}>
        <AppText variant="label" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color={palette.textDim} numberOfLines={1}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      <View style={styles.right}>
        <AppText
          style={[
            styles.amount,
            { color: tx.type === 'income' ? palette.green : palette.white },
          ]}>
          {`${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount, currency)}`}
        </AppText>
        {showDate ? (
          <AppText variant="caption" color={palette.textDim}>
            {dayLabel(tx.occurred_on)}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: radius.lg + 2,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  pressed: { opacity: 0.88 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 17 },
  middle: { flex: 1, gap: 2 },
  right: { alignItems: 'flex-end', gap: 2 },
  amount: { fontFamily: fonts.semibold, fontSize: 16.5 },
});
