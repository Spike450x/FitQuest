'use client';

import { useEffect, useState, useMemo } from 'react';
import { useCharacter } from '@/hooks/useCharacter';
import { fetchActivityLogs, fetchActiveQuests, fetchInventoryItems } from '@/lib/fetchPlayerData';
import { fetchRecentCombatLogs, type CombatLog } from '@/lib/combatData';
import { useQuestStore } from '@/store/questStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { getItemById } from '@/lib/gameLogic/items';
import { ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import { ACTIVITY_ICONS } from '@/lib/activityIcons';
import { getStreakTier, STREAK_TIERS } from '@/lib/gameLogic/streaks';
import type { ActivityLog, ActiveQuest, InventoryItem, ActivityType, Character } from '@/types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts';

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  workout: '#6366f1',
  run: '#f97316',
  steps: '#10b981',
  sleep: '#8b5cf6',
  water: '#3b82f6',
  nutrition: '#22c55e',
};

type Range = '7d' | '30d' | 'all';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function startOfRange(range: Range): number {
  if (range === 'all') return 0;
  const days = range === '7d' ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function buildDateBuckets(range: Range): string[] {
  if (range === 'all') return [];
  const days = range === '7d' ? 7 : 30;
  const buckets: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push(dayLabel(d.getTime()));
  }
  return buckets;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StatsPage() {
  const { character, user } = useCharacter();

  if (!character || !user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Stats</h1>
        <p className="text-sm text-gray-500 mt-1">
          {character.name} · Level {character.level} {character.class}
        </p>
      </div>

      <StatsContent character={character} uid={user.uid} />
    </div>
  );
}

// ─── Stats Content ────────────────────────────────────────────────────────────

interface RawStats {
  logs: ActivityLog[];
  quests: ActiveQuest[];
  inventory: InventoryItem[];
  combatLogs: CombatLog[];
}

function StatsContent({ character, uid }: { character: Character; uid: string }) {
  const [range, setRange] = useState<Range>('30d');
  const [raw, setRaw] = useState<RawStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Activity logs live only in Firestore — always fetch.
        // Quests and inventory are already loaded by other pages in a normal
        // session; read from the Zustand store snapshot and skip the round-trip.
        // Fall back to Firestore only if the store hasn't been populated yet.
        const { quests: cachedQuests } = useQuestStore.getState();
        const { items: cachedItems } = useInventoryStore.getState();

        const [logs, quests, inventory, combatLogs] = await Promise.all([
          fetchActivityLogs(uid),
          cachedQuests.length > 0 ? Promise.resolve(cachedQuests) : fetchActiveQuests(uid),
          cachedItems.length > 0 ? Promise.resolve(cachedItems) : fetchInventoryItems(uid),
          fetchRecentCombatLogs(uid, 1000),
        ]);
        setRaw({ logs, quests, inventory, combatLogs });
      } catch {
        setError('Failed to load stats. Please refresh to try again.');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [uid]);

  const stats = useMemo(() => {
    if (!raw) return null;
    const cutoff = startOfRange(range);

    const logs = raw.logs.filter((l) => l.loggedAt >= cutoff);
    const claimed = raw.quests.filter((q) => q.claimedAt !== null && (q.claimedAt ?? 0) >= cutoff);
    const purchases = raw.inventory.filter((i) => i.acquiredAt >= cutoff);

    const goldFromQuests = claimed.reduce(
      (s, q) => s + (q.rewardedGold ?? q.rewards?.gold ?? 0),
      0,
    );
    const goldSpent = purchases.reduce((s, i) => {
      const def = getItemById(i.itemDefId);
      return s + (def?.price ?? 0);
    }, 0);
    const questsCompleted = claimed.length;

    // XP sources post-R4: quest claims and combat victories.
    // Activity logs carry xpGained=0 after the Cloud Function migration.
    // rewardedXp is the actual XP awarded at claim time (post-level-scaling + streak
    // multiplier); falls back to base rewards.xp for quests claimed before this field
    // was introduced.
    const questXpByDay: Record<string, number> = {};
    for (const q of claimed) {
      if (!q.claimedAt) continue;
      const label = dayLabel(q.claimedAt);
      questXpByDay[label] = (questXpByDay[label] ?? 0) + (q.rewardedXp ?? q.rewards?.xp ?? 0);
    }

    const combatXpByDay: Record<string, number> = {};
    for (const c of raw.combatLogs.filter((cl) => cl.loggedAt >= cutoff)) {
      const label = dayLabel(c.loggedAt);
      combatXpByDay[label] = (combatXpByDay[label] ?? 0) + c.xp;
    }

    const totalQuestXp = Object.values(questXpByDay).reduce((s, v) => s + v, 0);
    const totalCombatXp = Object.values(combatXpByDay).reduce((s, v) => s + v, 0);
    const totalXp = totalQuestXp + totalCombatXp;
    const battlesWon = raw.combatLogs.filter((cl) => cl.loggedAt >= cutoff).length;

    const byType: Record<string, { count: number; amount: number }> = {};
    for (const l of logs) {
      const t = l.type;
      if (!byType[t]) byType[t] = { count: 0, amount: 0 };
      byType[t].count++;
      byType[t].amount += (l.data as { amount?: number }).amount ?? 0;
    }

    const actByDay: Record<string, Record<string, number>> = {};
    for (const l of logs) {
      const label = dayLabel(l.loggedAt);
      if (!actByDay[label]) actByDay[label] = {};
      actByDay[label][l.type] = (actByDay[label][l.type] ?? 0) + 1;
    }

    const questsByDay: Record<string, number> = {};
    for (const q of claimed) {
      if (!q.claimedAt) continue;
      const label = dayLabel(q.claimedAt);
      questsByDay[label] = (questsByDay[label] ?? 0) + 1;
    }

    const buckets = range !== 'all' ? buildDateBuckets(range) : null;
    const allDays =
      buckets ??
      Array.from(
        new Set([
          ...Object.keys(questXpByDay),
          ...Object.keys(combatXpByDay),
          ...Object.keys(actByDay),
          ...Object.keys(questsByDay),
        ]),
      ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const xpChartData = allDays.map((d) => ({
      date: d,
      questXp: questXpByDay[d] ?? 0,
      combatXp: combatXpByDay[d] ?? 0,
    }));

    const actChartData = allDays.map((d) => {
      const row: Record<string, number | string> = { date: d };
      for (const type of Object.keys(ACTIVITY_DEFINITIONS)) {
        row[type] = actByDay[d]?.[type] ?? 0;
      }
      return row;
    });

    const questChartData = allDays.map((d) => ({
      date: d,
      quests: questsByDay[d] ?? 0,
    }));

    const breakdownData = Object.entries(byType)
      .sort((a, b) => b[1].count - a[1].count)
      .map(([type, v]) => ({
        type: ACTIVITY_DEFINITIONS[type as ActivityType]?.label ?? type,
        color: ACTIVITY_COLORS[type as ActivityType] ?? '#6b7280',
        logs: v.count,
        amount: Math.round(v.amount * 10) / 10,
        unit: ACTIVITY_DEFINITIONS[type as keyof typeof ACTIVITY_DEFINITIONS]?.unit ?? '',
      }));

    return {
      totalXp,
      goldFromQuests,
      goldSpent,
      questsCompleted,
      battlesWon,
      xpChartData,
      actChartData,
      questChartData,
      breakdownData,
    };
  }, [raw, range]);

  const RANGES: { value: Range; label: string }[] = [
    { value: '7d', label: 'Last 7 days' },
    { value: '30d', label: 'Last 30 days' },
    { value: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-5">
      {/* Range filter */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {RANGES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setRange(value)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              range === value
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : loading || !stats ? (
        <StatsLoading />
      ) : (
        <>
          {range === 'all' && raw && raw.logs.length >= 500 && (
            <p className="text-xs text-gray-400 text-right">
              Showing most recent 500 activity logs
            </p>
          )}
          {range === 'all' && raw && raw.combatLogs.length >= 1000 && (
            <p className="text-xs text-gray-400 text-right">Showing most recent 1000 battles</p>
          )}
          <OverviewCards stats={stats} />
          <StreakPanel character={character} />
          <PersonalRecordsPanel character={character} />
          <ActivityBreakdown data={stats.breakdownData} />
          <XpChart data={stats.xpChartData} />
          <ActivityFrequencyChart data={stats.actChartData} />
          <QuestsChart data={stats.questChartData} />
        </>
      )}
    </div>
  );
}

// ── Streak Panel ──────────────────────────────────────────────────────────────

function StreakPanel({ character }: { character: Character }) {
  const current = character.streakData?.currentStreak ?? 0;
  const longest = character.streakData?.longestStreak ?? 0;
  const tier = getStreakTier(current);

  return (
    <ChartCard title="Blessing Streak">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-4xl">🔥</div>
        <div>
          <p className={`text-2xl font-bold ${tier.color}`}>
            Day {current}
            {tier.label ? ` — ${tier.label}` : ''}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            Longest streak: {longest} {longest === 1 ? 'day' : 'days'}
          </p>
        </div>
        {tier.lootDropMultiplier > 1 && (
          <div className={`ml-auto text-center px-3 py-2 rounded-lg border ${tier.bgColor}`}>
            <p className={`text-lg font-bold ${tier.color}`}>
              +{Math.round((tier.lootDropMultiplier - 1) * 100)}%
            </p>
            <p className="text-xs text-gray-500">rare+ drops</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {[...STREAK_TIERS]
          .reverse()
          .filter((t) => t.label)
          .map((t) => {
            const isActive = current >= t.minDays;
            const isCurrentTier = tier.minDays === t.minDays && t.label;
            return (
              <div
                key={t.minDays}
                className={`flex items-center justify-between px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  isCurrentTier
                    ? `${t.bgColor} border font-semibold`
                    : isActive
                      ? 'bg-gray-50 text-gray-500'
                      : 'text-gray-300'
                }`}
              >
                <span>
                  {isActive ? '✓' : `Day ${t.minDays}`} {t.label}
                </span>
                <span className="text-xs">
                  +{Math.round((t.lootDropMultiplier - 1) * 100)}% rare+ drops
                </span>
              </div>
            );
          })}
      </div>
    </ChartCard>
  );
}

// ── Personal Records Panel ────────────────────────────────────────────────────

const ACTIVITY_ORDER: ActivityType[] = ['run', 'workout', 'steps', 'sleep', 'water', 'nutrition'];

function PersonalRecordsPanel({ character }: { character: Character }) {
  const records = character.personalRecords ?? {};
  const hasAny = ACTIVITY_ORDER.some((t) => records[t]);

  return (
    <ChartCard title="Personal Records">
      {!hasAny ? (
        <p className="text-sm text-gray-400 text-center py-4">
          No personal records yet — log activities to set your bests!
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {ACTIVITY_ORDER.map((type) => {
            const pr = records[type];
            const def = ACTIVITY_DEFINITIONS[type];
            return (
              <div
                key={type}
                className={`rounded-xl p-3 border text-center ${
                  pr ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-50'
                }`}
              >
                <p className="text-2xl mb-1">{ACTIVITY_ICONS[type]}</p>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  {def.label}
                </p>
                {pr ? (
                  <>
                    <p className="text-xl font-bold text-indigo-600">
                      {pr.value % 1 === 0 ? pr.value : pr.value.toFixed(1)}
                    </p>
                    <p className="text-xs text-gray-400">{pr.unit}</p>
                    <p className="text-xs text-gray-300 mt-1">
                      {new Date(pr.loggedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-300 font-medium">—</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </ChartCard>
  );
}

// ── Overview Cards ────────────────────────────────────────────────────────────

function OverviewCards({
  stats,
}: {
  stats: {
    totalXp: number;
    goldFromQuests: number;
    goldSpent: number;
    questsCompleted: number;
    battlesWon: number;
  };
}) {
  const cards = [
    {
      label: 'XP Earned',
      value: stats.totalXp.toLocaleString(),
      icon: '⭐',
      color: 'text-indigo-600',
      bg: 'bg-indigo-50',
    },
    {
      label: 'Gold from Quests',
      value: stats.goldFromQuests.toLocaleString(),
      icon: '💰',
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Gold Spent',
      value: stats.goldSpent.toLocaleString(),
      icon: '🛒',
      color: 'text-rose-600',
      bg: 'bg-rose-50',
    },
    {
      label: 'Quests Claimed',
      value: stats.questsCompleted.toLocaleString(),
      icon: '📜',
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Battles Won',
      value: stats.battlesWon.toLocaleString(),
      icon: '⚔️',
      color: 'text-red-600',
      bg: 'bg-red-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {cards.map(({ label, value, icon, color, bg }) => (
        <div
          key={label}
          className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center space-y-1"
        >
          <div
            className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full mx-auto ${bg}`}
          >
            {icon}
          </div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Activity Breakdown ────────────────────────────────────────────────────────

function ActivityBreakdown({
  data,
}: {
  data: { type: string; color: string; logs: number; amount: number; unit: string }[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard title="Activity Breakdown">
        <p className="text-sm text-gray-400 text-center py-6">
          No activities logged in this period.
        </p>
      </ChartCard>
    );
  }

  const maxLogs = Math.max(...data.map((d) => d.logs), 1);

  return (
    <ChartCard title="Activity Breakdown">
      <div className="space-y-3">
        {data.map(({ type, color, logs, amount, unit }) => (
          <div key={type} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{type}</span>
                <span className="text-xs text-gray-400">
                  {amount} {unit} · {logs} {logs === 1 ? 'log' : 'logs'}
                </span>
              </div>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    width: `${Math.min(100, (logs / maxLogs) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ── XP Over Time ──────────────────────────────────────────────────────────────

function XpChart({ data }: { data: { date: string; questXp: number; combatXp: number }[] }) {
  const hasData = data.some((d) => d.questXp > 0 || d.combatXp > 0);
  return (
    <ChartCard title="XP Earned Per Day">
      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-6">No XP earned in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(v, name) => [`${v} XP`, name === 'questXp' ? 'Quest XP' : 'Combat XP']}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => (v === 'questXp' ? 'Quest XP' : 'Combat XP')}
            />
            <Bar dataKey="questXp" stackId="a" fill="#6366f1" name="questXp" />
            <Bar
              dataKey="combatXp"
              stackId="a"
              fill="#f97316"
              name="combatXp"
              radius={[2, 2, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ── Activity Frequency Per Day ────────────────────────────────────────────────

function ActivityFrequencyChart({ data }: { data: Record<string, number | string>[] }) {
  const activityTypes = Object.keys(ACTIVITY_DEFINITIONS) as ActivityType[];
  const hasData = data.some((d) => activityTypes.some((t) => (d[t] as number) > 0));

  return (
    <ChartCard title="Activities Logged Per Day">
      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-6">
          No activities logged in this period.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => ACTIVITY_DEFINITIONS[v as ActivityType]?.label ?? String(v)}
            />
            {activityTypes.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="a"
                fill={ACTIVITY_COLORS[type]}
                name={type}
                radius={type === 'nutrition' ? [2, 2, 0, 0] : undefined}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ── Quests Completed Per Day ──────────────────────────────────────────────────

function QuestsChart({ data }: { data: { date: string; quests: number }[] }) {
  const hasData = data.some((d) => d.quests > 0);
  return (
    <ChartCard title="Quests Claimed Per Day">
      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-6">No quests claimed in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              formatter={(v) => [`${v}`, 'Quests Claimed']}
            />
            <Bar dataKey="quests" radius={[4, 4, 0, 0]} name="Quests">
              {data.map((_, i) => (
                <Cell key={i} fill="#10b981" />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

// ── Chart Card wrapper ────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">{title}</p>
      {children}
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function StatsLoading() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-24" />
        ))}
      </div>
      {[200, 200, 200, 180].map((h, i) => (
        <div
          key={i}
          className="bg-white border border-gray-200 rounded-xl p-5"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}
