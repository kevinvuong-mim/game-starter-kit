import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';

/**
 * Initialize native Capacitor plugins after platform bootstrap.
 * No-ops on web.
 */
export async function initCapacitorPlugins(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const [{ App }, { SplashScreen }, { StatusBar, Style }] = await Promise.all([
      import('@capacitor/app'),
      import('@capacitor/splash-screen'),
      import('@capacitor/status-bar'),
    ]);

    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#1a1a2e' });
    await SplashScreen.hide();

    await App.addListener('backButton', () => {
      eventBus.emit('app:back', undefined);
    });

    logger.info('[Capacitor] Native plugins initialized');
  } catch (error) {
    logger.warn('[Capacitor] Plugin init failed', error);
  }
}
