import { Capacitor } from '@capacitor/core';

import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { deepLinkService } from './deep-link.service';
import { parseDeepLinkUrl } from './deep-link.parser';

type Teardown = () => void;

/**
 * Capacitor-facing bridge. Translates native / web URL opens into DeepLinkService calls.
 * Navigation remains Phaser's responsibility via EventBus + navigationService.
 */
export async function initAppBridge(): Promise<Teardown> {
  const teardowns: Teardown[] = [];

  if (Capacitor.isNativePlatform()) {
    teardowns.push(await bindNativeAppBridge());
  } else {
    teardowns.push(bindWebAppBridge());
  }

  return () => {
    for (const teardown of teardowns) teardown();
  };
}

async function bindNativeAppBridge(): Promise<Teardown> {
  const { App } = await import('@capacitor/app');

  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) {
      deepLinkService.handleUrl(launch.url, 'cold_start');
    }
  } catch (error) {
    logger.warn('[AppBridge] getLaunchUrl failed', error);
  }

  const listener = await App.addListener('appUrlOpen', ({ url }) => {
    deepLinkService.handleUrl(url, 'app_url_open');
  });

  return () => {
    void listener.remove();
  };
}

function bindWebAppBridge(): Teardown {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleCurrentUrl = () => {
    const { deepLink } = getConfig();
    const parsed = parseDeepLinkUrl(window.location.href, deepLink, 'web');
    if (!parsed) {
      return;
    }

    deepLinkService.handleUrl(window.location.href, 'web');
  };

  const onPopState = () => {
    handleCurrentUrl();
  };

  handleCurrentUrl();
  window.addEventListener('popstate', onPopState);

  return () => {
    window.removeEventListener('popstate', onPopState);
  };
}
