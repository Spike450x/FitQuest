import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const USE_EMULATOR = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Prevent re-initializing on hot reload in development
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const functions = getFunctions(app);

// Enable IndexedDB persistence so reads are served from the local cache when
// offline or on a slow connection (PWA offline support).
// Skipped in emulator mode — emulator data is ephemeral and persistence
// causes stale reads between test runs.
// SSR / Node (vitest): window is undefined — fall back to memory-only instance.
// Hot reload: initializeFirestore throws if already called — catch and fall through.
function buildDb() {
  if (typeof window === 'undefined') return getFirestore(app);
  if (USE_EMULATOR) return getFirestore(app);
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    return getFirestore(app);
  }
}
export const db = buildDb();

// Connect to local emulators when NEXT_PUBLIC_USE_FIREBASE_EMULATOR=true.
// Guards prevent double-connection on hot reload.
if (USE_EMULATOR && typeof window !== 'undefined') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  } catch {
    // already connected on hot reload
  }
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch {
    // already connected on hot reload
  }
  try {
    connectFunctionsEmulator(functions, '127.0.0.1', 5001);
  } catch {
    // already connected on hot reload
  }
}
