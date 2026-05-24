'use client';

/**
 * Player resource bar used by combat and dungeon screens. Two variants:
 *   - "full" — labelled bar with sub-text (arena combat HP/Stamina/Magic).
 *   - "mini" — compact 1-line bar with auto-tinting for low/critical (dungeon
 *     run resource strip).
 */
export function HpBar({
  label,
  current,
  max,
  color,
  sub,
  variant = 'full',
}: {
  label: string;
  current: number;
  max: number;
  color: string;
  sub?: string;
  variant?: 'full' | 'mini';
}) {
  const pct = Math.max(0, Math.min(100, (current / max) * 100));

  if (variant === 'mini') {
    const isLow = pct < 30;
    const isCritical = pct < 15;
    const barColor = isCritical ? 'bg-red-500' : isLow ? 'bg-amber-400' : color;
    return (
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-0.5">
          <span className="text-slate-400">{label}</span>
          <span
            className={`font-semibold ${
              isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-slate-300'
            }`}
          >
            {current}/{max}
          </span>
        </div>
        <div className="bg-slate-700 rounded-full h-1.5">
          <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 dark:text-slate-400 mb-1">
        <span className="font-medium">{label}</span>
        <span className="font-mono font-semibold text-gray-700 dark:text-slate-200">
          {current} / {max}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {sub && <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{sub}</p>}
    </div>
  );
}
