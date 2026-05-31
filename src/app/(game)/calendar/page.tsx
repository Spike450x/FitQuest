'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCharacter } from '@/hooks/useCharacter';
import { useStatsStore } from '@/store/statsStore';
import { useTodayKey } from '@/hooks/useTodayKey';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { localDayKey, monthMatrix, weekDays, groupLogsByDay } from '@/lib/gameLogic/calendar';
import { ACTIVITY_DEFINITIONS } from '@/lib/gameLogic/constants';
import { ACTIVITY_COLORS, getActivityIconSvg } from '@/lib/activityIcons';
import type { ActivityLog, ActivityType } from '@/types';

type View = 'month' | 'week';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MAX_DOTS = 4;

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

function weekRangeLabel(days: Date[]): string {
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startStr} – ${endStr}`;
}

export default function CalendarPage() {
  const { character, user } = useCharacter();

  if (!character || !user) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Activity Calendar
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          See what you logged, day by day.
        </p>
      </div>

      <CalendarContent uid={user.uid} />
    </div>
  );
}

function CalendarContent({ uid }: { uid: string }) {
  const fetchStatsData = useStatsStore((s) => s.fetchStatsData);
  const activityLogs = useStatsStore((s) => s.activityLogs);
  const loading = useStatsStore((s) => s.loading);
  const retrying = useStatsStore((s) => s.retrying);
  const error = useStatsStore((s) => s.error);

  const [view, setView] = useState<View>('month');
  const [anchor, setAnchor] = useState(() => new Date());
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const todayKey = useTodayKey(); // UTC key; changes at midnight to retrigger this memo
  // eslint-disable-next-line react-hooks/exhaustive-deps -- todayKey is the intended trigger; localDayKey reads the wall clock
  const localTodayKey = useMemo(() => localDayKey(new Date()), [todayKey]);

  useEffect(() => {
    fetchStatsData(uid);
  }, [uid, fetchStatsData]);

  const byDay = useMemo(() => groupLogsByDay(activityLogs), [activityLogs]);

  function shift(delta: number) {
    setAnchor((prev) => {
      const next = new Date(prev);
      if (view === 'month') next.setMonth(next.getMonth() + delta);
      else next.setDate(next.getDate() + delta * 7);
      return next;
    });
  }

  const weeks = useMemo(
    () => (view === 'month' ? monthMatrix(anchor.getFullYear(), anchor.getMonth()) : null),
    [view, anchor],
  );
  const week = useMemo(() => (view === 'week' ? weekDays(anchor) : null), [view, anchor]);

  const heading = view === 'month' ? monthLabel(anchor) : weekRangeLabel(week ?? weekDays(anchor));

  const selectedLogs = selectedKey ? (byDay[selectedKey] ?? []) : [];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
          {(['month', 'week'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2.5 min-h-[40px] rounded-lg text-xs font-medium capitalize transition-colors ${
                view === v
                  ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm'
                  : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
              }`}
            >
              {v}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            aria-label={view === 'month' ? 'Previous month' : 'Previous week'}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="px-3 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 text-xs font-semibold text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => shift(1)}
            aria-label={view === 'month' ? 'Next month' : 'Next week'}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <p className="font-display text-lg font-semibold text-gray-900 dark:text-slate-100">
        {heading}
      </p>

      {retrying && (
        <div className="flex items-center gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
          <span
            className="animate-spin inline-block w-3 h-3 border border-current border-t-transparent rounded-full"
            aria-hidden="true"
          />
          Retrying…
        </div>
      )}

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {error}
        </div>
      ) : loading && activityLogs.length === 0 ? (
        <Skeleton shape="card" height="h-96" />
      ) : view === 'month' && weeks ? (
        <MonthGrid
          weeks={weeks}
          monthIndex={anchor.getMonth()}
          byDay={byDay}
          todayKey={localTodayKey}
          onSelect={setSelectedKey}
        />
      ) : week ? (
        <WeekList week={week} byDay={byDay} todayKey={localTodayKey} onSelect={setSelectedKey} />
      ) : null}

      {activityLogs.length >= 500 && (
        <p className="text-xs text-gray-400 dark:text-slate-500 text-right">
          Showing your most recent 500 activity logs
        </p>
      )}

      <DayDetailModal
        dayKey={selectedKey}
        logs={selectedLogs}
        onClose={() => setSelectedKey(null)}
      />
    </div>
  );
}

// ── Month grid ──────────────────────────────────────────────────────────────

