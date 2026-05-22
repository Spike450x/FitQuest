import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
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
