import { StrengthIcon, WisdomIcon, AgilityIcon, SpiritIcon } from '@/components/art/stat-icons';
import type { Stats } from '@/types';

export interface StatBarConfig {
  key: keyof Stats;
  label: string;
  icon: React.ReactNode;
  /** Tailwind bg-* class for the bar fill. */
  color: string;
}

/**
 * The four CORE stats shown as allocation bars (icon + color + label). Shared by
 * the character card and the dashboard so the two surfaces render the same stats
 * in the same order with the same colors.
 *
 * Deliberately excludes Stamina, Health, and Defense — those are the
 * survivability group: Stamina + Health drive the HP / Stamina pools and Magic
 * comes from Wisdom, all surfaced via `ResourceBars` (HP / Stamina / Magic), and
 * Defense reduces incoming damage. Rendering them as identical `/50` bars
 * alongside the core attack/utility stats double-counts the resources and
 * misrepresents how they work, so they live with the resources and the
 * character sheet's Class Traits instead.
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
];

/** Max value a single stat can reach (used for bar scaling). */
export const STAT_BAR_MAX = 50;
