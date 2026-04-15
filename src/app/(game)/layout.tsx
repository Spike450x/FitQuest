"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useCharacter } from "@/hooks/useCharacter";
import { GoldDisplay } from "@/components/ui/GoldDisplay";
import { XPBar } from "@/components/ui/XPBar";
import { playerMaxHp, totalGearBonuses } from "@/lib/gameLogic/combat";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/character", label: "Character", icon: "⚔️" },
  { href: "/activities", label: "Activities", icon: "📋" },
  { href: "/combat", label: "Combat", icon: "🐉" },
  { href: "/quests", label: "Quests", icon: "📜" },
  { href: "/inventory", label: "Inventory", icon: "🎒" },
  { href: "/shop", label: "Shop", icon: "🏪" },
  { href: "/profile", label: "Profile", icon: "👤" },
];

export default function GameLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { character, loading } = useCharacter();

  async function handleSignOut() {
    await signOut(auth);
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <header className="border-b border-gray-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link href="/dashboard" className="text-indigo-600 font-bold text-lg tracking-tight">
            FitQuest
          </Link>

          {/* XP bar (compact) */}
          {character && !loading && (
            <div className="flex-1 max-w-xs hidden sm:block">
              <XPBar xp={character.xp} level={character.level} xpToNextLevel={character.xpToNextLevel} />
            </div>
          )}

          <div className="flex items-center gap-4">
            {character && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                {(() => {
                  const gearBonuses = totalGearBonuses(character.equippedGear);
                  const maxHp = playerMaxHp(character);
                  const defense = (character.stats.defense ?? 0) + (gearBonuses.defense ?? 0);
                  return (
                    <>
                      <span>
                        ❤️{" "}
                        <span className="font-semibold text-gray-700">
                          {character.currentHp ?? maxHp}/{maxHp}
                        </span>{" "}
                        HP
                      </span>
                      <span>·</span>
                      <span>
                        🛡️{" "}
                        <span className="font-semibold text-gray-700">{defense}</span>{" "}
                        DEF
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
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors border ${
                  pathname === "/profile"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-gray-100 text-gray-600 border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700"
                }`}
              >
                {character.name.charAt(0).toUpperCase()}
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="text-xs text-gray-400 hover:text-gray-700 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 flex gap-6 py-6">
        {/* Sidebar nav */}
        <nav className="w-44 shrink-0 hidden md:block">
          <ul className="space-y-1">
            {NAV_ITEMS.map(({ href, label, icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className={`
                    flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors
                    ${
                      pathname === href
                        ? "bg-indigo-50 text-indigo-700 font-medium border border-indigo-100"
                        : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                    }
                  `}
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 md:hidden bg-white border-t border-gray-200 z-10">
        <ul className="flex justify-around">
          {NAV_ITEMS.slice(0, 5).map(({ href, label, icon }) => (
            <li key={href}>
              <Link
                href={href}
                className={`
                  flex flex-col items-center py-2 px-3 text-xs transition-colors
                  ${pathname === href ? "text-indigo-600" : "text-gray-400"}
                `}
              >
                <span className="text-lg">{icon}</span>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
