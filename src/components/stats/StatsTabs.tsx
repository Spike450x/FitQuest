'use client';

import Link from 'next/link';

type StatsTab = 'overview' | 'bestiary' | 'collection';

const TABS: { value: StatsTab; label: string; href: string }[] = [
  { value: 'overview', label: 'Overview', href: '/stats' },
  { value: 'bestiary', label: 'Bestiary', href: '/stats/bestiary' },
  { value: 'collection', label: 'Collection', href: '/stats/collection' },
];

/**
 * Segmented tab switcher shared by the three stats surfaces (Overview /
 * Bestiary / Collection). Link-based so each tab is its own route — matches
 * the range-filter visual style on the stats overview page.
 */
export function StatsTabs({ active }: { active: StatsTab }) {
  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit">
      {TABS.map(({ value, label, href }) => (
        <Link
          key={value}
          href={href}
          className={`px-4 py-2.5 min-h-[40px] flex items-center rounded-lg text-xs font-medium transition-colors ${
            active === value
              ? 'bg-white dark:bg-slate-900 text-indigo-700 shadow-sm'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
          }`}
        >
          {label}
        </Link>
      ))}
    </div>
  );
}
