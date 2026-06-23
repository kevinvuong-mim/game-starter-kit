import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: true,
    port: 5173,
  },
  resolve: {
    alias: {
      '@game': resolve(__dirname, 'src/game'),
      '@platform/ui': resolve(__dirname, 'src/platform/ui'),
      '@platform/core': resolve(__dirname, 'src/platform/core'),
      '@platform/modules': resolve(__dirname, 'src/platform/modules'),
      '@platform/bootstrap': resolve(__dirname, 'src/platform/bootstrap'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    sourcemap: true,
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
          if (id.includes('node_modules/zustand')) return 'vendor';
          if (id.includes('/src/platform/modules/i18n/locales/')) return 'locales';
        },
      },
    },
  },
});
