import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  verifyBeforeUpdateEmail,
  updatePassword,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

export const signIn = (email: string, password: string) =>
  signInWithEmailAndPassword(auth, email, password);

export const signUp = (email: string, password: string) =>
  createUserWithEmailAndPassword(auth, email, password);

export const logOut = () => signOut(auth);

/**
 * Sends a verification email to the new address before updating it.
 * Uses verifyBeforeUpdateEmail (not the deprecated updateEmail) to prevent
 * account takeover via unverified email changes.
 */
export async function updateUserEmail(
  user: User,
  currentPassword: string,
  newEmail: string,
): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email!, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await verifyBeforeUpdateEmail(user, newEmail);
}

export async function updateUserPassword(
  user: User,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  const credential = EmailAuthProvider.credential(user.email!, currentPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/** Syncs the Firebase Auth display name. Called after updating the character name in Firestore. */
export async function updateUserDisplayName(displayName: string): Promise<void> {
  if (auth.currentUser) {
    await updateProfile(auth.currentUser, { displayName });
  }
}
