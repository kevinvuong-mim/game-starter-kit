import { Capacitor } from '@capacitor/core';
import { services } from '@platform/core/services';
import { createAdsProvider } from '@platform/core/advertising';

const { config, ads } = services;

/**
 * Registers the ads provider based on runtime config and platform.
 * Falls back to mock on web or when provider init fails (handled in AdsService).
 */
export function registerAdsProvider(): void {
  const runtime = config();
  if (!runtime.adsEnabled) return;

  const providerName =
    Capacitor.isNativePlatform() && runtime.ads.provider === 'admob' ? 'admob' : 'mock';

  ads.setProvider(createAdsProvider(providerName));
}