function MonthGrid({
  weeks,
  monthIndex,
  byDay,
  todayKey,
  onSelect,
}: {
  weeks: Date[][];
  monthIndex: number;
  byDay: Record<string, ActivityLog[]>;
  todayKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <Card variant="default" padding="md">
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold text-gray-400 dark:text-slate-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {weeks.flat().map((date) => {
          const key = localDayKey(date);
          const logs = byDay[key] ?? [];
          const inMonth = date.getMonth() === monthIndex;
          const isToday = key === todayKey;
          const hasLogs = logs.length > 0;
          return (
            <button
              key={key}
              onClick={() => hasLogs && onSelect(key)}
              disabled={!hasLogs}
              className={`aspect-square sm:aspect-auto sm:min-h-[68px] flex flex-col items-start gap-1 rounded-lg border p-1.5 text-left transition-colors ${
                isToday
                  ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'border-gray-100 dark:border-slate-800'
              } ${
                inMonth
                  ? 'bg-white dark:bg-slate-900'
                  : 'bg-gray-50/60 dark:bg-slate-950/40 opacity-50'
              } ${hasLogs ? 'hover:border-indigo-300 dark:hover:border-indigo-600 cursor-pointer' : 'cursor-default'}`}
            >
              <span
                className={`text-xs font-semibold ${
                  isToday
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-600 dark:text-slate-400'
                }`}
              >
                {date.getDate()}
              </span>
              <DayDots logs={logs} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function DayDots({ logs }: { logs: ActivityLog[] }) {
  if (logs.length === 0) return null;
  const types = Array.from(new Set(logs.map((l) => l.type)));
  const shown = types.slice(0, MAX_DOTS);
  const extra = types.length - shown.length;
  const synced = logs.some((l) => l.source);
  return (
    <div className="flex flex-wrap items-center gap-1 mt-auto">
      {shown.map((t) => (
        <span
          key={t}
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: ACTIVITY_COLORS[t as ActivityType] ?? '#9ca3af' }}
          title={ACTIVITY_DEFINITIONS[t as ActivityType]?.label ?? t}
        />
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500">+{extra}</span>
      )}
      {synced && <span className="text-[10px] ml-0.5">⌚</span>}
    </div>
  );
}

// ── Week list ─────────────────────────────────────────────────────────────────

function WeekList({
  week,
  byDay,
  todayKey,
  onSelect,
}: {
  week: Date[];
  byDay: Record<string, ActivityLog[]>;
  todayKey: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      {week.map((date) => {
        const key = localDayKey(date);
        const logs = byDay[key] ?? [];
        const isToday = key === todayKey;
        return (
          <Card
            key={key}
            variant="default"
            padding="md"
            className={isToday ? 'border-indigo-400 dark:border-indigo-500' : ''}
          >
            <div className="flex items-center justify-between mb-2">
              <p
                className={`text-sm font-semibold ${
                  isToday
                    ? 'text-indigo-700 dark:text-indigo-300'
                    : 'text-gray-800 dark:text-slate-200'
                }`}
              >
                {date.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
              {logs.length > 0 && (
                <button
                  onClick={() => onSelect(key)}
                  className="text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
                >
                  Details →
                </button>
              )}
            </div>
            {logs.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-slate-500">No activity logged.</p>
            ) : (
              <ul className="space-y-1.5">
                {logs.map((log) => (
                  <ActivityRow key={log.id} log={log} compact />
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ── Day detail modal ────────────────────────────────────────────────────────

function DayDetailModal({
  dayKey,
  logs,
  onClose,
}: {
  dayKey: string | null;
  logs: ActivityLog[];
  onClose: () => void;
}) {
  const open = dayKey !== null;
  const title = dayKey
    ? new Date(`${dayKey}T00:00:00`).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : '';

  return (
    <Modal open={open} onClose={onClose} size="md" ariaLabel="Activity details">
      <div className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold text-gray-900 dark:text-slate-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 text-xl leading-none"
          >
            ×
          </button>
        </div>
        {logs.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-slate-500">No activity logged.</p>
        ) : (
          <ul className="space-y-2">
            {logs
              .slice()
              .sort((a, b) => a.loggedAt - b.loggedAt)
              .map((log) => (
                <ActivityRow key={log.id} log={log} />
              ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}

// ── Shared activity row ───────────────────────────────────────────────────────

function ActivityRow({ log, compact = false }: { log: ActivityLog; compact?: boolean }) {
  const def = ACTIVITY_DEFINITIONS[log.type];
  const amount = Number((log.data as { amount?: number }).amount ?? 0);
  const time = new Date(log.loggedAt).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  return (
    <li className="flex items-center gap-3">
      <span
        className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style={{ backgroundColor: `${ACTIVITY_COLORS[log.type] ?? '#9ca3af'}1a` }}
      >
        <span style={{ color: ACTIVITY_COLORS[log.type] ?? '#9ca3af' }}>
          {getActivityIconSvg(log.type, 'w-4 h-4')}
        </span>
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-slate-100">
          {def?.label ?? log.type}
          {log.source && (
            <span className="ml-2 text-[10px] font-semibold text-sky-600 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 rounded px-1.5 py-0.5">
              ⌚ synced
            </span>
          )}
        </p>
        {!compact && (
          <p className="text-xs text-gray-400 dark:text-slate-500">
            {amount} {def?.unit ?? ''} · {time}
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-gray-500 dark:text-slate-400">
          {amount} {compact ? (def?.unit ?? '') : ''}
        </p>
        {log.xpGained > 0 && (
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">
            +{log.xpGained} XP
          </p>
        )}
      </div>
    </li>
  );
}
