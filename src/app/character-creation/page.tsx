'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClassSelector } from '@/components/character/ClassSelector';
import { useCharacterStore } from '@/store/characterStore';
import { useCharacter } from '@/hooks/useCharacter';
import type { CharacterClass } from '@/types';

export default function CharacterCreationPage() {
  const router = useRouter();
  const { user, character, loading: charLoading } = useCharacter();
  const createCharacter = useCharacterStore((s) => s.createCharacter);
  const loading = useCharacterStore((s) => s.loading);
  const error = useCharacterStore((s) => s.error);

  // Redirect to dashboard if a character already exists
  useEffect(() => {
    if (!charLoading && character) {
      router.replace('/dashboard');
    }
  }, [character, charLoading, router]);

  const [name, setName] = useState('');
  const [selectedClass, setSelectedClass] = useState<CharacterClass | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setNameError(null);

    if (!user) return;

    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setNameError('Name must be at least 2 characters.');
      return;
    }
    if (trimmed.length > 24) {
      setNameError('Name must be 24 characters or less.');
      return;
    }
    if (!selectedClass) return;

    await createCharacter(user.uid, trimmed, selectedClass);
    router.push('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-violet-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-indigo-600">FitQuest</h1>
          <p className="text-gray-500 mt-2">Create your character to begin</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
          <form onSubmit={handleCreate} className="space-y-8">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Character Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={24}
                placeholder="Enter your hero's name..."
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors text-lg"
              />
              {nameError && <p className="text-red-500 text-sm mt-1">{nameError}</p>}
            </div>

            {/* Class */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose your Class
              </label>
              <ClassSelector selected={selectedClass} onSelect={setSelectedClass} />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={!name.trim() || !selectedClass || loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-colors text-lg"
            >
              {loading ? 'Forging your destiny...' : 'Begin Adventure'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
