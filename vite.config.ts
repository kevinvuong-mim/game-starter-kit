import { defineConfig } from 'vite';
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
