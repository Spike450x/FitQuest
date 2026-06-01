import {
  StrengthIcon,
  WisdomIcon,
  AgilityIcon,
  SpiritIcon,
  StaminaIcon,
  HealthIcon,
  DefenseIcon,
} from '@/components/art/stat-icons';
import type { Stats } from '@/types';

export interface StatBarConfig {
  key: keyof Stats;
  label: string;
  icon: React.ReactNode;
  /** Tailwind bg-* class for the bar fill. */
  color: string;
}

/**
 * Single source of truth for the seven stat bars (icon + color + label). Shared
 * by the character card and the dashboard so the two surfaces render the same
 * stats in the same order with the same colors.
 */
export const STAT_BAR_CONFIG: StatBarConfig[] = [
  {
    key: 'strength',
    label: 'Strength',
    icon: <StrengthIcon className="w-4 h-4 text-red-500" />,
    color: 'bg-red-400',
  },
  {
    key: 'wisdom',
    label: 'Wisdom',
    icon: <WisdomIcon className="w-4 h-4 text-blue-500" />,
    color: 'bg-blue-400',
  },
  {
    key: 'agility',
    label: 'Agility',
    icon: <AgilityIcon className="w-4 h-4 text-teal-500" />,
    color: 'bg-teal-400',
  },
  {
    key: 'spirit',
    label: 'Spirit',
    icon: <SpiritIcon className="w-4 h-4 text-violet-500" />,
    color: 'bg-violet-400',
  },
  {
    key: 'stamina',
    label: 'Stamina',
    icon: <StaminaIcon className="w-4 h-4 text-amber-500" />,
    color: 'bg-amber-400',
  },
  {
    key: 'health',
    label: 'Health',
    icon: <HealthIcon className="w-4 h-4 text-pink-500" />,
    color: 'bg-pink-400',
  },
  {
    key: 'defense',
    label: 'Defense',
    icon: <DefenseIcon className="w-4 h-4 text-indigo-500" />,
    color: 'bg-indigo-400',
  },
];

/** Max value a single stat can reach (used for bar scaling). */
export const STAT_BAR_MAX = 50;
