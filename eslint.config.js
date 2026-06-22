import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ['dist/**', 'node_modules/**', 'android/**', 'ios/**'],
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/game/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@platform/core/analytics',
              message: 'Use eventBus.emit("analytics", ...) with AnalyticsEvents from @platform/core/events',
            },
            {
              name: '@platform/core/api',
              message: 'Game layer must not call API directly — use eventBus',
            },
            {
              name: '@platform/core/storage',
              message: 'Game layer must not access storage — use eventBus',
            },
            {
              name: '@platform/core/state',
              message: 'Game layer must not mutate store — use eventBus',
            },
            {
              name: '@platform/core/advertising',
              message: 'Use eventBus for ad interactions',
            },
            {
              name: '@platform/core/iap',
              message: 'Use eventBus or @platform/ui for IAP',
            },
            {
              name: '@platform/core/error',
              message: 'Use eventBus.emit("error:report", ...) instead',
            },
            {
              name: '@platform/core/config',
              message: 'Use @game/config for game settings',
            },
            {
              name: '@platform/core/utils',
              message: 'Use @game/utils for game utilities',
            },
          ],
          patterns: [
            {
              group: ['@platform/modules/*'],
              message: 'Use @platform/ui or eventBus — not @platform/modules from game layer',
            },
          ],
        },
      ],
    },
  }
);
