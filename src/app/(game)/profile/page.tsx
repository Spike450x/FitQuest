'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type User } from 'firebase/auth';
import { updateUserEmail, updateUserPassword } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { Card } from '@/components/ui/Card';
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

      <Link
        href="/collections"
        className="block rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
      >
        View Achievements, Bestiary &amp; Collection →
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
