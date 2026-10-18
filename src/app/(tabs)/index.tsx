import Feather from '@expo/vector-icons/Feather';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { BudgetCard } from '@/components/BudgetCard';
import { MonthSwitcher } from '@/components/MonthSwitcher';
import { Screen } from '@/components/Screen';
import { SectionHeader } from '@/components/SectionHeader';
import { TransactionRow } from '@/components/TransactionRow';
import { Amount } from '@/components/ui/Amount';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { IconButton } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Donut } from '@/components/ui/Donut';
import { EmptyState } from '@/components/ui/EmptyState';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { chartPalette, palette, radius } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { addMonthsToDate, firstName, formatMoney, monthLabel } from '@/lib/format';
import {
  fetchAccountBalances,
  fetchBudgetStatus,
  fetchExpenseByCategory,
  fetchMonthSummary,
  fetchRecentTransactions,
  fetchUnreadNotificationCount,
  softDeleteTransaction,
} from '@/lib/queries';
import type {
  AccountBalance,
  BudgetStatus,
  CategorySpend,
  MonthSummary,
  TransactionRow as TransactionRowType,
} from '@/lib/types';
import { useLoad } from '@/lib/use-load';

interface DashboardData {
  summary: MonthSummary;
  previous: MonthSummary;
  budgets: BudgetStatus[];
  recent: TransactionRowType[];
  balances: AccountBalance[];
  byCategory: CategorySpend[];
  unread: number;
}

