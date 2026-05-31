'use client';

import { useState } from 'react';
import Link from 'next/link';
import { type User } from 'firebase/auth';
import { updateUserEmail, updateUserPassword } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { POLYMATH_THRESHOLD } from '@/lib/gameLogic/achievements';
import { AVATAR_OPTIONS, resolveAvatar } from '@/lib/gameLogic/avatars';
import { Card } from '@/components/ui/Card';
import { ReputationRankBar } from '@/components/ui/ReputationChip';
import { CharacterAvatar } from '@/components/ui/CharacterAvatar';
import { SettingsCard } from '@/components/ui/SettingsCard';
import { EntityArt } from '@/components/art/EntityArt';
import type { Character } from '@/types';
import { InputField } from '@/components/ui/InputField';

export default function ProfilePage() {
  const { character, user } = useCharacter();

  if (!character || !user) return null;

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center gap-4">
        <CharacterAvatar character={character} size="lg" />
        <div>
          <h1 className="font-display text-3xl font-bold text-gray-900 dark:text-slate-100 tracking-tight">
            Profile
          </h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
            {character.name} · Level {character.level} {character.class}
          </p>
        </div>
      </div>

      <Link
        href="/settings"
        className="block rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        ⚙️ Settings — theme, sound, devices &amp; navigation →
      </Link>

      <AvatarPicker character={character} />

      <ReputationCard character={character} />

      <PolymathProgress character={character} />

      <Link
        href="/collections"
        className="block rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 px-4 py-3 text-sm font-medium text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 transition-colors"
      >
        View Achievements, Bestiary &amp; Collection →
      </Link>

      <ChangeNameForm character={character} />
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

// ── Avatar Picker ─────────────────────────────────────────────────────────────
// Preset crests from the heraldic-art system — no uploads, no Firebase Storage.
// Persisted to `Character.avatarId` via the client-mirrored applyCharacterPatch.

function AvatarPicker({ character }: { character: Character }) {
  const applyCharacterPatch = useCharacterStore((s) => s.applyCharacterPatch);
  const selected = resolveAvatar(character).id;
  const [saving, setSaving] = useState<string | null>(null);

  async function choose(id: string) {
    if (id === character.avatarId) return;
    setSaving(id);
    try {
      await applyCharacterPatch({ avatarId: id });
    } finally {
      setSaving(null);
    }
  }

  return (
    <SettingsCard title="Avatar" description="Pick a crest to represent you across the realm.">
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {AVATAR_OPTIONS.map((opt) => {
          const isSelected = opt.id === selected;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.id)}
              aria-pressed={isSelected}
              title={opt.label}
              disabled={saving !== null}
              className={`flex flex-col items-center gap-1 rounded-xl border p-2 transition-colors ${
                isSelected
                  ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
                  : 'border-gray-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-600'
              } ${saving === opt.id ? 'opacity-60' : ''}`}
            >
              <EntityArt
                category={opt.category}
                id={opt.id}
                tint={opt.tint}
                size="sm"
                ariaLabel={opt.label}
              />
              <span className="text-[10px] text-gray-500 dark:text-slate-400 truncate w-full text-center">
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </SettingsCard>
  );
}

// ── Reputation ────────────────────────────────────────────────────────────────

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
