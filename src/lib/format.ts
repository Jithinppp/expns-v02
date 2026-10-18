import {
  addDays,
  addMonths,
  addYears,
  format,
  isToday,
  isYesterday,
  parseISO,
  startOfMonth,
} from 'date-fns';

export const CURRENCIES: { code: string; symbol: string; name: string }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar' },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham' },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand' },
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling' },
];

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function currencyName(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.name ?? code;
}

const GROUPING = /\B(?=(\d{3})+(?!\d))/g;

export function splitAmount(value: number): {
  negative: boolean;
  whole: string;
  decimals: string;
} {
  const safe = Number.isFinite(value) ? value : 0;
  const [whole, decimals] = Math.abs(safe).toFixed(2).split('.');
  return {
    negative: safe < 0,
    whole: whole.replace(GROUPING, ','),
    decimals,
  };
}

/** "$1,240.50" — for compact inline text. */
export function formatMoney(value: number, code = 'USD'): string {
  const { negative, whole, decimals } = splitAmount(value);
  return `${negative ? '-' : ''}${currencySymbol(code)}${whole}.${decimals}`;
}

export function monthStart(date: Date): Date {
  return startOfMonth(date);
}

/** 'yyyy-MM-01' — the value the summary RPCs expect. */
export function monthKey(date: Date): string {
  return format(startOfMonth(date), 'yyyy-MM-dd');
}

export function monthLabel(date: Date): string {
  return format(date, 'MMMM yyyy');
}

export function toISODate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function addMonthsToDate(date: Date, amount: number): Date {
  return addMonths(date, amount);
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dayLabel(iso: string): string {
  const date = parseISO(iso);
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEE, d MMM');
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), 'd MMM');
}

export function longDate(iso: string): string {
  return format(parseISO(iso), 'd MMMM yyyy');
}

/** Upcoming run date used when a recurring rule is created. */
export function nextRecurringDate(frequency: string, intervalCount = 1, from = new Date()): Date {
  const n = Math.max(1, intervalCount);
  switch (frequency) {
    case 'weekly':
      return addDays(from, 7 * n);
    case 'monthly':
      return addMonths(from, n);
    case 'yearly':
      return addYears(from, n);
    default:
      return addDays(from, n);
  }
}

export function firstName(fullName: string | null | undefined): string | null {
  if (!fullName) return null;
  const name = fullName.trim().split(/\s+/)[0];
  return name.length > 0 ? name : null;
}
