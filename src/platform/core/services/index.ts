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
