import { type SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & { className?: string };

function svgIcon(displayName: string, paths: React.ReactNode): React.FC<IconProps> {
  function Icon({ className = 'w-4 h-4', ...props }: IconProps) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden
        {...props}
      >
        {paths}
      </svg>
    );
  }
  Icon.displayName = displayName;
  return Icon;
}

// ─── Quick-action icons ───────────────────────────────────────────────────────

export const LogActivityIcon = svgIcon(
  'LogActivityIcon',
  <>
    <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </>,
);

export const CombatIcon = svgIcon(
  'CombatIcon',
  <>
    <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
    <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
    <path d="M8 20v2h8v-2" />
    <path d="M12.5 17l-.5-1-.5 1h1z" fill="currentColor" stroke="none" />
    <path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20" />
  </>,
);

export const QuestIcon = svgIcon(
  'QuestIcon',
  <>
    <path d="M15 12h-5" />
    <path d="M15 8h-5" />
    <path d="M19 17V5a2 2 0 0 0-2-2H4" />
    <path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3" />
  </>,
);

export const ShopIcon = svgIcon(
  'ShopIcon',
  <>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </>,
);

// ─── Activity-type icons ──────────────────────────────────────────────────────

export const RunIcon = svgIcon(
  'RunIcon',
  <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />,
);

export const WorkoutIcon = svgIcon(
  'WorkoutIcon',
  <>
    <path d="m6.5 6.5 11 11" />
    <path d="m21 21-1-1" />
    <path d="m3 3 1 1" />
    <path d="m18 22 4-4" />
    <path d="m2 6 4-4" />
    <path d="m3 10 7-7" />
    <path d="m14 21 7-7" />
  </>,
);

export const StepsIcon = svgIcon(
  'StepsIcon',
  <>
    <path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5c0 6-3 6-3 9v3" />
    <path d="M20 16v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 2 14 3.8 14 5c0 6 3 6 3 9v3" />
    <path d="M7 20h4" />
    <path d="M13 20h4" />
    <path d="M4 20v2" />
    <path d="M10 20v2" />
    <path d="M14 20v2" />
    <path d="M20 20v2" />
  </>,
);

export const SleepIcon = svgIcon('SleepIcon', <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />);

export const WaterIcon = svgIcon(
  'WaterIcon',
  <path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z" />,
);

export const NutritionIcon = svgIcon(
  'NutritionIcon',
  <>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
    <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
  </>,
);

export const MeditationIcon = svgIcon(
  'MeditationIcon',
  <>
    {/* Head */}
    <circle cx="12" cy="6" r="2" />
    {/* Torso + crossed legs (lotus pose silhouette) */}
    <path d="M12 9c-2 0-3.5 1.6-3.5 3.6 0 1 .5 2 1.2 2.6" />
    <path d="M12 9c2 0 3.5 1.6 3.5 3.6 0 1-.5 2-1.2 2.6" />
    <path d="M5 18c1.5-2 4-3 7-3s5.5 1 7 3" />
    {/* Hands resting in lap */}
    <path d="M10 15c.6.4 1.3.6 2 .6s1.4-.2 2-.6" />
    {/* Aura / breath glyph */}
    <path d="M12 2v1" />
  </>,
);
