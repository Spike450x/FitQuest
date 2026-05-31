import {
  Home,
  Swords,
  ClipboardList,
  Skull,
  ScrollText,
  Target,
  Backpack,
  Store,
  BarChart3,
  Trophy,
  type LucideIcon,
} from 'lucide-react';

export type NavItem = { href: string; label: string; Icon: LucideIcon };

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/character', label: 'Character', Icon: Swords },
  { href: '/activities', label: 'Activities', Icon: ClipboardList },
  { href: '/combat', label: 'Combat', Icon: Skull },
  { href: '/quests', label: 'Quests', Icon: ScrollText },
  { href: '/wanted', label: 'Wanted Board', Icon: Target },
  { href: '/inventory', label: 'Inventory', Icon: Backpack },
  { href: '/shop', label: 'Shop', Icon: Store },
  { href: '/stats', label: 'Stats', Icon: BarChart3 },
  { href: '/collections', label: 'Collections', Icon: Trophy },
];

// Single source of truth — derived so it can never drift from NAV_ITEMS.
export const ALL_NAV_HREFS = NAV_ITEMS.map((i) => i.href) as readonly string[];
