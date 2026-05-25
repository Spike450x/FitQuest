interface StatBarProps {
  label: string;
  value: number;
  max?: number;
  color: string;
  icon: React.ReactNode;
  showMax?: boolean;
  suffix?: string;
}

export function StatBar({
  label,
  value,
  max = 60,
  color,
  icon,
  showMax = true,
  suffix,
}: StatBarProps) {
  const pct = Math.min((value / max) * 100, 100);

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-sm">
        <span className="flex items-center gap-1.5 text-gray-700 dark:text-slate-200">
          <span>{icon}</span>
          <span className="font-medium">{label}</span>
          {suffix && <span className="text-xs text-emerald-600 font-medium">({suffix})</span>}
        </span>
        <span className="text-gray-700 dark:text-slate-200 font-semibold text-sm tabular-nums">
          {value}
          {showMax && (
            <span className="text-gray-400 dark:text-slate-500 font-normal text-xs"> / {max}</span>
          )}
        </span>
      </div>
      <div className="w-full bg-gray-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
