import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { BudgetCard } from '@/components/BudgetCard';
import { Screen } from '@/components/Screen';
import { AppText } from '@/components/ui/AppText';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { EmptyState } from '@/components/ui/EmptyState';
import { Field } from '@/components/ui/Field';
import { Sheet } from '@/components/ui/Sheet';
import { palette } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { currencySymbol } from '@/lib/format';
import { createBudget, deleteBudget, fetchBudgetStatus, fetchCategories } from '@/lib/queries';
import type { BudgetPeriod, BudgetStatus, Category } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

const PERIODS: { value: BudgetPeriod; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const THRESHOLDS = [70, 80, 90];

export default function BudgetsScreen() {
  const { profile } = useAuth();
  const currency = profile?.base_currency ?? 'USD';

  const state = useLoad(fetchBudgetStatus);
  const { data, loading, refreshing, reload, refresh } = state;

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const [categories, setCategories] = useState<Category[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [amountText, setAmountText] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [threshold, setThreshold] = useState(80);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories('expense')
      .then(setCategories)
      .catch(() => {
        // Category chips just stay empty; the "All expenses" option still works.
      });
  }, []);

  const budgets = data ?? [];

  const openSheet = () => {
    setFormError(null);
    setSheetOpen(true);
  };

  const save = async () => {
    const amount = Number.parseFloat(amountText.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) {
      setFormError('Enter a limit greater than zero.');
      return;
    }
    setBusy(true);
    setFormError(null);
    try {
      await createBudget({
        categoryId,
        period,
        amountLimit: amount,
        alertThreshold: threshold,
      });
      setSheetOpen(false);
      setAmountText('');
      setCategoryId(null);
      setPeriod('monthly');
      setThreshold(80);
      await reload();
    } catch (cause) {
      const message = errorMessage(cause, 'Could not create budget');
      setFormError(
        message.toLowerCase().includes('duplicate') || message.toLowerCase().includes('unique')
          ? 'A budget for this category and period already exists.'
          : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = (budget: BudgetStatus) => {
    Alert.alert(
      'Delete budget?',
      `${budget.category_name ?? 'All expenses'} · ${budget.period}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await deleteBudget(budget.id);
                await reload();
              } catch (cause) {
                Alert.alert('Could not delete', errorMessage(cause, 'Try again.'));
              }
            })();
          },
        },
      ],
    );
  };

  return (
    <Screen tabInset refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <AppText variant="title">Budgets</AppText>
          <AppText variant="caption" color={palette.textMuted}>
            Limits reset every period — you&apos;re warned before you overspend.
          </AppText>
        </View>
        <IconButton icon="plus" label="New budget" variant="lime" onPress={openSheet} />
      </View>

      {budgets.length === 0 && !loading ? (
        <EmptyState
          icon="target"
          title="No budgets yet"
          message="Cap a category and we'll warn you before you overspend."
          actionLabel="Create budget"
          onAction={openSheet}
        />
      ) : (
        budgets.map((budget) => (
          <BudgetCard
            key={budget.id}
            budget={budget}
            currency={currency}
            onLongPress={() => confirmDelete(budget)}
          />
        ))
      )}

      {budgets.length > 0 ? (
        <AppText variant="caption" color={palette.textDim}>
          Long-press a budget to delete it.
        </AppText>
      ) : null}

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="New budget">
        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Category
          </AppText>
          <View style={styles.chipWrap}>
            <Chip
              label="All expenses"
              active={categoryId === null}
              onPress={() => setCategoryId(null)}
            />
            {categories.map((category) => (
              <Chip
                key={category.id}
                label={category.name}
                emoji={category.icon}
                active={categoryId === category.id}
                onPress={() => setCategoryId(category.id)}
              />
            ))}
          </View>
        </View>

        <Field
          label="Limit"
          value={amountText}
          onChangeText={setAmountText}
          placeholder="0.00"
          keyboardType="decimal-pad"
          prefix={currencySymbol(currency)}
        />

        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Period
          </AppText>
          <View style={styles.chipRow}>
            {PERIODS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                active={period === option.value}
                onPress={() => setPeriod(option.value)}
              />
            ))}
          </View>
        </View>

        <View style={styles.field}>
          <AppText variant="caption" color={palette.textMuted}>
            Warn me at
          </AppText>
          <View style={styles.chipRow}>
            {THRESHOLDS.map((value) => (
              <Chip
                key={value}
                label={`${value}%`}
                active={threshold === value}
                onPress={() => setThreshold(value)}
              />
            ))}
          </View>
        </View>

        {formError ? (
          <AppText variant="caption" color={palette.red}>
            {formError}
          </AppText>
        ) : null}

        <Button label="Create budget" loading={busy} onPress={() => void save()} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerText: { flex: 1, gap: 4 },
  field: { gap: 8 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
