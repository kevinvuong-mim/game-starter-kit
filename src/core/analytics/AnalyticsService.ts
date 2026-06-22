import { getConfig } from '../config';
import { logger } from '../error';
import type { AnalyticsEvent, AnalyticsParams, IAnalyticsProvider } from './types';

export class ConsoleAnalyticsProvider implements IAnalyticsProvider {
  readonly name = 'console';

  async init(): Promise<void> {
    logger.info('[Analytics] Console provider initialized');
  }

  track(event: AnalyticsEvent, params?: AnalyticsParams): void {
    if (getConfig().debug) {
      logger.debug(`[Analytics] ${event}`, params);
    }
  }

  setUserId(userId: string): void {
    logger.debug(`[Analytics] setUserId: ${userId}`);
  }

  setUserProperty(key: string, value: string): void {
    logger.debug(`[Analytics] setUserProperty: ${key}=${value}`);
  }

  async flush(): Promise<void> {}
}

export class AnalyticsService {
  private providers: IAnalyticsProvider[] = [];
  private enabled = true;
  private userId: string | null = null;

  constructor() {
    this.enabled = getConfig().analyticsEnabled;
  }

  registerProvider(provider: IAnalyticsProvider): void {
    this.providers.push(provider);
  }

  async init(): Promise<void> {
    if (!this.enabled) return;
    await Promise.all(this.providers.map((p) => p.init()));
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  track(event: AnalyticsEvent, params?: AnalyticsParams): void {
    if (!this.enabled) return;
    const enriched = { ...params, userId: this.userId ?? undefined };
    for (const provider of this.providers) {
      provider.track(event, enriched);
    }
  }

  setUserId(userId: string): void {
    this.userId = userId;
    for (const provider of this.providers) {
      provider.setUserId(userId);
    }
  }

  setUserProperty(key: string, value: string): void {
    for (const provider of this.providers) {
      provider.setUserProperty(key, value);
    }
  }

  async flush(): Promise<void> {
    await Promise.all(this.providers.map((p) => p.flush()));
  }
}

export const analytics = new AnalyticsService();
analytics.registerProvider(new ConsoleAnalyticsProvider());
