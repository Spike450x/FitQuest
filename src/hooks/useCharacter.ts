'use client';

import { useEffect } from 'react';
import { useCharacterStore } from '@/store/characterStore';
import { useAuth } from './useAuth';

/** Loads the character from Firestore when a user is authenticated. */
export function useCharacter() {
  const { user, loading: authLoading } = useAuth();
  const { character, loading, error, fetchCharacter, clear } = useCharacterStore();

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
