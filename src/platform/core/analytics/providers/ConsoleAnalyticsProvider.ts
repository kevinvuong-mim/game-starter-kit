import { getConfig } from '../../config';
import { logger } from '../../error';
import type { AnalyticsEvent, AnalyticsParams, IAnalyticsProvider } from '../types';

export class ConsoleAnalyticsProvider implements IAnalyticsProvider {
  readonly name = 'console';

  async init(): Promise<void> {
    if (getConfig().debug) {
      logger.info('[Analytics][init] Console provider initialized');
    }
  }

  track(event: AnalyticsEvent, params?: AnalyticsParams): void {
    if (!getConfig().debug) return;
    logger.debug(`[Analytics][track] ${event}`, params);
  }

  setUserId(userId: string): void {
    if (!getConfig().debug) return;
    logger.debug(`[Analytics][user] setUserId: ${userId}`);
  }

  setUserProperty(key: string, value: string): void {
    if (!getConfig().debug) return;
    logger.debug(`[Analytics][property] ${key}=${value}`);
  }

  async flush(): Promise<void> {}
}
