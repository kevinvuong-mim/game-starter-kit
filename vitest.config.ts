import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@platform/core': resolve(__dirname, 'src/platform/core'),
      '@platform/modules': resolve(__dirname, 'src/platform/modules'),
      '@platform/ui': resolve(__dirname, 'src/platform/ui'),
      '@platform/bootstrap': resolve(__dirname, 'src/platform/bootstrap'),
      '@game': resolve(__dirname, 'src/game'),
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
