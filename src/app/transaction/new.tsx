import Feather from '@expo/vector-icons/Feather';
import { format, subDays } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Amount } from '@/components/ui/Amount';
import { AppText } from '@/components/ui/AppText';
import { Button, IconButton } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { Field } from '@/components/ui/Field';
import { fonts, palette, radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { dayLabel, toISODate } from '@/lib/format';
import { createTransaction, fetchAccounts, fetchCategories } from '@/lib/queries';
import type { Account, Category } from '@/lib/types';

const KEYPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['.', '0', 'del'],
] as const;

const DATE_OPTIONS = Array.from({ length: 14 }, (_, index) => index);

export default function NewTransactionScreen() {
  const params = useLocalSearchParams<{ type?: string }>();
  const insets = useSafeAreaInsets();
  const { session, profile } = useAuth();
  const currency = profile?.base_currency ?? 'USD';

  const [type, setType] = useState<'expense' | 'income'>(
    params.type === 'income' ? 'income' : 'expense',
  );
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [dateOffset, setDateOffset] = useState(0);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [cats, accs] = await Promise.all([fetchCategories(type), fetchAccounts()]);
        setCategories(cats);
        setAccounts(accs);
        setAccountId((prev) =>
          prev && accs.some((account) => account.id === prev) ? prev : (accs[0]?.id ?? null),
        );
        setCategoryId((prev) =>
          prev && cats.some((category) => category.id === prev) ? prev : (cats[0]?.id ?? null),
        );
      } catch (cause) {
        setError(errorMessage(cause, 'Could not load options'));
      } finally {
        setLoadingOptions(false);
      }
    })();
  }, [type]);

  const amount = useMemo(() => {
    const parsed = Number.parseFloat(amountText);
    return Number.isFinite(parsed) ? parsed : 0;
  }, [amountText]);

  const date = useMemo(() => subDays(new Date(), dateOffset), [dateOffset]);

  const onKey = (key: string) => {
    void Haptics.selectionAsync();
    setAmountText((prev) => {
      if (key === 'del') return prev.slice(0, -1);
      if (key === '.') {
        if (prev.includes('.')) return prev;
        return prev === '' ? '0.' : `${prev}.`;
      }
      const [whole, decimals] = prev.split('.');
      if (prev.includes('.') && decimals && decimals.length >= 2) return prev;
      if (!prev.includes('.') && whole.length >= 8) return prev;
      if (prev === '0') return key;
      return prev + key;
    });
  };

  const save = async () => {
    if (amount <= 0) {
      setError('Enter an amount first.');
      return;
    }
    if (!accountId) {
      setError('Add an account in Profile first.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await createTransaction({
        type,
        amount,
        accountId,
        categoryId,
        occurredOn: date,
        note,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (cause) {
      setError(errorMessage(cause, 'Could not save'));
      setBusy(false);
    }
  };

  if (!session) return <Redirect href="/(auth)/login" />;

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <View style={styles.header}>
        <IconButton icon="chevron-down" label="Close" variant="deep" onPress={() => router.back()} />
        <View style={styles.segment}>
          <Chip label="Expense" active={type === 'expense'} onPress={() => setType('expense')} />
          <Chip label="Income" active={type === 'income'} onPress={() => setType('income')} />
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <View style={styles.amountBlock}>
          <AppText variant="caption" color={palette.textDim}>
            {`${dayLabel(toISODate(date))} · ${type === 'expense' ? 'Expense' : 'Income'}`}
          </AppText>
          <Amount
            value={amount}
            currency={currency}
            size={54}
            color={amount > 0 ? palette.white : palette.textDim}
          />
        </View>

        {loadingOptions ? (
          <ActivityIndicator color={palette.lime} />
        ) : (
          <>
            <ChipRow
              items={categories.map((category) => ({
                id: category.id,
                label: category.name,
                emoji: category.icon,
              }))}
              selectedId={categoryId}
              onSelect={setCategoryId}
            />
            <ChipRow
              items={accounts.map((account) => ({ id: account.id, label: account.name }))}
              selectedId={accountId}
              onSelect={setAccountId}
            />
            <ChipRow
              items={DATE_OPTIONS.map((offset) => ({
                id: String(offset),
                label:
                  offset === 0
                    ? 'Today'
                    : offset === 1
                      ? 'Yesterday'
                      : format(subDays(new Date(), offset), 'EEE d'),
              }))}
              selectedId={String(dateOffset)}
              onSelect={(id) => setDateOffset(Number(id))}
            />
            <Field
              label="Note"
              value={note}
              onChangeText={setNote}
              placeholder="What was it for?"
              autoCapitalize="sentences"
              returnKeyType="done"
            />
          </>
        )}

        {error ? (
          <AppText variant="caption" color={palette.red}>
            {error}
          </AppText>
        ) : null}
      </ScrollView>

      <View style={[styles.keypad, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>
        {KEYPAD_ROWS.map((row) => (
          <View key={row.join('-')} style={styles.keyRow}>
            {row.map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key === 'del' ? 'Delete digit' : key}
                onPress={() => onKey(key)}
                style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}>
                {key === 'del' ? (
                  <Feather name="delete" size={22} color={palette.white} />
                ) : (
                  <AppText style={styles.keyText}>{key}</AppText>
                )}
              </Pressable>
            ))}
          </View>
        ))}
        <Button
          label={type === 'expense' ? 'Save expense' : 'Save income'}
          loading={busy}
          onPress={() => void save()}
        />
      </View>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------- chip row */

function ChipRow({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: string; label: string; emoji?: string | null }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.chipRowContent}>
      {items.map((item) => (
        <Chip
          key={item.id}
          label={item.label}
          emoji={item.emoji}
          active={selectedId === item.id}
          onPress={() => onSelect(item.id)}
        />
      ))}
    </ScrollView>
  );
}

/* ---------------------------------------------------------------- styles */

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 12,
  },
  segment: { flexDirection: 'row', gap: 8 },
  headerSpacer: { width: 44 },
  content: { padding: 20, gap: 18, paddingBottom: 16 },
  amountBlock: { alignItems: 'center', gap: 8, paddingVertical: 12 },
  chipRowContent: { gap: 8, paddingRight: 20 },
  keypad: {
    backgroundColor: palette.deep,
    borderTopWidth: 1,
    borderColor: palette.border,
    borderTopLeftRadius: radius.card,
    borderTopRightRadius: radius.card,
    padding: 16,
    gap: 10,
  },
  keyRow: { flexDirection: 'row', gap: 10 },
  key: {
    flex: 1,
    height: 54,
    borderRadius: radius.md + 2,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { opacity: 0.65 },
  keyText: { fontFamily: fonts.semibold, fontSize: 22 },
});
