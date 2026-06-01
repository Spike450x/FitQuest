import {
  ClipboardList,
  Skull,
  ScrollText,
  Store,
  Target,
  Backpack,
  BarChart3,
  CalendarDays,
  Trophy,
  Swords,
  type LucideIcon,
} from 'lucide-react';

/**
 * Catalog of destinations the dashboard "Quick Actions" grid can surface. The
 * player pins a subset (see `uiPrefsStore`); the tiles render in pinned order.
 * Mirrors the bottom-nav icon vocabulary (`navConfig`) so a pinned tile and its
 * nav entry read as the same destination.
 */
export interface QuickAction {
  id: string;
  href: string;
  label: string;
  /** One-line "why tap this" helper shown under the label. */
  desc: string;
  Icon: LucideIcon;
}

export const QUICK_ACTION_CATALOG: QuickAction[] = [
  {
    id: 'log',
    href: '/activities',
    label: 'Log Activity',
    desc: 'Earn XP & stats',
    Icon: ClipboardList,
  },
  { id: 'combat', href: '/combat', label: 'Fight a Monster', desc: 'Win gold & loot', Icon: Skull },
  {
    id: 'quests',
    href: '/quests',
    label: 'View Quests',
    desc: 'Track your goals',
    Icon: ScrollText,
  },
  { id: 'shop', href: '/shop', label: 'Visit Shop', desc: 'Spend your gold', Icon: Store },
  { id: 'wanted', href: '/wanted', label: 'Wanted Board', desc: 'Earn reputation', Icon: Target },
  {
    id: 'inventory',
    href: '/inventory',
    label: 'Inventory',
    desc: 'Manage your gear',
    Icon: Backpack,
  },
  { id: 'stats', href: '/stats', label: 'Stats', desc: 'Review your trends', Icon: BarChart3 },
  {
    id: 'calendar',
    href: '/calendar',
    label: 'Calendar',
    desc: 'See your history',
    Icon: CalendarDays,
  },
  {
    id: 'collections',
    href: '/collections',
    label: 'Collections',
    desc: 'Badges & bestiary',
    Icon: Trophy,
  },
  {
    id: 'character',
    href: '/character',
    label: 'Character',
    desc: 'Your full sheet',
    Icon: Swords,
  },
];

/** Default pinned set — the four classic dashboard actions. */
export const DEFAULT_PINNED_ACTIONS = ['log', 'combat', 'quests', 'shop'];

/** Max / min tiles the player can pin. */
export const MAX_PINNED_ACTIONS = 6;
export const MIN_PINNED_ACTIONS = 2;

const BY_ID = new Map(QUICK_ACTION_CATALOG.map((a) => [a.id, a]));

/** All valid quick-action ids — used to prune stale persisted prefs. */
export const ALL_QUICK_ACTION_IDS = QUICK_ACTION_CATALOG.map((a) => a.id) as readonly string[];

/**
 * Resolve an ordered list of pinned ids to their catalog entries, dropping any
 * unknown ids. Falls back to the defaults if nothing valid remains.
 */
export function resolvePinnedActions(ids: string[]): QuickAction[] {
  const resolved = ids.map((id) => BY_ID.get(id)).filter((a): a is QuickAction => Boolean(a));
  if (resolved.length === 0) {
    return DEFAULT_PINNED_ACTIONS.map((id) => BY_ID.get(id)).filter((a): a is QuickAction =>
      Boolean(a),
    );
  }
  return resolved;
}

export function getQuickAction(id: string): QuickAction | undefined {
  return BY_ID.get(id);
}
