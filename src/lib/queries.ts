import * as Crypto from 'expo-crypto';

import { toISODate } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type {
  Account,
  AccountBalance,
  AccountKind,
  BudgetPeriod,
  BudgetStatus,
  Category,
  CategoryKind,
  CategorySpend,
  Frequency,
  MonthSummary,
  NotificationItem,
  RecurringRule,
  TransactionRow,
  TransactionType,
} from '@/lib/types';

const TX_SELECT = `
  id, type, amount, occurred_on, note, merchant,
  category:categories ( id, name, icon, color ),
  account:accounts!account_id ( id, name )
`;

const num = (value: unknown): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

// ---------------------------------------------------------------- reads

export async function fetchMonthSummary(month: Date): Promise<MonthSummary> {
  const { data, error } = await supabase.rpc('get_month_summary', {
    p_month: toISODate(month),
  });
  if (error) throw error;
  const row = (data as { income: unknown; expense: unknown }[] | null)?.[0];
  return { income: num(row?.income), expense: num(row?.expense) };
}

export async function fetchTransactionsBetween(start: Date, end: Date): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_SELECT)
    .is('deleted_at', null)
    .gte('occurred_on', toISODate(start))
    .lte('occurred_on', toISODate(end))
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as TransactionRow[];
}

export async function fetchRecentTransactions(limit = 6): Promise<TransactionRow[]> {
  const { data, error } = await supabase
    .from('transactions')
    .select(TX_SELECT)
    .is('deleted_at', null)
    .order('occurred_on', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as unknown as TransactionRow[];
}

export async function fetchAccountBalances(): Promise<AccountBalance[]> {
  const { data, error } = await supabase
    .from('account_balances')
    .select('id, name, kind, is_archived, balance')
    .eq('is_archived', false)
    .order('name');
  if (error) throw error;
  return ((data ?? []) as unknown as AccountBalance[]).map((row) => ({
    ...row,
    balance: num(row.balance),
  }));
}

export async function fetchBudgetStatus(): Promise<BudgetStatus[]> {
  const { data, error } = await supabase
    .from('budget_status')
    .select('*')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as BudgetStatus[]).map((row) => ({
    ...row,
    amount_limit: num(row.amount_limit),
    spent: num(row.spent),
  }));
}

export async function fetchExpenseByCategory(month: Date): Promise<CategorySpend[]> {
  const { data, error } = await supabase.rpc('expense_by_category', {
    p_month: toISODate(month),
  });
  if (error) throw error;
  return ((data ?? []) as unknown as CategorySpend[]).map((row) => ({
    ...row,
    total: num(row.total),
  }));
}

export async function fetchAccounts(): Promise<Account[]> {
  const { data, error } = await supabase
    .from('accounts')
    .select('id, name, kind')
    .eq('is_archived', false)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as unknown as Account[];
}

export async function fetchCategories(kind?: CategoryKind): Promise<Category[]> {
  let query = supabase
    .from('categories')
    .select('id, name, icon, color, kind')
    .eq('is_archived', false)
    .order('name');
  if (kind) query = query.eq('kind', kind);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Category[];
}

export async function fetchNotifications(): Promise<NotificationItem[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, kind, title, body, data, read_at, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as unknown as NotificationItem[];
}

export async function fetchUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  if (error) throw error;
  return count ?? 0;
}

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  const { data, error } = await supabase
    .from('recurring_rules')
    .select(
      `id, type, amount, frequency, interval_count, next_run_on, note, is_active,
       category:categories ( id, name, icon, color ),
       account:accounts ( id, name )`,
    )
    .eq('is_active', true)
    .order('next_run_on');
  if (error) throw error;
  return ((data ?? []) as unknown as RecurringRule[]).map((row) => ({
    ...row,
    amount: num(row.amount),
  }));
}

// ---------------------------------------------------------------- writes

export async function createTransaction(input: {
  type: TransactionType;
  amount: number;
  accountId: string;
  categoryId: string | null;
  occurredOn: Date;
  note?: string | null;
}): Promise<void> {
  const note = input.note?.trim();
  const { error } = await supabase.from('transactions').insert({
    id: Crypto.randomUUID(),
    type: input.type,
    amount: input.amount,
    account_id: input.accountId,
    category_id: input.categoryId,
    occurred_on: toISODate(input.occurredOn),
    note: note ? note : null,
  });
  if (error) throw error;
}

export async function softDeleteTransaction(id: string): Promise<void> {
  const { error } = await supabase
    .from('transactions')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function createBudget(input: {
  categoryId: string | null;
  period: BudgetPeriod;
  amountLimit: number;
  alertThreshold: number;
}): Promise<void> {
  const { error } = await supabase.from('budgets').insert({
    category_id: input.categoryId,
    period: input.period,
    amount_limit: input.amountLimit,
    alert_threshold: input.alertThreshold,
  });
  if (error) throw error;
}

export async function deleteBudget(id: string): Promise<void> {
  const { error } = await supabase.from('budgets').delete().eq('id', id);
  if (error) throw error;
}

export async function createAccount(input: {
  name: string;
  kind: AccountKind;
  openingBalance: number;
}): Promise<void> {
  const { error } = await supabase.from('accounts').insert({
    name: input.name.trim(),
    kind: input.kind,
    opening_balance: input.openingBalance,
  });
  if (error) throw error;
}

export async function createRecurringRule(input: {
  type: 'income' | 'expense';
  amount: number;
  accountId: string;
  categoryId: string | null;
  frequency: Frequency;
  nextRunOn: Date;
  note?: string | null;
}): Promise<void> {
  const note = input.note?.trim();
  const startOn = toISODate(new Date());
  const { error } = await supabase.from('recurring_rules').insert({
    type: input.type,
    amount: input.amount,
    account_id: input.accountId,
    category_id: input.categoryId,
    frequency: input.frequency,
    interval_count: 1,
    start_on: startOn,
    next_run_on: toISODate(input.nextRunOn),
    note: note ? note : null,
  });
  if (error) throw error;
}

export async function deleteRecurringRule(id: string): Promise<void> {
  const { error } = await supabase.from('recurring_rules').delete().eq('id', id);
  if (error) throw error;
}

export async function updateBaseCurrency(profileId: string, currency: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ base_currency: currency })
    .eq('id', profileId);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

export async function registerDeviceToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  const { error } = await supabase
    .from('device_tokens')
    .upsert({ token, platform, last_seen_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
  if (error) throw error;
}
