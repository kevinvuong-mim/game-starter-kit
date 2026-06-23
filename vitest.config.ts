import { resolve } from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@platform/ui': resolve(__dirname, 'src/platform/ui'),
      '@platform/core': resolve(__dirname, 'src/platform/core'),
      '@platform/modules': resolve(__dirname, 'src/platform/modules'),
      '@platform/bootstrap': resolve(__dirname, 'src/platform/bootstrap'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/platform/core/**', 'src/platform/modules/**'],
    },
  },
});
