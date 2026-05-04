/**
 * Deterministic daily/weekly rotation utilities.
 *
 * All picks are seeded by the current calendar day or week (local time),
 * so every player sees the same rotating content on the same day.
 * Repeatably calling getDailyPick/getWeeklyPick within the same period
 * always returns the same items.
 */

// ─── Seeds ────────────────────────────────────────────────────────────────────

/** A numeric seed based on today's local calendar date (YYYYMMDD). */
function getDaySeed(): number {
  const d = new Date();
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/**
 * A numeric seed based on the current ISO week (YYYYWW).
 * ISO weeks run Monday–Sunday; week 1 contains the year's first Thursday.
 */
function getWeekSeed(): number {
  const d = new Date();
  const day = d.getDay() === 0 ? 7 : d.getDay(); // Mon=1 … Sun=7
  const thursday = new Date(d);
  thursday.setDate(d.getDate() + 4 - day);
  const yearStart = new Date(thursday.getFullYear(), 0, 1);
  const week = Math.ceil(((thursday.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return thursday.getFullYear() * 100 + week;
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

/** Pick `count` items from `arr` using today's seed. Returns the same items all day. */
export function getDailyPick<T>(arr: T[], count: number): T[] {
  return seededShuffle(arr, getDaySeed()).slice(0, Math.min(count, arr.length));
}

/** Pick `count` items from `arr` using this week's seed. Returns the same items all week. */
export function getWeeklyPick<T>(arr: T[], count: number): T[] {
  return seededShuffle(arr, getWeekSeed()).slice(0, Math.min(count, arr.length));
}

// ─── Expiry timestamps ────────────────────────────────────────────────────────

/** Unix ms timestamp for local midnight tonight (start of tomorrow). */
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
