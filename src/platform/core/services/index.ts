import { eventBus } from '../events';
import { analytics } from '../analytics';
import { ads } from '../advertising';
import { iap } from '../iap';
import { storage } from '../storage';
import { apiClient } from '../api';
import { getConfig } from '../config';

/**
 * Service locator for core platform services.
 * Provides a single access point for cross-cutting infrastructure.
 */
export const services = {
  events: eventBus,
  analytics,
  ads,
  iap,
  storage,
  api: apiClient,
  config: getConfig,
} as const;

export type PlatformServices = typeof services;
