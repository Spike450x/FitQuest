import { describe, it, expect, vi, beforeEach } from 'vitest';

const {
  signInWithEmailAndPasswordMock,
  createUserWithEmailAndPasswordMock,
  signOutMock,
  verifyBeforeUpdateEmailMock,
  updatePasswordMock,
  updateProfileMock,
  reauthenticateWithCredentialMock,
  credentialMock,
} = vi.hoisted(() => ({
  signInWithEmailAndPasswordMock: vi.fn(),
  createUserWithEmailAndPasswordMock: vi.fn(),
  signOutMock: vi.fn(),
  verifyBeforeUpdateEmailMock: vi.fn(),
  updatePasswordMock: vi.fn(),
  updateProfileMock: vi.fn(),
  reauthenticateWithCredentialMock: vi.fn(),
  credentialMock: vi.fn(() => 'cred'),
}));

let currentUser: { email: string | null } | null = null;
vi.mock('@/lib/firebase', () => ({
  get auth() {
    return { currentUser };
  },
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: (...a: unknown[]) => signInWithEmailAndPasswordMock(...a),
  createUserWithEmailAndPassword: (...a: unknown[]) => createUserWithEmailAndPasswordMock(...a),
  signOut: (...a: unknown[]) => signOutMock(...a),
  verifyBeforeUpdateEmail: (...a: unknown[]) => verifyBeforeUpdateEmailMock(...a),
  updatePassword: (...a: unknown[]) => updatePasswordMock(...a),
  updateProfile: (...a: unknown[]) => updateProfileMock(...a),
  reauthenticateWithCredential: (...a: unknown[]) => reauthenticateWithCredentialMock(...a),
  EmailAuthProvider: { credential: credentialMock },
}));

import {
  signIn,
  signUp,
  logOut,
  updateUserEmail,
  updateUserPassword,
  updateUserDisplayName,
} from '../auth';

beforeEach(() => {
  vi.clearAllMocks();
  currentUser = null;
});

describe('signIn', () => {
  it('calls signInWithEmailAndPassword with auth + email + password', () => {
    signIn('a@b.com', 'pw');
    expect(signInWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.any(Object),
      'a@b.com',
      'pw',
    );
  });
});

describe('signUp', () => {
  it('calls createUserWithEmailAndPassword', () => {
    signUp('a@b.com', 'pw');
    expect(createUserWithEmailAndPasswordMock).toHaveBeenCalledWith(
      expect.any(Object),
      'a@b.com',
      'pw',
    );
  });
});

describe('logOut', () => {
  it('calls signOut', () => {
    logOut();
    expect(signOutMock).toHaveBeenCalledTimes(1);
  });
});

describe('updateUserEmail', () => {
  it('reauthenticates then calls verifyBeforeUpdateEmail (NOT updateEmail)', async () => {
    const user = { email: 'old@example.com' } as Parameters<typeof updateUserEmail>[0];
    await updateUserEmail(user, 'oldpw', 'new@example.com');
    expect(credentialMock).toHaveBeenCalledWith('old@example.com', 'oldpw');
    expect(reauthenticateWithCredentialMock).toHaveBeenCalledWith(user, 'cred');
    expect(verifyBeforeUpdateEmailMock).toHaveBeenCalledWith(user, 'new@example.com');
  });
});

describe('updateUserPassword', () => {
  it('reauthenticates then updates the password', async () => {
    const user = { email: 'old@example.com' } as Parameters<typeof updateUserPassword>[0];
    await updateUserPassword(user, 'oldpw', 'newpw');
    expect(credentialMock).toHaveBeenCalledWith('old@example.com', 'oldpw');
    expect(reauthenticateWithCredentialMock).toHaveBeenCalledWith(user, 'cred');
    expect(updatePasswordMock).toHaveBeenCalledWith(user, 'newpw');
  });
});

describe('updateUserDisplayName', () => {
  it('updates the profile when a user is signed in', async () => {
    currentUser = { email: 'a@b.com' };
    await updateUserDisplayName('NewName');
    expect(updateProfileMock).toHaveBeenCalledWith(
      { email: 'a@b.com' },
      { displayName: 'NewName' },
    );
  });

  it('no-ops when no user is signed in', async () => {
    currentUser = null;
    await updateUserDisplayName('NewName');
    expect(updateProfileMock).not.toHaveBeenCalled();
  });
});
