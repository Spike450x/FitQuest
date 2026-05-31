'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type User } from 'firebase/auth';
import { updateUserEmail, updateUserPassword } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { POLYMATH_THRESHOLD } from '@/lib/gameLogic/achievements';
import { Card } from '@/components/ui/Card';
import { ReputationRankBar } from '@/components/ui/ReputationChip';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useNavPreferenceStore, MAX_PINNED } from '@/store/navPreferenceStore';
import { SoundToggle } from '@/components/ui/SoundToggle';
import { InstallAppButton } from '@/components/ui/InstallAppButton';
import type { Character } from '@/types';
import { InputField } from '@/components/ui/InputField';

export default function ProfilePage() {
  const { character, user } = useCharacter();
  const pinnedHrefs = useNavPreferenceStore((s) => s.pinnedHrefs);
  const openCustomizer = useNavPreferenceStore((s) => s.openCustomizer);

  if (!character || !user) return null;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
          Account Settings
        </h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
          {character.name} · Level {character.level} {character.class}
        </p>
      </div>

      <ReputationCard character={character} />

      <PolymathProgress character={character} />

      <Link
        href="/collections"
        className="block rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
      >
        View Achievements, Bestiary &amp; Collection →
      </Link>

      <Link
        href="/profile/connections"
        className="block rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-4 py-3 text-sm font-medium text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
      >
        Connect a device — auto-log from Garmin, Fitbit &amp; more →
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

      <ChangeNameForm character={character} />
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

// ── Reputation ────────────────────────────────────────────────────────────────
// Shows the player's Reputation rank + progress to the next tier, plus the
// spendable wallet. Earned on the Wanted Board; spent on future sinks.

function ReputationCard({ character }: { character: Character }) {
  return (
    <Card variant="default" padding="lg" data-testid="reputation-card">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">🎖️ Reputation</h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            Wallet:{' '}
            <span className="font-semibold text-violet-600 dark:text-violet-300">
              {(character.spendableReputation ?? 0).toLocaleString()} Rep
            </span>
          </p>
        </div>
        <Link
          href="/wanted"
          className="shrink-0 text-xs font-semibold text-violet-600 dark:text-violet-300 hover:underline"
        >
          Wanted Board →
        </Link>
      </div>
      <ReputationRankBar lifetime={character.lifetimeReputation ?? 0} />
    </Card>
  );
}

// ── Polymath Progress ─────────────────────────────────────────────────────────
// Surfaces progress toward the `polymath` achievement (mastery 5 on every
// primary stat). Without this widget, players have no visibility into how
// close they are to unlocking it.

const POLYMATH_TRACKS: Array<{
  activity: 'workout' | 'run' | 'steps' | 'meditation';
  label: string;
  colorClass: string;
}> = [
  { activity: 'workout', label: 'Strength', colorClass: 'bg-red-400 dark:bg-red-500' },
  { activity: 'steps', label: 'Wisdom', colorClass: 'bg-blue-400 dark:bg-blue-500' },
  { activity: 'run', label: 'Agility', colorClass: 'bg-teal-400 dark:bg-teal-500' },
  { activity: 'meditation', label: 'Spirit', colorClass: 'bg-violet-400 dark:bg-violet-500' },
];

function PolymathProgress({ character }: { character: Character }) {
  const unlocked = (character.achievements ?? []).includes('polymath');
  const counts = character.masteryCounts ?? {};

  return (
    <Card variant="default" padding="lg" data-testid="polymath-progress">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">
            🎓 Polymath progress
          </h3>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
            {unlocked
              ? 'Unlocked — all 4 primary stats mastered.'
              : `Hit mastery ${POLYMATH_THRESHOLD} on every primary stat.`}
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {POLYMATH_TRACKS.map(({ activity, label, colorClass }) => {
          const count = Math.min(POLYMATH_THRESHOLD, counts[activity] ?? 0);
          const done = (counts[activity] ?? 0) >= POLYMATH_THRESHOLD;
          return (
            <li key={activity} className="flex items-center gap-3">
              <span
                className={`text-xs font-medium w-20 ${
                  done
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-gray-600 dark:text-slate-300'
                }`}
              >
                {label}
              </span>
              <div className="flex gap-1 flex-1">
                {Array.from({ length: POLYMATH_THRESHOLD }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full transition-colors ${
                      i < count
                        ? unlocked
                          ? 'bg-emerald-400 dark:bg-emerald-500'
                          : colorClass
                        : 'bg-gray-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500 tabular-nums w-8 text-right">
                {done ? '✓' : `${count}/${POLYMATH_THRESHOLD}`}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ── Change Name ───────────────────────────────────────────────────────────────

function ChangeNameForm({ character }: { character: Character }) {
  const updateName = useCharacterStore((s) => s.updateName);
  const [name, setName] = useState(character.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) return;
    setSaving(true);
    setError('');
    try {
      await updateName(character.uid, trimmed);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Character Name" description="Your in-game display name">
      <form onSubmit={handleSave} className="space-y-3">
        <InputField
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          inputSize="sm"
          aria-label="Character name"
          autoComplete="nickname"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !name.trim() || name.trim() === character.name}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Name'}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Change Email ──────────────────────────────────────────────────────────────

function ChangeEmailForm({ user }: { user: User }) {
  const [email, setEmail] = useState(user.email ?? '');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || trimmed === user.email) return;
    setSaving(true);
    setError('');
    setPendingEmail(null);
    try {
      await updateUserEmail(user, password, trimmed);
      setPendingEmail(trimmed);
      setPassword('');
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/wrong-password') setError('Incorrect current password.');
      else if (code === 'auth/email-already-in-use') setError('That email is already in use.');
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Email Address" description="Changing email requires your current password">
      {pendingEmail ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm text-indigo-800 dark:text-indigo-200">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-0.5 text-indigo-700 dark:text-indigo-300">
              A verification link was sent to <span className="font-medium">{pendingEmail}</span>.
              Your email won&apos;t change until you click it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingEmail(null)}
            className="text-xs text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 underline"
          >
            Change a different address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <InputField
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="New email address"
            inputSize="sm"
          />
          <InputField
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password to confirm"
            inputSize="sm"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={saving || !email.trim() || !password || email.trim() === user.email}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            {saving ? 'Sending…' : 'Update Email'}
          </button>
        </form>
      )}
    </SettingsCard>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordForm({ user }: { user: User }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (next.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateUserPassword(user, current, next);
      setSaved(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'auth/wrong-password') setError('Incorrect current password.');
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Password" description="Must be at least 6 characters">
      <form onSubmit={handleSave} className="space-y-3">
        <InputField
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          autoComplete="current-password"
          inputSize="sm"
        />
        <InputField
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password"
          autoComplete="new-password"
          inputSize="sm"
        />
        <InputField
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          autoComplete="new-password"
          inputSize="sm"
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={saving || !current || !next || !confirm}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {saving ? 'Updating…' : saved ? '✓ Updated' : 'Change Password'}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Settings Card wrapper ─────────────────────────────────────────────────────

function SettingsCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card variant="default" padding="lg">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 dark:text-slate-100 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">{description}</p>
      </div>
      {children}
    </Card>
  );
}
