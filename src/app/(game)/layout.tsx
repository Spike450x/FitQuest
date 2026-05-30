'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { AnimatePresence, motion, Reorder, useReducedMotion } from 'framer-motion';
import { MoreHorizontal, Settings, GripVertical, X } from 'lucide-react';
import { NAV_ITEMS, type NavItem } from '@/lib/navConfig';
import { logOut } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { useCollectionAchievementSync } from '@/hooks/useCollectionAchievementSync';
import { useDailyLoginBonus } from '@/hooks/useDailyLoginBonus';
import { useNavPreferenceStore, MAX_PINNED } from '@/store/navPreferenceStore';
import { useActivityStore } from '@/store/activityStore';
import { useCharacterStore } from '@/store/characterStore';
import { useQuestStore } from '@/store/questStore';
import { useInventoryStore } from '@/store/inventoryStore';
import { useStatsStore } from '@/store/statsStore';
import { useCombatStore } from '@/store/combatStore';
import { toast } from '@/components/ui/Toaster';
import { Modal } from '@/components/ui/Modal';
import { GoldDisplay } from '@/components/ui/GoldDisplay';
import { XPBar } from '@/components/ui/XPBar';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { InstallBanner } from '@/components/ui/InstallBanner';
import { OfflineBanner } from '@/components/ui/OfflineBanner';
import { WelcomeBackBanner } from '@/components/ui/WelcomeBackBanner';
import { RouteBackground } from '@/components/ui/RouteBackground';
import { BrandMark } from '@/components/ui/BrandMark';
import { LevelUpCelebration } from '@/components/character/LevelUpCelebration';
import { playerMaxHp, totalGearBonuses } from '@/lib/gameLogic/combat';

