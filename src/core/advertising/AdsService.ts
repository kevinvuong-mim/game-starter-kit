import { getConfig } from '../config';
import { logger } from '../error';
import type { AdShowResult, AdType, IAdsProvider } from './types';

export class MockAdsProvider implements IAdsProvider {
  readonly name = 'mock';

  async init(): Promise<void> {
    logger.info('[Ads] Mock provider initialized');
  }

  isReady(_type: AdType): boolean {
    return true;
  }

  async preload(_type: AdType): Promise<void> {}

  async showRewarded(placement = 'default'): Promise<AdShowResult> {
    logger.info(`[Ads] Mock rewarded ad shown: ${placement}`);
    await new Promise((r) => setTimeout(r, 500));
    return { shown: true, rewarded: { type: 'coins', amount: 50 } };
  }

  async showInterstitial(placement = 'default'): Promise<AdShowResult> {
    logger.info(`[Ads] Mock interstitial shown: ${placement}`);
    await new Promise((r) => setTimeout(r, 300));
    return { shown: true };
  }

  async showBanner(placement = 'default'): Promise<void> {
    logger.info(`[Ads] Mock banner shown: ${placement}`);
  }

  hideBanner(): void {
    logger.info('[Ads] Mock banner hidden');
  }

  destroy(): void {}
}

export class AdsService {
  private provider: IAdsProvider | null = null;
  private enabled = true;

  constructor() {
    this.enabled = getConfig().adsEnabled;
  }

  setProvider(provider: IAdsProvider): void {
    this.provider = provider;
  }

  async init(): Promise<void> {
    if (!this.enabled || !this.provider) return;
    await this.provider.init();
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isReady(type: AdType): boolean {
    if (!this.enabled || !this.provider) return false;
    return this.provider.isReady(type);
  }

  async preload(type: AdType): Promise<void> {
    if (!this.enabled || !this.provider) return;
    await this.provider.preload(type);
  }

  async showRewarded(placement?: string): Promise<AdShowResult> {
    if (!this.enabled || !this.provider) {
      return { shown: false, error: 'Ads disabled' };
    }
    return this.provider.showRewarded(placement);
  }

  async showInterstitial(placement?: string): Promise<AdShowResult> {
    if (!this.enabled || !this.provider) {
      return { shown: false, error: 'Ads disabled' };
    }
    return this.provider.showInterstitial(placement);
  }

  async showBanner(placement?: string): Promise<void> {
    if (!this.enabled || !this.provider) return;
    await this.provider.showBanner(placement);
  }

  hideBanner(): void {
    this.provider?.hideBanner();
  }

  destroy(): void {
    this.provider?.destroy();
  }
}

export const ads = new AdsService();
ads.setProvider(new MockAdsProvider());
