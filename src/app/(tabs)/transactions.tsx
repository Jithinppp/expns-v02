import Feather from '@expo/vector-icons/Feather';
import { endOfMonth } from 'date-fns';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { MonthSwitcher } from '@/components/MonthSwitcher';
import { TransactionRow } from '@/components/TransactionRow';
import { TransactionSheet } from '@/components/TransactionSheet';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { fonts, palette, radius, TAB_BAR_INSET } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { dayLabel, formatMoney, monthStart } from '@/lib/format';
import { fetchTransactionsBetween } from '@/lib/queries';
import type { TransactionRow as TransactionRowType } from '@/lib/types';
import { useLoad } from '@/lib/use-load';

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useAuth();
  const currency = profile?.base_currency ?? 'USD';
  const [month, setMonth] = useState(() => new Date());
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<TransactionRowType | null>(null);

  const monthId = `${month.getFullYear()}-${month.getMonth()}`;
  const state = useLoad(
    () => fetchTransactionsBetween(monthStart(month), endOfMonth(month)),
    monthId,
  );

  const { data, loading, error, refreshing, reload, refresh } = state;

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const transactions = useMemo(() => data ?? [], [data]);

  const sections = useMemo(() => {
    const term = query.trim().toLowerCase();
    const filtered = term
      ? transactions.filter((tx) =>
          `${tx.category?.name ?? ''} ${tx.note ?? ''} ${tx.account?.name ?? ''}`
            .toLowerCase()
            .includes(term),
        )
      : transactions;

    const groups = new Map<string, TransactionRowType[]>();
    for (const tx of filtered) {
      const bucket = groups.get(tx.occurred_on);
      if (bucket) bucket.push(tx);
      else groups.set(tx.occurred_on, [tx]);
    }
    return Array.from(groups.entries()).map(([key, data]) => ({
      title: dayLabel(key),
      data,
    }));
  }, [transactions, query]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of transactions) {
      if (tx.type === 'income') income += tx.amount;
      else expense += tx.amount;
    }
    return { income, expense };
  }, [transactions]);

  return (
    <SafeAreaView edges={['top']} style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            currency={currency}
            showDate={false}
            onPress={() => setSelected(item)}
            onLongPress={() => setSelected(item)}
          />
        )}
        renderSectionHeader={({ section }) => (
          <AppText variant="caption" color={palette.textDim} style={styles.sectionTitle}>
            {section.title}
          </AppText>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="title">Transactions</AppText>
            <MonthSwitcher month={month} onChange={setMonth} style={styles.monthSwitcher} />
            <View style={styles.summaryRow}>
              <View style={[styles.summaryChip, { backgroundColor: palette.greenSoft }]}>
                <AppText variant="caption" color={palette.textMuted}>
                  Money in
                </AppText>
                <AppText variant="heading" color={palette.green}>
                  {`+${formatMoney(totals.income, currency)}`}
                </AppText>
              </View>
              <View style={[styles.summaryChip, { backgroundColor: palette.limeSoft }]}>
                <AppText variant="caption" color={palette.textMuted}>
                  Money out
                </AppText>
                <AppText variant="heading" color={palette.lime}>
                  {`-${formatMoney(totals.expense, currency)}`}
                </AppText>
              </View>
            </View>
            <View style={styles.search}>
              <Feather name="search" size={17} color={palette.textDim} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search notes and categories"
                placeholderTextColor={palette.textDim}
                accessibilityLabel="Search transactions"
                style={styles.searchInput}
              />
              {query ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Clear search"
                  hitSlop={10}
                  onPress={() => setQuery('')}>
                  <Feather name="x" size={16} color={palette.textDim} />
                </Pressable>
              ) : null}
            </View>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={palette.lime} style={styles.loader} />
          ) : (
            <EmptyState
              icon={error ? 'wifi-off' : 'file-text'}
              title={error ? "Couldn't load transactions" : 'Nothing here yet'}
              message={
                error ??
                (query
                  ? 'No transactions match your search.'
                  : 'Transactions you log this month will appear here.')
              }
              actionLabel={error || query ? 'Try again' : 'Add transaction'}
              onAction={
                error
                  ? () => void reload()
                  : query
                    ? () => setQuery('')
                    : () => router.push('/transaction/new')
              }
            />
          )
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: TAB_BAR_INSET + insets.bottom }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={palette.lime}
            colors={[palette.lime]}
            progressBackgroundColor={palette.surface}
          />
        }
      />
      <TransactionSheet
        tx={selected}
        currency={currency}
        onClose={() => setSelected(null)}
        onDeleted={reload}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { padding: 20 },
  header: { gap: 18, marginBottom: 8 },
  monthSwitcher: { alignSelf: 'flex-start' },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryChip: { flex: 1, gap: 4, borderRadius: radius.lg, padding: 16 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    minHeight: 48,
  },
  searchInput: {
    flex: 1,
    color: palette.white,
    fontFamily: fonts.medium,
    fontSize: 14.5,
    paddingVertical: 0,
  },
  sectionTitle: { marginTop: 18, marginBottom: 10 },
  separator: { height: 10 },
  loader: { marginTop: 40 },
});
