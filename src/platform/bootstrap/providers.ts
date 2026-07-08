import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { services } from '@platform/core/services';
import { iap, createIapProvider } from '@platform/modules/iap';
import { createAdsProvider } from '@platform/core/advertising';
import { ConsoleAnalyticsProvider, FirebaseAnalyticsProvider } from '@platform/core/analytics';

const { ads, config, analytics } = services;

/** Registers the ads provider based on runtime config and platform. */
export function registerAdsProvider(): void {
  const runtime = config();
  if (!runtime.adsEnabled) return;

  const providerName =
    Capacitor.isNativePlatform() && runtime.ads.provider === 'admob' ? 'admob' : 'mock';

  ads.setProvider(createAdsProvider(providerName));
}

/** Registers the analytics provider selected by runtime config. */
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

/** Registers the IAP provider based on runtime config and platform. */
export function registerIapProvider(appUserId?: string): void {
  const runtime = getConfig();
  if (!runtime.iapEnabled) return;

  const useRevenueCat =
    Capacitor.isNativePlatform() &&
    runtime.iap.provider === 'revenuecat' &&
    runtime.iap.revenueCat.apiKey.length > 0;

  if (useRevenueCat) {
    iap.setProvider(
      createIapProvider('revenuecat', {
        revenueCat: {
          apiKey: runtime.iap.revenueCat.apiKey,
          appUserId,
          debug: runtime.debug,
        },
      })
    );
    logger.info('[IAP] RevenueCat provider registered');
    return;
  }

  iap.setProvider(createIapProvider('mock'));
  logger.info('[IAP] Mock provider registered');
}
