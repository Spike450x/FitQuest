import type { ActivityLog } from '@/types';

/**
 * Calendar helpers for the read-only activity calendar (`/calendar`).
 *
 * Days are bucketed by LOCAL time (not UTC) — a workout logged at 11pm local
 * should appear on "today" in the player's calendar. This deliberately differs
 * from the UTC day keys in `streaks.ts`, which back streak math, not display.
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local-time `'YYYY-MM-DD'` key for a unix-ms timestamp or Date. */
export function localDayKey(ts: number | Date): string {
  const d = ts instanceof Date ? ts : new Date(ts);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Weeks (Sunday → Saturday) covering the given month, padded with the
 * leading/trailing adjacent-month days needed to complete each week. Returns
 * 4–6 rows of 7 `Date`s depending on how the month falls.
 *
 * @param year  full year, e.g. 2026
 * @param month 0-indexed month (0 = January)
 */
export function monthMatrix(year: number, month: number): Date[][] {
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Back up to the Sunday on/before the 1st.
  const start = new Date(firstOfMonth);
  start.setDate(start.getDate() - start.getDay());

  // Walk forward in 7-day rows until we've covered the last day of the month
  // and completed its week.
  const weeks: Date[][] = [];
  const cursor = new Date(start);
  do {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  } while (cursor <= lastOfMonth);

  return weeks;
}

/** The 7 dates (Sunday → Saturday) of the week containing `ref`. */
export function weekDays(ref: Date): Date[] {
  const start = startOfDay(ref);
  start.setDate(start.getDate() - start.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    return d;
  });
}

/** Buckets activity logs by their local day key. */
export function groupLogsByDay(logs: ActivityLog[]): Record<string, ActivityLog[]> {
  const out: Record<string, ActivityLog[]> = {};
  for (const log of logs) {
    const key = localDayKey(log.loggedAt);
    (out[key] ??= []).push(log);
  }
  return out;
}