/** Nav link that blocks navigation (with a toast) while combat is active. */
function CombatSafeLink({
  href,
  children,
  onClick: onClickProp,
  ...props
}: React.ComponentProps<typeof Link>) {
  const combatActive = useCombatStore((s) => s.combatActive);

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (combatActive) {
      e.preventDefault();
      toast.warning('Finish or flee your current battle before navigating away.');
    }
    // Always fire the caller's onClick so the More panel can close even when
    // navigation is blocked by an active combat session.
    onClickProp?.(e);
  }

  return (
    <Link href={href} onClick={handleClick} {...props}>
      {children}
    </Link>
  );
}

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { character, loading } = useCharacter();
  const [collapsed, setCollapsed] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const pinnedHrefs = useNavPreferenceStore((s) => s.pinnedHrefs);
  const hasSeenCustomizer = useNavPreferenceStore((s) => s.hasSeenCustomizer);
  const openCustomizer = useNavPreferenceStore((s) => s.openCustomizer);
  // Primary bar: NAV_ITEMS order filtered to pinned hrefs.
  const primaryNav = NAV_ITEMS.filter((item) => pinnedHrefs.includes(item.href));
  // Overflow panel: everything else.
  const overflowNav = NAV_ITEMS.filter((item) => !pinnedHrefs.includes(item.href));
  const subscribeActivity = useActivityStore((s) => s.subscribe);

  // Close the overflow panel on any navigation.
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (character?.uid) subscribeActivity(character.uid);
  }, [character?.uid, subscribeActivity]);

  // Mirrors collection-category achievement unlocks (bestiary, legendary hoarder,
  // armory, arcane-archive) into the character doc. Client-authoritative for now —
  // worst-case tamper is a few hundred gold per fabricated unlock. Harden via a CF
  // re-check when leaderboards arrive.
  useCollectionAchievementSync();

  // Grants a small once-per-UTC-day login bonus. Client-authoritative optimistic
  // write — worst-case tamper is ~75 g/day, trivial vs the gold economy.
  useDailyLoginBonus();

  async function handleSignOut() {
    useActivityStore.getState().clear();
    useCharacterStore.getState().clear();
    useQuestStore.getState().clear();
    useInventoryStore.getState().clear();
    useStatsStore.getState().clear();
    useCombatStore.getState().clear();
    await logOut();
    router.push('/login');
  }

  return (
    <div className="relative min-h-screen text-gray-900 dark:text-slate-100 flex flex-col transition-colors">
      {/* Per-route thematic backdrop — gradient + SVG pattern behind everything */}
      <RouteBackground />

      {/* Global level-up celebration — fires whenever character.level increases */}
      <LevelUpCelebration />

      {/* PWA install nudge — appears after ~12 s of activity if installable */}
      <InstallBanner />

      {/* Welcome-back boost banner — appears for returning players (14+ day absence) */}
      <WelcomeBackBanner />

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-gray-200/80 dark:border-slate-800/80 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-20 h-14 shadow-sm shadow-gray-900/5 dark:shadow-black/30">
        <div className="h-full px-4 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="text-indigo-600 dark:text-indigo-300 shrink-0 hover:text-indigo-700 dark:hover:text-indigo-200 transition-colors"
            aria-label="FitQuest home"
          >
            <BrandMark size={28} />
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

      {/* Network status — in document flow so it pushes content down without
          a hardcoded pixel offset tied to the header height */}
      <OfflineBanner />

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
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <CombatSafeLink
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
                </CombatSafeLink>
              );
            })}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main id="main-content" className="flex-1 min-w-0 py-6 px-4 sm:px-6 pb-24 sm:pb-20 md:pb-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>

      {/* ── Mobile: overflow "More" panel ────────────────────────────────── */}
      {moreOpen && (
        <div
          className="fixed inset-0 z-[14] md:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden="true"
        />
      )}
      <AnimatePresence>
        {moreOpen && (
          <motion.div
            key="overflow-panel"
            drag={prefersReducedMotion ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.4 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 60 || info.velocity.y > 400) {
                if ('vibrate' in navigator) navigator.vibrate(8);
                setMoreOpen(false);
              }
            }}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, y: 8 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="fixed bottom-14 left-0 right-0 z-[15] md:hidden mx-3 mb-1.5 rounded-2xl bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-gray-200/80 dark:border-slate-800/80 shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_-4px_6px_rgba(0,0,0,0.03),0_20px_25px_-5px_rgba(0,0,0,0.12),0_8px_10px_-6px_rgba(0,0,0,0.08)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_-4px_6px_rgba(0,0,0,0.1),0_20px_25px_-5px_rgba(0,0,0,0.5),0_8px_10px_-6px_rgba(0,0,0,0.4)] p-2"
          >
            {/* Drag handle — hints the panel is swipe-to-dismiss on mobile */}
            <div className="flex justify-center pb-2 pt-0.5" aria-hidden="true">
              <div className="w-8 h-1 rounded-full bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="grid grid-cols-4 gap-1">
              {overflowNav.map(({ href, label, Icon }) => {
                const active = pathname === href || pathname.startsWith(href + '/');
                return (
                  <CombatSafeLink
                    key={href}
                    href={href}
                    onClick={() => setMoreOpen(false)}
                    aria-current={active ? 'page' : undefined}
                    className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl text-[11px] font-medium transition-colors ${
                      active
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300'
                        : 'text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800/60 hover:text-gray-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-5 h-5" aria-hidden="true" strokeWidth={active ? 2.5 : 2} />
                    <span className="truncate w-full text-center">{label}</span>
                  </CombatSafeLink>
                );
              })}
            </div>
            {/* Customize shortcut */}
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                openCustomizer();
              }}
              className="mt-1 w-full py-2 flex items-center justify-center gap-1.5 text-[11px] font-medium text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors rounded-xl hover:bg-gray-50 dark:hover:bg-slate-800/40"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              Customize nav
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile bottom nav ─────────────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 md:hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl backdrop-saturate-150 border-t border-gray-200/80 dark:border-slate-800/80 z-10 shadow-lg shadow-gray-900/5 dark:shadow-black/40"
        aria-label="Primary"
      >
        <ul className="flex justify-around">
          {primaryNav.map(({ href, label, Icon }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href} className="flex-1 min-w-0">
                <CombatSafeLink
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex items-center justify-center py-3 px-1 transition-all min-h-[44px] ${
                    active
                      ? 'text-indigo-600 dark:text-indigo-300 scale-110'
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-200'
                  }`}
                >
                  {active && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"
                      aria-hidden="true"
                    />
                  )}
                  <Icon className="w-5 h-5" aria-hidden="true" strokeWidth={active ? 2.5 : 2} />
                </CombatSafeLink>
              </li>
            );
          })}
          {/* More button — highlights when on any overflow route */}
          <li className="flex-1 min-w-0">
            {(() => {
              const overflowActive = overflowNav.some(
                ({ href }) => pathname === href || pathname.startsWith(href + '/'),
              );
              const highlighted = overflowActive || moreOpen;
              return (
                <button
                  type="button"
                  title="More"
                  aria-label="More navigation options"
                  aria-expanded={moreOpen}
                  onClick={() => setMoreOpen((v) => !v)}
                  className={`relative w-full flex items-center justify-center py-3 px-1 transition-all min-h-[44px] ${
                    highlighted
                      ? 'text-indigo-600 dark:text-indigo-300 scale-110'
                      : 'text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-200'
                  }`}
                >
                  {highlighted && (
                    <span
                      className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-6 bg-indigo-600 dark:bg-indigo-400 rounded-b-full"
                      aria-hidden="true"
                    />
                  )}
                  <div className="relative">
                    <MoreHorizontal
                      className="w-5 h-5"
                      aria-hidden="true"
                      strokeWidth={moreOpen ? 2.5 : 2}
                    />
                    <AnimatePresence>
                      {!hasSeenCustomizer && (
                        <motion.span
                          key="onboarding-badge"
                          initial={{ opacity: 1, scale: 1 }}
                          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0 }}
                          transition={{ duration: 0.2 }}
                          className="absolute -top-0.5 -right-0.5 flex h-2 w-2"
                          aria-hidden="true"
                        >
                          <span className="absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75 animate-ping [animation-iteration-count:3]" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-400" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              );
            })()}
          </li>
        </ul>
      </nav>

      <NavCustomizerModal />
    </div>
  );
}

// ── Nav Customizer Modal ──────────────────────────────────────────────────────
// Store-connected, no props needed — can be opened from anywhere via
// useNavPreferenceStore(s => s.openCustomizer)().

function NavCustomizerModal() {
  const customizerOpen = useNavPreferenceStore((s) => s.customizerOpen);
  const closeCustomizer = useNavPreferenceStore((s) => s.closeCustomizer);
  const pinnedHrefs = useNavPreferenceStore((s) => s.pinnedHrefs);
  const togglePin = useNavPreferenceStore((s) => s.togglePin);
  const reorderPinned = useNavPreferenceStore((s) => s.reorderPinned);
  const prefersReducedMotion = useReducedMotion();

  // Pinned in user-defined order; available in canonical NAV_ITEMS order.
  const pinnedItems = pinnedHrefs
    .map((h) => NAV_ITEMS.find((i) => i.href === h))
    .filter((i): i is NavItem => !!i);
  const availableItems = NAV_ITEMS.filter((i) => !pinnedHrefs.includes(i.href));
  const atMax = pinnedHrefs.length >= MAX_PINNED;
  const atMin = pinnedHrefs.length <= 1;

  return (
    <Modal
      open={customizerOpen}
      onClose={closeCustomizer}
      size="sm"
      ariaLabelledby="customizer-heading"
    >
      <div className="p-5 space-y-4">
        <div>
          <h2
            id="customizer-heading"
            className="font-semibold text-gray-900 dark:text-slate-100 text-base"
          >
            Customize Nav
          </h2>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            Drag to reorder · tap to add or remove · {pinnedHrefs.length}/{MAX_PINNED} pinned
          </p>
        </div>

        {/* Pinned items — draggable list */}
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
            Main bar
          </p>
          <Reorder.Group
            axis="y"
            values={pinnedHrefs}
            onReorder={reorderPinned}
            className="space-y-1.5"
          >
            {pinnedItems.map(({ href, label, Icon }) => (
              <Reorder.Item
                key={href}
                value={href}
                transition={prefersReducedMotion ? { duration: 0 } : undefined}
                className="flex items-center gap-3 px-3 py-2.5 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl cursor-grab active:cursor-grabbing select-none"
              >
                <GripVertical
                  className="w-4 h-4 text-indigo-300 dark:text-indigo-700 shrink-0"
                  aria-hidden="true"
                />
                <Icon
                  className="w-4 h-4 text-indigo-600 dark:text-indigo-300 shrink-0"
                  aria-hidden="true"
                />
                <span className="text-sm font-medium text-indigo-700 dark:text-indigo-300 flex-1 truncate">
                  {label}
                </span>
                <button
                  type="button"
                  disabled={atMin}
                  onClick={(e) => {
                    e.stopPropagation();
                    togglePin(href);
                  }}
                  aria-label={`Remove ${label}`}
                  className="text-indigo-300 dark:text-indigo-700 hover:text-rose-500 dark:hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </Reorder.Item>
            ))}
          </Reorder.Group>
        </div>

        {/* Available items — tap to add */}
        {availableItems.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-slate-500 mb-2">
              {atMax ? 'More (bar is full)' : 'More — tap to add'}
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {availableItems.map(({ href, label, Icon }) => (
                <button
                  key={href}
                  type="button"
                  onClick={() => togglePin(href)}
                  disabled={atMax}
                  className={`flex flex-col items-center gap-1.5 py-3 px-1 rounded-xl border text-[11px] font-medium transition-all ${
                    atMax
                      ? 'border-gray-100 dark:border-slate-800 text-gray-300 dark:text-slate-700 cursor-not-allowed opacity-40'
                      : 'border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20'
                  }`}
                >
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  <span className="truncate w-full text-center">{label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={closeCustomizer}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
