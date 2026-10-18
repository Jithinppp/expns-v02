export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryKind = 'income' | 'expense';
export type BudgetPeriod = 'weekly' | 'monthly' | 'yearly';
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type AccountKind = 'cash' | 'bank' | 'credit_card' | 'wallet';

export interface Profile {
  id: string;
  full_name: string | null;
  base_currency: string;
  timezone: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  kind: CategoryKind;
}

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
}

export interface AccountBalance extends Account {
  is_archived: boolean;
  balance: number;
}

export interface TransactionRow {
  id: string;
  type: TransactionType;
  amount: number;
  occurred_on: string;
  note: string | null;
  merchant: string | null;
  category: Category | null;
  account: { id: string; name: string } | null;
}

export interface BudgetStatus {
  id: string;
  category_id: string | null;
  period: BudgetPeriod;
  amount_limit: number;
  alert_threshold: number;
  category_name: string | null;
  category_icon: string | null;
  category_color: string | null;
  spent: number;
  period_start: string | null;
  period_end: string | null;
  created_at: string;
}

export interface MonthSummary {
  income: number;
  expense: number;
  /** Everything earned/spent before this month plus opening balances — the "main" balance. */
  carryover: number;
}

export interface CategorySpend {
  category_id: string | null;
  name: string;
  icon: string | null;
  color: string | null;
  total: number;
}

export interface RecurringRule {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  frequency: Frequency;
  interval_count: number;
  next_run_on: string;
  note: string | null;
  is_active: boolean;
  category: Category | null;
  account: { id: string; name: string } | null;
}

export interface NotificationItem {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
}
