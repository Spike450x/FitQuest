'use client';

export type ActionButtonColor =
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'emerald'
  | 'rose'
  | 'sky'
  | 'slate';

export function ActionButton({
  label,
  sublabel,
  onClick,
  loading,
  disabled,
  color,
  fullWidth,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  color: ActionButtonColor;
  fullWidth?: boolean;
}) {
  const base =
    'rounded-xl py-3 px-4 transition-colors text-left disabled:opacity-40 disabled:cursor-not-allowed';
  const colors: Record<ActionButtonColor, string> = {
    indigo: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    violet: 'bg-violet-600 hover:bg-violet-700 text-white',
    amber: 'bg-amber-500 hover:bg-amber-600 text-white',
    emerald: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    rose: 'bg-rose-600 hover:bg-rose-700 text-white',
    sky: 'bg-sky-500 hover:bg-sky-600 text-white',
    slate: 'bg-slate-600 hover:bg-slate-700 text-white',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${colors[color]} ${fullWidth ? 'w-full' : ''}`}
    >
      <p className="font-bold text-sm">{loading ? 'Rolling…' : label}</p>
      <p className="text-xs opacity-70 mt-0.5">{sublabel}</p>
    </button>
  );
}
