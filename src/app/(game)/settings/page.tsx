'use client';

import Link from 'next/link';
import { useCharacter } from '@/hooks/useCharacter';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { InstallAppButton } from '@/components/ui/InstallAppButton';
import { SettingsCard } from '@/components/ui/SettingsCard';
import { useNavPreferenceStore, MAX_PINNED } from '@/store/navPreferenceStore';

export default function SettingsPage() {
  const { character, user } = useCharacter();
  const pinnedHrefs = useNavPreferenceStore((s) => s.pinnedHrefs);
  const openCustomizer = useNavPreferenceStore((s) => s.openCustomizer);

  if (!character || !user) return null;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          App preferences, sound, and connected devices.
        </p>
      </div>

      <Link
        href="/profile"
        className="block rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
      >
        ← Back to Profile (name, email, password, avatar)
      </Link>

      <SettingsCard
        title="Navigation"
        description="Choose which shortcuts appear in the mobile quick-access bar."
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            {pinnedHrefs.length} of {MAX_PINNED} slots pinned
          </p>
          <button
            type="button"
            onClick={openCustomizer}
            className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Customize
          </button>
        </div>
      </SettingsCard>

      <SettingsCard title="Appearance" description="Choose your preferred theme.">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Light and dark modes for your eyes.
          </p>
          <ThemeToggle variant="full" />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Sound Effects"
        description="Retro-style sound cues for dice rolls, combat, level-ups and loot drops."
      >
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Generated in-browser. No audio files, no tracking.
          </p>
          <SoundToggle variant="full" />
        </div>
      </SettingsCard>

      <SettingsCard
        title="Connections"
        description="Auto-log workouts from Strava, Garmin, Fitbit and more."
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Link a device so your real-world workouts log themselves.
          </p>
          <Link
            href="/profile/connections"
            className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            Manage devices →
          </Link>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Install App"
        description="Add FitQuest to your home screen for a native-app feel."
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm text-gray-600 dark:text-slate-300">
            Launch in full-screen, no browser chrome. Loads faster on each visit.
          </p>
          <InstallAppButton />
        </div>
      </SettingsCard>
    </div>
  );
}
