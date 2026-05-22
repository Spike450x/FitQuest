'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  Swords,
  ClipboardList,
  Skull,
  ScrollText,
  Backpack,
  Store,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { logOut } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { XPBar } from '@/components/ui/XPBar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LevelUpCelebration } from '@/components/character/LevelUpCelebration';
import { playerMaxHp, totalGearBonuses } from '@/lib/gameLogic/combat';

type NavItem = { href: string; label: string; Icon: LucideIcon };

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', Icon: Home },
  { href: '/character', label: 'Character', Icon: Swords },
  { href: '/activities', label: 'Activities', Icon: ClipboardList },
  { href: '/combat', label: 'Combat', Icon: Skull },
  { href: '/quests', label: 'Quests', Icon: ScrollText },
  { href: '/inventory', label: 'Inventory', Icon: Backpack },
  { href: '/shop', label: 'Shop', Icon: Store },
  { href: '/stats', label: 'Stats', Icon: BarChart3 },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { character, loading } = useCharacter();
  const [collapsed, setCollapsed] = useState(true);

  async function handleSignOut() {
    await logOut();
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-slate-950 dark:text-slate-100 flex flex-col transition-colors">
      {/* Global level-up celebration — fires whenever character.level increases */}
      <LevelUpCelebration />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-20 h-14 shadow-sm shadow-gray-900/5 dark:shadow-black/30">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-display text-indigo-600 dark:text-indigo-300 font-bold text-xl tracking-tight shrink-0 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
          >
            FitQuest
          </Link>

          {/* XP bar */}
          {character && !loading && (
            <div className="flex-1 max-w-sm hidden sm:block">
              <XPBar
                xp={character.xp}
                level={character.level}
                xpToNextLevel={character.xpToNextLevel}
              />
            </div>
          )}

          {/* Right-side stats + actions */}
          <div className="flex items-center gap-3">
            {character && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500 dark:text-slate-400">
                {(() => {
                  const gearBonuses = totalGearBonuses(character.equippedGear);
                  const maxHp = playerMaxHp(character);
                  const defense = (character.stats.defense ?? 0) + (gearBonuses.defense ?? 0);
                  return (
                    <>
                      <span>
                        ❤️{' '}
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {character.currentHp ?? maxHp}/{maxHp}
                        </span>
                      </span>
                      <span className="text-gray-300 dark:text-slate-600">·</span>
                      <span>
                        🛡️{' '}
                        <span className="font-semibold text-gray-700 dark:text-slate-200">
                          {defense}
                        </span>
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            {character && <GoldDisplay amount={character.gold} size="sm" />}
            <ThemeToggle className="hidden sm:inline-flex" />
            {character && (
              <Link
                href="/profile"
                title="Profile"
                aria-label={`Profile (${character.name})`}
                aria-current={pathname === '/profile' ? 'page' : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border ${
                  pathname === '/profile'
                    ? 'bg-indigo-600 text-white border-indigo-600 dark:bg-indigo-500 dark:border-indigo-500'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 dark:hover:bg-indigo-900/40 dark:hover:border-indigo-700 dark:hover:text-indigo-300'
                }`}
              >
                {character.name.charAt(0).toUpperCase()}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-700 dark:text-slate-500 dark:hover:text-slate-200 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1">
        {/* ── Sidebar (desktop) ─────────────────────────────────────────────── */}
        <aside
          className={`
            hidden md:flex flex-col shrink-0
            bg-white/70 dark:bg-slate-950/70 backdrop-blur-lg border-r border-gray-200/80 dark:border-slate-800/80
            sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto
            transition-all duration-200 ease-in-out
            ${collapsed ? 'w-14' : 'w-44'}
          `}
        >
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
            aria-expanded={!collapsed}
            className="flex items-center justify-center h-9 border-b border-gray-100 dark:border-slate-800 hover:bg-gray-50 dark:hover:bg-slate-900 transition-colors text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 shrink-0"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className={`w-4 h-4 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
            </svg>
          </button>

          {/* Nav links */}
          <nav className="flex-1 py-2 px-1.5 space-y-0.5" aria-label="Primary">
            {NAV_ITEMS.map(({ href, label, Icon }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  aria-label={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`
                    flex items-center gap-2.5 rounded-lg text-sm transition-colors
                    ${collapsed ? 'justify-center px-0 py-2.5' : 'px-3 py-2'}
                    ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 font-medium border border-indigo-100 dark:bg-indigo-900/40 dark:text-indigo-200 dark:border-indigo-800'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent dark:text-slate-400 dark:hover:text-slate-100 dark:hover:bg-slate-800/60'
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" aria-hidden="true" strokeWidth={2} />
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 min-w-0 py-6 px-4 sm:px-6 pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl backdrop-saturate-150 border-t border-gray-200/80 dark:border-slate-800/80 z-10 shadow-lg shadow-gray-900/5 dark:shadow-black/40"
        aria-label="Primary"
      >
        <ul className="flex justify-around overflow-x-auto">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <li key={href} className="flex-1 min-w-0">
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-all ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-300 scale-105'
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="w-5 h-5" aria-hidden="true" strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate w-full text-center">{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
