import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Sheet } from '@/components/ui/Sheet';
import { palette } from '@/constants/theme';
import { errorMessage } from '@/lib/errors';
import { dayLabel, formatMoney, longDate } from '@/lib/format';
import { softDeleteTransaction } from '@/lib/queries';
import type { TransactionRow } from '@/lib/types';

interface TransactionSheetProps {
  tx: TransactionRow | null;
  currency: string;
  onClose: () => void;
  onDeleted: () => void | Promise<void>;
}

/**
 * Details + delete for a single transaction. Opened by tapping or
 * long-pressing a row, so an accidental entry is two taps from gone.
 */
export function TransactionSheet({ tx, currency, onClose, onDeleted }: TransactionSheetProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    setError(null);
    onClose();
  };

  const remove = async () => {
    if (!tx) return;
    setBusy(true);
    setError(null);
    try {
      await softDeleteTransaction(tx.id);
      await onDeleted();
      onClose();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not delete'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet visible={tx !== null} onClose={close} title="Transaction">
      {tx ? (
        <>
          <View style={styles.amountBlock}>
            <AppText variant="caption" color={palette.textMuted}>
              {tx.type === 'income' ? 'Income' : tx.type === 'expense' ? 'Expense' : 'Transfer'}
            </AppText>
            <AppText variant="display" color={tx.type === 'income' ? palette.green : palette.white}>
              {`${tx.type === 'income' ? '+' : '-'}${formatMoney(tx.amount, currency)}`}
            </AppText>
          </View>

          <View style={styles.rows}>
            <Detail
              label="Category"
              value={
                tx.category
                  ? `${tx.category.icon ?? ''} ${tx.category.name}`.trim()
                  : 'Uncategorized'
              }
            />
            <Detail label="Account" value={tx.account?.name ?? '—'} />
            <Detail label="Date" value={`${dayLabel(tx.occurred_on)} · ${longDate(tx.occurred_on)}`} />
            {tx.note ? <Detail label="Note" value={tx.note} /> : null}
          </View>

          {error ? (
            <AppText variant="caption" color={palette.red}>
              {error}
            </AppText>
          ) : null}

          <Button
            label="Delete transaction"
            variant="danger"
            loading={busy}
            onPress={() => void remove()}
          />
          <Button label="Keep it" variant="ghost" onPress={close} />
        </>
      ) : null}
    </Sheet>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <AppText variant="caption" color={palette.textMuted}>
        {label}
      </AppText>
      <AppText variant="label" style={styles.detailValue} numberOfLines={2}>
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  amountBlock: { alignItems: 'center', gap: 4, paddingVertical: 4 },
  rows: { gap: 10 },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  detailValue: { flexShrink: 1, textAlign: 'right' },
});
