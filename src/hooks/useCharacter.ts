'use client';

import { useEffect } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useAuth } from './useAuth';

/** Loads the character from Firestore when a user is authenticated. */
export function useCharacter() {
  const { user, loading: authLoading } = useAuth();
  const character = useCharacterStore((s) => s.character);
  const loading = useCharacterStore((s) => s.loading);
  const error = useCharacterStore((s) => s.error);
  const fetchCharacter = useCharacterStore((s) => s.fetchCharacter);
  const clear = useCharacterStore((s) => s.clear);

  useEffect(() => {
    if (!authLoading) {
      if (user) {
        fetchCharacter(user.uid);
      } else {
        clear();
      }
    }
  }, [user, authLoading, fetchCharacter, clear]);

  return {
    character,
    loading: authLoading || loading,
    error,
    user,
  };
}
