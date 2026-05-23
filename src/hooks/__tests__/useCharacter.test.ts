// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/lib/firebase', () => ({ db: {}, auth: {}, functions: {} }));

const fetchCharacterSpy = vi.fn();
const clearSpy = vi.fn();
vi.mock('@/store/characterStore', () => ({
  useCharacterStore: Object.assign(
    (selector: (s: unknown) => unknown) =>
      selector({
        character: null,
        loading: false,
        error: null,
        fetchCharacter: fetchCharacterSpy,
        clear: clearSpy,
      }),
    { getState: () => ({}) },
  ),
}));

const useAuthMock = vi.fn();
vi.mock('../useAuth', () => ({ useAuth: () => useAuthMock() }));

import { useCharacter } from '../useCharacter';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useCharacter', () => {
  it('fetches the character when a user is authenticated', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'uid1' }, loading: false });
    renderHook(() => useCharacter());
    expect(fetchCharacterSpy).toHaveBeenCalledWith('uid1');
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('clears character state when there is no user', () => {
    useAuthMock.mockReturnValue({ user: null, loading: false });
    renderHook(() => useCharacter());
    expect(clearSpy).toHaveBeenCalled();
    expect(fetchCharacterSpy).not.toHaveBeenCalled();
  });

  it('does nothing while auth is still loading', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    renderHook(() => useCharacter());
    expect(fetchCharacterSpy).not.toHaveBeenCalled();
    expect(clearSpy).not.toHaveBeenCalled();
  });

  it('exposes loading: true while auth is loading', () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    const { result } = renderHook(() => useCharacter());
    expect(result.current.loading).toBe(true);
  });

  it('returns the authenticated user when available', () => {
    useAuthMock.mockReturnValue({ user: { uid: 'uid1' }, loading: false });
    const { result } = renderHook(() => useCharacter());
    expect(result.current.user).toEqual({ uid: 'uid1' });
  });
});
