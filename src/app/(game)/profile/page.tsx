"use client";

import { useState } from "react";
import {
  updateProfile,
  updateEmail,
  updatePassword,
  EmailAuthProvider,
  reauthenticateWithCredential,
} from "firebase/auth";
import { updateDoc, doc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useCharacter } from "@/hooks/useCharacter";
import { useCharacterStore } from "@/store/characterStore";

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

      <ChangeNameForm character={character} />
      <ChangeEmailForm user={user} />
      <ChangePasswordForm user={user} />
    </div>
  );
}

// ── Change Name ───────────────────────────────────────────────────────────────

function ChangeNameForm({ character }: { character: import("@/types").Character }) {
  const fetchCharacter = useCharacterStore((s) => s.fetchCharacter);
  const [name, setName] = useState(character.name);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || trimmed === character.name) return;
    setSaving(true);
    setError("");
    try {
      await updateDoc(doc(db, "characters", character.uid), { name: trimmed });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName: trimmed });
      }
      await fetchCharacter(character.uid);
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
          {saving ? "Saving…" : saved ? "✓ Saved" : "Save Name"}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Change Email ──────────────────────────────────────────────────────────────

function ChangeEmailForm({ user }: { user: import("firebase/auth").User }) {
  const [email, setEmail] = useState(user.email ?? "");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !password || trimmed === user.email) return;
    setSaving(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(user.email!, password);
      await reauthenticateWithCredential(user, credential);
      await updateEmail(user, trimmed);
      setSaved(true);
      setPassword("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/wrong-password") setError("Incorrect current password.");
      else if (code === "auth/email-already-in-use") setError("That email is already in use.");
      else setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <SettingsCard title="Email Address" description="Changing email requires your current password">
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
          {saving ? "Updating…" : saved ? "✓ Updated" : "Update Email"}
        </button>
      </form>
    </SettingsCard>
  );
}

// ── Change Password ───────────────────────────────────────────────────────────

function ChangePasswordForm({ user }: { user: import("firebase/auth").User }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (next !== confirm) { setError("New passwords do not match."); return; }
    if (next.length < 6) { setError("Password must be at least 6 characters."); return; }
    setSaving(true);
    setError("");
    try {
      const credential = EmailAuthProvider.credential(user.email!, current);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, next);
      setSaved(true);
      setCurrent(""); setNext(""); setConfirm("");
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/wrong-password") setError("Incorrect current password.");
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
          {saving ? "Updating…" : saved ? "✓ Updated" : "Change Password"}
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
