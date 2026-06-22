import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@core': resolve(__dirname, 'src/core'),
      '@app': resolve(__dirname, 'src/app'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@infra': resolve(__dirname, 'src/infrastructure'),
      '@games': resolve(__dirname, 'src/games'),
      '@i18n': resolve(__dirname, 'src/i18n'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],
          vendor: ['zustand'],
        },
      },
    },
  },
  server: {
    port: 5173,
    host: true,
  },
});
