import { toISODate } from '@/lib/format';

/**
 * The month the user is currently browsing in a month switcher
 * (dashboard / transactions). The add screen defaults to it, so a
 * backfill started while looking at an older month lands in that month.
 */
let viewedMonth: string | null = null;

export function setViewedMonth(month: Date): void {
  viewedMonth = toISODate(month);
}

export function getViewedMonth(): string | null {
  return viewedMonth;
}
