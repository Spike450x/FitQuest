'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useCharacter } from '@/hooks/useCharacter';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { XPBar } from '@/components/ui/XPBar';
import { LevelUpCelebration } from '@/components/character/LevelUpCelebration';
import { playerMaxHp, totalGearBonuses } from '@/lib/gameLogic/combat';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: '🏠' },
  { href: '/character', label: 'Character', icon: '⚔️' },
  { href: '/activities', label: 'Activities', icon: '📋' },
  { href: '/combat', label: 'Combat', icon: '🐉' },
  { href: '/quests', label: 'Quests', icon: '📜' },
  { href: '/inventory', label: 'Inventory', icon: '🎒' },
  { href: '/shop', label: 'Shop', icon: '🏪' },
  { href: '/stats', label: 'Stats', icon: '📊' },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { character, loading } = useCharacter();
  const [collapsed, setCollapsed] = useState(true);

  async function handleSignOut() {
    await signOut(auth);
    router.push('/login');
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">
      {/* Global level-up celebration — fires whenever character.level increases */}
      <LevelUpCelebration />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-20 h-14">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-indigo-600 font-bold text-lg tracking-tight shrink-0"
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
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                {(() => {
                  const gearBonuses = totalGearBonuses(character.equippedGear);
                  const maxHp = playerMaxHp(character);
                  const defense = (character.stats.defense ?? 0) + (gearBonuses.defense ?? 0);
                  return (
                    <>
                      <span>
                        ❤️{' '}
                        <span className="font-semibold text-gray-700">
                          {character.currentHp ?? maxHp}/{maxHp}
                        </span>
                      </span>
                      <span className="text-gray-300">·</span>
                      <span>
                        🛡️ <span className="font-semibold text-gray-700">{defense}</span>
                      </span>
                    </>
                  );
                })()}
              </div>
            )}
            {character && <GoldDisplay amount={character.gold} size="sm" />}
            {character && (
              <Link
                href="/profile"
                title="Profile"
                aria-label={`Profile (${character.name})`}
                aria-current={pathname === '/profile' ? 'page' : undefined}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border ${
                  pathname === '/profile'
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700'
                }`}
              >
                {character.name.charAt(0).toUpperCase()}
              </Link>
            )}
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
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
            bg-white border-r border-gray-200
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
            className="flex items-center justify-center h-9 border-b border-gray-100 hover:bg-gray-50 transition-colors text-gray-400 hover:text-gray-600 shrink-0"
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
            {NAV_ITEMS.map(({ href, label, icon }) => {
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
                        ? 'bg-indigo-50 text-indigo-700 font-medium border border-indigo-100'
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-transparent'
                    }
                  `}
                >
                  <span className="text-base leading-none shrink-0" aria-hidden="true">
                    {icon}
                  </span>
                  {!collapsed && <span className="truncate">{label}</span>}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 min-w-0 py-6 px-4 sm:px-6">
          {children}
        </main>
      </div>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 z-10"
        aria-label="Primary"
      >
        <ul className="flex justify-around">
          {NAV_ITEMS.slice(0, 5).map(({ href, label, icon }) => {
            const active = pathname === href;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={`flex flex-col items-center py-2 px-3 text-xs transition-colors ${
                    active ? 'text-indigo-600' : 'text-gray-400'
                  }`}
                >
                  <span className="text-lg" aria-hidden="true">
                    {icon}
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
