import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';

let capacitorInitialized = false;

/**
 * Initialize native Capacitor plugins after platform bootstrap.
 * No-ops on web.
 */
export async function initCapacitorPlugins(): Promise<void> {
  if (!Capacitor.isNativePlatform() || capacitorInitialized) return;

  try {
    const [{ App }, { StatusBar }] = await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/status-bar'),
    ]);

    if (Capacitor.getPlatform() === 'android') {
      await StatusBar.setOverlaysWebView({ overlay: true });
    }
    await StatusBar.hide();

    await App.addListener('backButton', () => {
      eventBus.emit('app:back', undefined);
    });

    capacitorInitialized = true;
    logger.info('[Capacitor] Native plugins initialized');
  } catch (error) {
    logger.warn('[Capacitor] Plugin init failed', error);
  }
}

/** Hide native splash once the Phaser shell is ready (`app:ready`). */
export async function hideNativeSplash(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch (error) {
    logger.warn('[Capacitor] Splash hide failed', error);
  }
}