export default function DashboardScreen() {
  const { profile } = useAuth();
  const currency = profile?.base_currency ?? 'USD';
  const [month, setMonth] = useState(() => new Date());

  const monthId = `${month.getFullYear()}-${month.getMonth()}`;
  const state = useLoad<DashboardData>(async () => {
    const [summary, previous, budgets, recent, balances, byCategory, unread] = await Promise.all([
      fetchMonthSummary(month),
      fetchMonthSummary(addMonthsToDate(month, -1)),
      fetchBudgetStatus(),
      fetchRecentTransactions(6),
      fetchAccountBalances(),
      fetchExpenseByCategory(month),
      fetchUnreadNotificationCount(),
    ]);
    return { summary, previous, budgets, recent, balances, byCategory, unread };
  }, monthId);

  const { data, loading, error, refreshing, reload, refresh } = state;

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const totals = useMemo(() => {
    if (!data) return null;
    const balance = data.balances.reduce((sum, account) => sum + account.balance, 0);
    const budgetTotal = data.budgets.reduce((sum, budget) => sum + budget.amount_limit, 0);
    const delta =
      data.previous.expense > 0 && data.summary.expense > 0
        ? Math.round(((data.summary.expense - data.previous.expense) / data.previous.expense) * 100)
        : null;
    return { balance, budgetTotal, delta };
  }, [data]);

  const confirmDelete = (tx: TransactionRowType) => {
    Alert.alert('Delete transaction?', 'This removes it from your history and budgets.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await softDeleteTransaction(tx.id);
              await reload();
            } catch (cause) {
              Alert.alert('Could not delete', errorMessage(cause, 'Try again.'));
            }
          })();
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator color={palette.lime} />
        </View>
      </Screen>
    );
  }

  if (!data || !totals) {
    return (
      <Screen>
        <EmptyState
          icon="wifi-off"
          title="Couldn't load your dashboard"
          message={error ?? 'Check your connection and try again.'}
          actionLabel="Try again"
          onAction={() => void reload()}
        />
      </Screen>
    );
  }

  const name = firstName(profile?.full_name);
  const maxFlow = Math.max(data.summary.income, data.summary.expense, 1);
  const donutSegments = data.byCategory.slice(0, 5).map((row, index) => ({
    value: row.total,
    color: row.color ?? chartPalette[index % chartPalette.length],
  }));

  return (
    <Screen tabInset refreshing={refreshing} onRefresh={refresh}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <AppText variant="caption" color={palette.textDim}>
            {name ? `Hi, ${name} 👋` : 'Welcome 👋'}
          </AppText>
          <AppText variant="heading">{name ? `Let's track it` : 'Welcome back'}</AppText>
        </View>
        <View style={styles.headerActions}>
          <IconButton
            icon="bell"
            label="Notifications"
            badge={data.unread > 0}
            onPress={() => router.push('/notifications')}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile"
            onPress={() => router.push('/settings')}>
            <Avatar name={profile?.full_name} size={44} />
          </Pressable>
        </View>
      </View>

      <MonthSwitcher month={month} onChange={setMonth} style={styles.monthSwitcher} />

      <Card variant="white" style={styles.balanceCard}>
        <View style={styles.balanceTop}>
          <AppText variant="caption" color={palette.inkMuted}>
            Left balance
          </AppText>
          <Amount value={totals.balance} currency={currency} size={44} color={palette.ink} />
        </View>

        <View style={styles.balanceBars}>
          <MiniBar
            label="Income"
            display={formatMoney(data.summary.income, currency)}
            value={data.summary.income / maxFlow}
            color={palette.green}
          />
          <MiniBar
            label="Expenses"
            display={formatMoney(data.summary.expense, currency)}
            value={data.summary.expense / maxFlow}
            color={palette.ink}
          />
        </View>

        <View style={styles.balanceFooter}>
          <AppText variant="caption" color={palette.inkDim} style={styles.balanceFooterText}>
            {totals.budgetTotal > 0
              ? `${formatMoney(data.summary.expense, currency)} of ${formatMoney(totals.budgetTotal, currency)} budget spent`
              : 'No budgets set yet'}
          </AppText>
          {totals.delta !== null ? (
            <View style={styles.deltaPill}>
              <AppText variant="caption" color={palette.ink}>
                {`${totals.delta >= 0 ? '↑' : '↓'} ${Math.abs(totals.delta)}% vs last month`}
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.tileRow}>
        <QuickTile
          variant="lime"
          icon="arrow-up-right"
          title="Expense"
          subtitle="Log spending"
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'expense' } })}
        />
        <QuickTile
          variant="green"
          icon="arrow-down-left"
          title="Income"
          subtitle="Log earnings"
          onPress={() => router.push({ pathname: '/transaction/new', params: { type: 'income' } })}
        />
      </View>

      <View style={styles.section}>
        <SectionHeader title="Budgets" actionLabel="See all" onAction={() => router.push('/budgets')} />
        {data.budgets.length === 0 ? (
          <Card variant="lime" onPress={() => router.push('/budgets')} style={styles.ctaCard}>
            <View style={styles.ctaIcon}>
              <Feather name="target" size={20} color={palette.ink} />
            </View>
            <View style={styles.ctaText}>
              <AppText variant="label" color={palette.ink}>
                Set a monthly limit
              </AppText>
              <AppText variant="caption" color={palette.inkMuted}>
                We&apos;ll warn you at 80% and when you go over.
              </AppText>
            </View>
            <Feather name="arrow-right" size={18} color={palette.ink} />
          </Card>
        ) : (
          data.budgets
            .slice(0, 3)
            .map((budget) => (
              <BudgetCard
                key={budget.id}
                budget={budget}
                currency={currency}
                onPress={() => router.push('/budgets')}
              />
            ))
        )}
      </View>

      <Card variant="deep" style={styles.spendCard}>
        <View style={styles.spendHeader}>
          <AppText variant="heading">Spending</AppText>
          <AppText variant="caption" color={palette.textDim}>
            {monthLabel(month)}
          </AppText>
        </View>
        <Donut size={188} thickness={26} segments={donutSegments}>
          <AppText variant="caption" color={palette.textMuted}>
            Total
          </AppText>
          <Amount value={data.summary.expense} currency={currency} size={30} />
        </Donut>
        {data.byCategory.length > 0 ? (
          <View style={styles.legendWrap}>
            {data.byCategory.slice(0, 6).map((row, index) => (
              <View key={row.category_id ?? `none-${index}`} style={styles.legendItem}>
                <View
                  style={[
                    styles.legendDot,
                    { backgroundColor: row.color ?? chartPalette[index % chartPalette.length] },
                  ]}
                />
                <AppText
                  variant="caption"
                  color={palette.textMuted}
                  numberOfLines={1}
                  style={styles.legendName}>
                  {row.name}
                </AppText>
                <AppText variant="caption">{formatMoney(row.total, currency)}</AppText>
              </View>
            ))}
          </View>
        ) : (
          <AppText variant="caption" color={palette.textDim}>
            No spending logged this month yet.
          </AppText>
        )}
      </Card>

      <View style={styles.section}>
        <SectionHeader
          title="History"
          actionLabel="See all"
          onAction={() => router.push('/transactions')}
        />
        {data.recent.length === 0 ? (
          <EmptyState
            icon="plus-circle"
            title="No transactions yet"
            message="Log your first expense and it shows up here instantly."
            actionLabel="Add transaction"
            onAction={() => router.push('/transaction/new')}
          />
        ) : (
          data.recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              tx={tx}
              currency={currency}
              onLongPress={() => confirmDelete(tx)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

/* ------------------------------------------------------------- small parts */

function MiniBar({
  label,
  display,
  value,
  color,
}: {
  label: string;
  display: string;
  value: number;
  color: string;
}) {
  return (
    <View style={styles.miniBar}>
      <View style={styles.miniBarRow}>
        <AppText variant="caption" color={palette.inkMuted}>
          {label}
        </AppText>
        <AppText variant="caption" color={palette.ink}>
          {display}
        </AppText>
      </View>
      <ProgressBar
        value={value}
        height={9}
        color={color}
        track="rgba(23,23,23,0.08)"
        stripe="rgba(23,23,23,0.10)"
      />
    </View>
  );
}

function QuickTile({
  variant,
  icon,
  title,
  subtitle,
  onPress,
}: {
  variant: 'lime' | 'green';
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Card variant={variant} onPress={onPress} style={styles.tile}>
      <View style={styles.tileIcon}>
        <Feather name={icon} size={18} color={palette.ink} />
      </View>
      <View style={styles.tileText}>
        <AppText variant="heading" color={palette.ink}>
          {title}
        </AppText>
        <AppText variant="caption" color={palette.inkMuted}>
          {subtitle}
        </AppText>
      </View>
    </Card>
  );
}

/* ------------------------------------------------------------------ styles */

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingVertical: 80 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerInfo: { flex: 1, gap: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  monthSwitcher: { alignSelf: 'flex-start' },
  balanceCard: { gap: 18 },
  balanceTop: { gap: 6 },
  balanceBars: { gap: 14 },
  miniBar: { gap: 7 },
  miniBarRow: { flexDirection: 'row', justifyContent: 'space-between' },
  balanceFooter: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceFooterText: { flex: 1 },
  deltaPill: {
    backgroundColor: palette.lime,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tileRow: { flexDirection: 'row', gap: 12 },
  tile: { flex: 1, gap: 18 },
  tileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileText: { gap: 2 },
  section: { gap: 14 },
  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  ctaIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { flex: 1, gap: 2 },
  spendCard: { gap: 20, alignItems: 'center' },
  spendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  legendWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, width: '100%' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flexBasis: '46%', flexGrow: 1 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendName: { flex: 1 },
});
