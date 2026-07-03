import { services } from '@platform/core/services';
import { ConsoleAnalyticsProvider, FirebaseAnalyticsProvider } from '@platform/core/analytics';

const { config, analytics } = services;

/**
 * Registers the analytics provider selected by runtime config.
 */
export function registerAnalyticsProviders(): void {
  const runtime = config();
  analytics.clearProviders();

  if (!runtime.analyticsEnabled) return;

  if (runtime.analyticsProvider === 'console') {
    analytics.registerProvider(new ConsoleAnalyticsProvider());
  } else if (runtime.analyticsProvider === 'firebase') {
    analytics.registerProvider(new FirebaseAnalyticsProvider());
  }
}
