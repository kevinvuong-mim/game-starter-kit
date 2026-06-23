import { iap } from '../iap';
import { apiClient } from '../api';
import { ads } from '../advertising';
import { eventBus } from '../events';
import { storage } from '../storage';
import { getConfig } from '../config';
import { analytics } from '../analytics';

/**
 * Service locator for core platform services.
 * Provides a single access point for cross-cutting infrastructure.
 */
export const services = {
  ads,
  iap,
  storage,
  analytics,
  api: apiClient,
  events: eventBus,
  config: getConfig,
} as const;

export type PlatformServices = typeof services;

/** Sync service flags and API base URL after `setConfig()` in bootstrap. */
export function refreshServicesFromConfig(): void {
  const config = getConfig();
  analytics.setEnabled(config.analyticsEnabled);
  ads.setEnabled(config.adsEnabled);
  iap.setEnabled(config.iapEnabled);
  apiClient.setBaseUrl(config.apiUrl);
}
