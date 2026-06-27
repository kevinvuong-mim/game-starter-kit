import { Capacitor } from '@capacitor/core';
import { getConfig } from '@platform/core/config';
import { usePlatformStore } from '@platform/core/state';
import { iap, createIapProvider } from '@platform/modules/iap';
import { logger } from '@platform/core/error';

/**
 * Registers the IAP provider based on runtime config and platform.
 * Native + revenuecat → RevenueCat SDK; web/dev → mock.
 */
export function registerIapProvider(): void {
  const runtime = getConfig();
  if (!runtime.iapEnabled) return;

  const useRevenueCat =
    Capacitor.isNativePlatform() &&
    runtime.iap.provider === 'revenuecat' &&
    runtime.iap.revenueCat.apiKey.length > 0;

  if (useRevenueCat) {
    const appUserId = usePlatformStore.getState().user.id || undefined;
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
