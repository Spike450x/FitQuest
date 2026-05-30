'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { label: 'Achievements', href: '/collections' },
  { label: 'Bestiary', href: '/collections/bestiary' },
  { label: 'Collection', href: '/collections/collection' },
] as const;

export function CollectionsTabs() {
  const pathname = usePathname();

  return (
    <div className="flex gap-1 bg-gray-100 dark:bg-slate-800 rounded-xl p-1 w-fit max-w-full overflow-x-auto">
      {TABS.map(({ label, href }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`px-4 py-2.5 min-h-[40px] flex items-center rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
              active
                ? 'bg-white dark:bg-slate-900 text-indigo-700 dark:text-indigo-300 shadow-sm'
                : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
