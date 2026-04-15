"use client";

import { useEffect, useState, useMemo } from "react";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterStore } from "@/store/characterStore";
import { getItemById } from "@/lib/gameLogic/items";
import { ACTIVITY_DEFINITIONS } from "@/lib/gameLogic/constants";
import type { ActivityLog, ActiveQuest, InventoryItem, ActivityType } from "@/types";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Config ───────────────────────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  workout: "#6366f1",
  run:     "#f97316",
  steps:   "#10b981",
  sleep:   "#8b5cf6",
  water:   "#3b82f6",
  nutrition: "#22c55e",
};

const ACTIVITY_LABELS: Record<ActivityType, string> = {
  workout:   "Workout",
  run:       "Run",
  steps:     "Steps",
  sleep:     "Sleep",
  water:     "Water",
  nutrition: "Nutrition",
};

type Range = "7d" | "30d" | "all";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dayLabel(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfRange(range: Range): number {
  if (range === "all") return 0;
  const days = range === "7d" ? 7 : 30;
  const d = new Date();
  d.setDate(d.getDate() - days + 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

// Build a list of date labels for the range (so gaps show as zero)
function buildDateBuckets(range: Range): string[] {
  if (range === "all") return []; // computed dynamically for "all"
  const days = range === "7d" ? 7 : 30;
  const buckets: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    buckets.push(dayLabel(d.getTime()));
  }
  return buckets;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<"account" | "stats">("account");
  const { character, user } = useCharacter();

  if (!character || !user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-1">{character.name} · Level {character.level} {character.class}</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["account", "stats"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "account" ? "⚙️ Account" : "📊 Stats"}
          </button>
        ))}
      </div>

      {activeTab === "account" ? (
        <AccountTab character={character} user={user} />
      ) : (
        <StatsTab uid={user.uid} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNT TAB
// ═══════════════════════════════════════════════════════════════════════════════

function AccountTab({
  character,
  user,
}: {
  character: import("@/types").Character;
  user: import("firebase/auth").User;
}) {
  return (
    <div className="space-y-4">
      <ChangeNameForm character={character} />
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

// ── Change Name ───────────────────────────────────────────────────────────────

function ChangeNameForm({ character }: { character: import("@/types").Character }) {
  const updateCharacterStore = useCharacterStore((s) => s.fetchCharacter);
  const [name, setName] = useState(character.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "characters", character.uid), { name: trimmed });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      }
      // Re-sync local store
      await updateCharacterStore(character.uid);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Character Name" description="Your in-game display name">
      <form onSubmit={handleSave} className="space-y-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim() || name.trim() === character.name}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Name"}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Change Email ──────────────────────────────────────────────────────────────

function ChangeEmailForm({ user }: { user: import("firebase/auth").User }) {
  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || trimmed === user.email) return;
    setSaving(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, trimmed);
      setSaved(true);
      setPassword("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/wrong-password") setError("Incorrect current password.");
      else if (code === "auth/email-already-in-use") setError("That email is already in use.");
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Email Address" description="Changing email requires your current password">
      <form onSubmit={handleSave} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="New email address"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Current password to confirm"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !email.trim() || !password || email.trim() === user.email}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "Updating…" : saved ? "✓ Updated" : "Update Email"}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordForm({ user }: { user: import("firebase/auth").User }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords do not match."); return; }
    if (next.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(user.email!, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      setSaved(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/wrong-password") setError("Incorrect current password.");
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Password" description="Must be at least 6 characters">
      <form onSubmit={handleSave} className="space-y-3">
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? "Updating…" : saved ? "✓ Updated" : "Change Password"}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Settings Card wrapper ─────────────────────────────────────────────────────

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATS TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface RawStats {
  logs: ActivityLog[];
  quests: ActiveQuest[];
  inventory: InventoryItem[];
}

function StatsTab({ uid }: { uid: string }) {
  const [range, setRange] = useState<Range>("30d");
  const [raw, setRaw] = useState<RawStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [logsSnap, questsSnap, invSnap] = await Promise.all([
          getDocs(query(collection(db, "activityLogs"), where("uid", "==", uid))),
          getDocs(query(collection(db, "activeQuests"), where("uid", "==", uid))),
          getDocs(query(collection(db, "inventory"), where("uid", "==", uid))),
        ]);
        setRaw({
          logs: logsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityLog)),
          quests: questsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ActiveQuest)),
          inventory: invSnap.docs.map((d) => ({ id: d.id, ...d.data() } as InventoryItem)),
        });
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
    const claimed = raw.quests.filter(
      (q) => q.claimedAt !== null && (q.claimedAt ?? 0) >= cutoff
    );
    const purchases = raw.inventory.filter((i) => i.acquiredAt >= cutoff);

    // Overview totals
    const totalXp = logs.reduce((s, l) => s + (l.xpGained ?? 0), 0);
    const goldFromQuests = claimed.reduce((s, q) => s + (q.rewards?.gold ?? 0), 0);
    const goldSpent = purchases.reduce((s, i) => {
      const def = getItemById(i.itemDefId);
      return s + (def?.price ?? 0);
    }, 0);
    const questsCompleted = claimed.length;

    // XP by day
    const xpByDay: Record<string, number> = {};
    for (const l of logs) {
      const label = dayLabel(l.loggedAt);
      xpByDay[label] = (xpByDay[label] ?? 0) + (l.xpGained ?? 0);
    }

    // Activity breakdown by type
    const byType: Record<string, { count: number; xp: number; amount: number }> = {};
    for (const l of logs) {
      const t = l.type;
      if (!byType[t]) byType[t] = { count: 0, xp: 0, amount: 0 };
      byType[t].count++;
      byType[t].xp += l.xpGained ?? 0;
      byType[t].amount += (l.data as { amount?: number }).amount ?? 0;
    }

    // Logs per day per type (stacked bar)
    const actByDay: Record<string, Record<string, number>> = {};
    for (const l of logs) {
      const label = dayLabel(l.loggedAt);
      if (!actByDay[label]) actByDay[label] = {};
      actByDay[label][l.type] = (actByDay[label][l.type] ?? 0) + 1;
    }

    // Quests completed per day
    const questsByDay: Record<string, number> = {};
    for (const q of claimed) {
      if (!q.claimedAt) continue;
      const label = dayLabel(q.claimedAt);
      questsByDay[label] = (questsByDay[label] ?? 0) + 1;
    }

    // Build ordered date axis
    const buckets = range !== "all" ? buildDateBuckets(range) : null;
    const allDays = buckets ?? Array.from(
      new Set([
        ...Object.keys(xpByDay),
        ...Object.keys(actByDay),
        ...Object.keys(questsByDay),
      ])
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    const xpChartData = allDays.map((d) => ({ date: d, xp: xpByDay[d] ?? 0 }));

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
      .sort((a, b) => b[1].xp - a[1].xp)
      .map(([type, v]) => ({
        type: ACTIVITY_LABELS[type as ActivityType] ?? type,
        color: ACTIVITY_COLORS[type as ActivityType] ?? "#6b7280",
        logs: v.count,
        xp: v.xp,
        amount: Math.round(v.amount * 10) / 10,
        unit: ACTIVITY_DEFINITIONS[type as keyof typeof ACTIVITY_DEFINITIONS]?.unit ?? "",
      }));

    return {
      totalXp,
      goldFromQuests,
      goldSpent,
      questsCompleted,
      xpChartData,
      actChartData,
      questChartData,
      breakdownData,
    };
  }, [raw, range]);

  const RANGES: { value: Range; label: string }[] = [
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
    { value: "all", label: "All time" },
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
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading || !stats ? (
        <StatsLoading />
      ) : (
        <>
          <OverviewCards stats={stats} />
          <ActivityBreakdown data={stats.breakdownData} />
          <XpChart data={stats.xpChartData} />
          <ActivityFrequencyChart data={stats.actChartData} />
          <QuestsChart data={stats.questChartData} />
        </>
      )}
    </div>
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
  };
}) {
  const cards = [
    { label: "XP Earned", value: stats.totalXp.toLocaleString(), icon: "⭐", color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "Gold from Quests", value: stats.goldFromQuests.toLocaleString(), icon: "💰", color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Gold Spent", value: stats.goldSpent.toLocaleString(), icon: "🛒", color: "text-rose-600", bg: "bg-rose-50" },
    { label: "Quests Claimed", value: stats.questsCompleted.toLocaleString(), icon: "📜", color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map(({ label, value, icon, color, bg }) => (
        <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm text-center space-y-1">
          <div className={`text-2xl w-10 h-10 flex items-center justify-center rounded-full mx-auto ${bg}`}>
            {icon}
          </div>
          <p className={`text-xl font-bold ${color}`}>{value}</p>
          <p className="text-xs text-gray-400">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ── Activity Breakdown Table ──────────────────────────────────────────────────

function ActivityBreakdown({
  data,
}: {
  data: { type: string; color: string; logs: number; xp: number; amount: number; unit: string }[];
}) {
  if (data.length === 0) {
    return (
      <ChartCard title="Activity Breakdown">
        <p className="text-sm text-gray-400 text-center py-6">No activities logged in this period.</p>
      </ChartCard>
    );
  }

  return (
    <ChartCard title="Activity Breakdown">
      <div className="space-y-3">
        {data.map(({ type, color, logs, xp, amount, unit }) => (
          <div key={type} className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-800">{type}</span>
                <span className="text-xs text-gray-400">
                  {amount} {unit} · {logs} {logs === 1 ? "log" : "logs"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-1.5 rounded-full"
                    style={{
                      backgroundColor: color,
                      width: `${Math.min(100, (xp / Math.max(...data.map((d) => d.xp))) * 100)}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-semibold text-indigo-600 w-16 text-right">
                  +{xp} XP
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ── XP Over Time ──────────────────────────────────────────────────────────────

function XpChart({ data }: { data: { date: string; xp: number }[] }) {
  const hasData = data.some((d) => d.xp > 0);
  return (
    <ChartCard title="XP Earned Per Day">
      {!hasData ? (
        <p className="text-sm text-gray-400 text-center py-6">No XP earned in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v) => [`${v} XP`, "XP Earned"]}
            />
            <Line
              type="monotone"
              dataKey="xp"
              stroke="#6366f1"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: "#6366f1" }}
            />
          </LineChart>
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
        <p className="text-sm text-gray-400 text-center py-6">No activities logged in this period.</p>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
              formatter={(v) => ACTIVITY_LABELS[v as ActivityType] ?? v}
            />
            {activityTypes.map((type) => (
              <Bar
                key={type}
                dataKey={type}
                stackId="a"
                fill={ACTIVITY_COLORS[type]}
                name={type}
                radius={type === "nutrition" ? [2, 2, 0, 0] : undefined}
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
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
              formatter={(v) => [`${v}`, "Quests Claimed"]}
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
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-5" style={{ height: h }} />
      ))}
    </div>
  );
}
