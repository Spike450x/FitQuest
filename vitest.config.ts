import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Explicit include prevents the rules tests in tests/rules/ from being
    // picked up by the regular test run (those require the Firestore emulator).
    include: ['src/**/__tests__/**/*.ts', 'src/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      // Scope coverage to the pure game logic that the unit suite actually exercises.
      include: ['src/lib/gameLogic/**/*.ts'],
      exclude: ['src/lib/gameLogic/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
