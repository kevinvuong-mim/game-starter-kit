import { services } from '@platform/core/services';
import { ConsoleAnalyticsProvider, FirebaseAnalyticsProvider } from '@platform/core/analytics';

const { config, analytics } = services;

/**
 * Registers analytics providers based on runtime config.
 * Console is always enabled; Firebase only when analytics is enabled.
 */
export function registerAnalyticsProviders(): void {
  analytics.registerProvider(new ConsoleAnalyticsProvider());

  if (config().analyticsEnabled) {
    analytics.registerProvider(new FirebaseAnalyticsProvider());
  }
}
