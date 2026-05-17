import { defineConfig } from 'vitest/config';
import path from 'path';

// Separate config for Firestore security rules tests.
// These tests require the Firestore emulator to be running (port 8080).
// Run via: firebase emulators:exec --only firestore --project demo-fitness-rpg "npm run test:rules"
// or locally: start the emulator first, then npm run test:rules
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/rules/**/*.test.ts'],
    // Emulator operations are slower than pure-logic tests.
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Run files sequentially to prevent clearFirestore() in one file
    // from clearing data written by a concurrent file.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
