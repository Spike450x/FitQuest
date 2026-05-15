/**
 * Deterministic daily/weekly rotation utilities.
 *
 * All picks are seeded by the current calendar day or week (UTC),
 * so every player sees the same rotating content on the same day.
 * Repeatably calling getDailyPick/getWeeklyPick within the same period
 * always returns the same items.
 */

// ─── Seeds ────────────────────────────────────────────────────────────────────

/** Parse a 'YYYY-MM-DD' date key to the YYYYMMDD integer seed. */
function seedFromDateKey(dateKey: string): number {
  return parseInt(dateKey.replace(/-/g, ''), 10);
}

/**
 * Parse a 'YYYY-WW' ISO week key to the YYYYWW integer seed.
 * Example: '2026-20' → 202620.
 */
function seedFromWeekKey(weekKey: string): number {
  return parseInt(weekKey.replace('-', ''), 10);
}

/** A numeric seed based on today's UTC calendar date (YYYYMMDD). */
function getDaySeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

/**
 * A numeric seed based on the current UTC ISO week (YYYYWW).
 * ISO weeks run Monday–Sunday; week 1 contains the year's first Thursday.
 */
function getWeekSeed(): number {
  const d = new Date();
  const dayUTC = d.getUTCDay() === 0 ? 7 : d.getUTCDay(); // Mon=1…Sun=7
  // Thursday of this ISO week (UTC)
  const thursdayMs = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + (4 - dayUTC));
  const thursday = new Date(thursdayMs);
  const yearStartMs = Date.UTC(thursday.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((thursdayMs - yearStartMs) / 86_400_000 + 1) / 7);
  return thursday.getUTCFullYear() * 100 + week;
}

// ─── Shuffle ──────────────────────────────────────────────────────────────────

/**
 * Deterministic Fisher-Yates shuffle using a linear congruential generator.
 * Same seed → same permutation every call.
 */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    // LCG parameters from Numerical Recipes
    s = (Math.imul(s, 1664525) + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ─── Public pick helpers ──────────────────────────────────────────────────────

/**
 * Pick `count` items from `arr` using today's UTC date as the seed.
 * Pass an explicit `dateKey` ('YYYY-MM-DD') to make the call pure and
 * testable — when provided, the internal clock is not read at all.
 */
export function getDailyPick<T>(arr: T[], count: number, dateKey?: string): T[] {
  const seed = dateKey ? seedFromDateKey(dateKey) : getDaySeed();
  return seededShuffle(arr, seed).slice(0, Math.min(count, arr.length));
}

/**
 * Pick `count` items from `arr` using this week's UTC ISO-week seed.
 * Pass an explicit `weekKey` ('YYYY-WW', e.g. '2026-20') to make the call
 * pure and testable — when provided, the internal clock is not read at all.
 */
export function getWeeklyPick<T>(arr: T[], count: number, weekKey?: string): T[] {
  const seed = weekKey ? seedFromWeekKey(weekKey) : getWeekSeed();
  return seededShuffle(arr, seed).slice(0, Math.min(count, arr.length));
}

// ─── Expiry timestamps ────────────────────────────────────────────────────────

/**
 * Unix ms timestamp for the next UTC midnight — when daily picks rotate.
 * Use this for rotation countdown displays. For quest expiry (local midnight)
 * use `dailyExpiresAt()` instead.
 */
export function rotationExpiresAt(): number {
  const d = new Date();
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
}

/** Unix ms timestamp for local midnight tonight (start of tomorrow). Used for quest expiry. */
export function dailyExpiresAt(): number {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Unix ms timestamp for end of this Sunday, 23:59:59.999 local time.
 * Weeks run Mon–Sun. If today IS Sunday, expires at end of today.
 */
export function weeklyExpiresAt(): number {
  const now = new Date();
  const daysUntilSunday = now.getDay() === 0 ? 0 : 7 - now.getDay();
  const end = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() + daysUntilSunday,
    23,
    59,
    59,
    999,
  );
  return end.getTime();
}

// ─── Countdown display ────────────────────────────────────────────────────────

/** Human-readable "Xh Ym" countdown until a future Unix ms timestamp. */
export function formatCountdown(expiresAt: number): string {
  const diff = expiresAt - Date.now();
  if (diff <= 0) return 'now';
  const totalMinutes = Math.floor(diff / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 48) return `${Math.floor(hours / 24)}d`;
  if (hours >= 1) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
