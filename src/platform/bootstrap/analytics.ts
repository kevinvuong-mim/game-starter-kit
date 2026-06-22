import { getConfig } from '@platform/core/config';
import {
  analytics,
  ConsoleAnalyticsProvider,
  FirebaseAnalyticsProvider,
} from '@platform/core/analytics';

/**
 * Registers analytics providers based on runtime config.
 * Console is always enabled; Firebase only when analytics is enabled.
 */
export function registerAnalyticsProviders(): void {
  analytics.registerProvider(new ConsoleAnalyticsProvider());

  if (getConfig().analyticsEnabled) {
    analytics.registerProvider(new FirebaseAnalyticsProvider());
  }
}
