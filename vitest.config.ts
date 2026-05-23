import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Per-file environment overrides use the // @vitest-environment jsdom docblock.
    // Hook and component tests that need the DOM declare it that way.
    setupFiles: [path.resolve(__dirname, 'src/test-setup.ts')],
    // Explicit include prevents the rules tests in tests/rules/ from being
    // picked up by the regular test run (those require the Firestore emulator).
    include: ['src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      // Broadened from the original game-logic scope so npm run test:coverage
      // reports real numbers for stores, hooks, lib helpers, and components too.
      // Thresholds still gate only the pure game-logic subtree (the rest is for
      // visibility, not for blocking CI).
      include: [
        'src/lib/**/*.ts',
        'src/store/**/*.ts',
        'src/hooks/**/*.ts',
        'src/components/**/*.{ts,tsx}',
      ],
      exclude: [
        'src/**/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.test.tsx',
        'src/lib/firebase.ts',
      ],
      thresholds: {
        'src/lib/gameLogic/**/*.ts': {
          lines: 80,
          functions: 80,
          branches: 70,
          statements: 80,
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
