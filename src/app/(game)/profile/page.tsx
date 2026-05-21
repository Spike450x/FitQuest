'use client';

import { useState } from 'react';
import { type User } from 'firebase/auth';
import { updateUserEmail, updateUserPassword } from '@/lib/auth';
import { useCharacter } from '@/hooks/useCharacter';
import { useCharacterStore } from '@/store/characterStore';
import { ACHIEVEMENTS } from '@/lib/gameLogic/achievements';
import type { Character } from '@/types';

export default function ProfilePage() {
  const { character, user } = useCharacter();

  if (!character || !user) return null;

  return (
    <div className="space-y-5 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
        <p className="text-sm text-gray-500 mt-1">
          {character.name} · Level {character.level} {character.class}
        </p>
      </div>

      <AchievementGallery character={character} />
      <ChangeNameForm character={character} />
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

// ── Achievement Gallery ───────────────────────────────────────────────────────

function AchievementGallery({ character }: { character: Character }) {
  const unlocked = new Set(character.achievements ?? []);
  const all = Object.values(ACHIEVEMENTS);
  const unlockedCount = all.filter((a) => unlocked.has(a.id)).length;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Achievements</h3>
          <p className="text-xs text-gray-400 mt-0.5">
            {unlockedCount} / {all.length} unlocked
          </p>
        </div>
        <div className="flex gap-1">
          {all.map((def) => (
            <span
              key={def.id}
              title={def.name}
              className={`text-lg leading-none ${unlocked.has(def.id) ? '' : 'grayscale opacity-30'}`}
            >
              {def.emoji}
            </span>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {all.map((def) => {
          const isUnlocked = unlocked.has(def.id);
          return (
            <div
              key={def.id}
              className={`rounded-xl p-3 border ${
                isUnlocked
                  ? 'bg-indigo-50 border-indigo-200'
                  : 'bg-gray-50 border-gray-200 opacity-50'
              }`}
            >
              <div className="text-2xl mb-1">{isUnlocked ? def.emoji : '🔒'}</div>
              <div
                className={`text-xs font-bold leading-tight ${isUnlocked ? 'text-indigo-900' : 'text-gray-400'}`}
              >
                {def.name}
              </div>
              <div className="text-xs text-gray-400 mt-0.5 leading-snug">{def.description}</div>
              {isUnlocked && (
                <div className="mt-2">
                  <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded font-medium">
                    +{def.goldReward} gold earned
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
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
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={32}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
          <div className="rounded-lg bg-indigo-50 border border-indigo-200 px-4 py-3 text-sm text-indigo-800">
            <p className="font-semibold">Check your inbox</p>
            <p className="mt-0.5 text-indigo-700">
              A verification link was sent to <span className="font-medium">{pendingEmail}</span>.
              Your email won&apos;t change until you click it.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPendingEmail(null)}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Change a different address
          </button>
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="New email address"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Current password to confirm"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          placeholder="Current password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          placeholder="New password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Confirm new password"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="font-semibold text-gray-900 text-sm">{title}</h3>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      {children}
    </div>
  );
}
