import {
  AD_ANALYTICS_EVENTS,
  type AdsRemoteConfig,
  DEFAULT_REMOTE_CONFIG,
} from '@platform/core/advertising';
import { logger } from '@platform/core/error';
import { guest } from '@platform/modules/guest';
import { ads } from '@platform/core/advertising';
import { adsRepository } from './ads.repository';
import { getConfig } from '@platform/core/config';

export interface RewardRequestResult {
  message?: string;
  success: boolean;
  reward?: { type: string; amount: number };
}

export class AdsModuleService {
  private configLoaded = false;

  async init(): Promise<void> {
    await this.loadRemoteConfig();

    ads.setAnalyticsHandler((event, metadata) => {
      void adsRepository.logEvent(event, metadata);
    });
  }

  async loadRemoteConfig(): Promise<AdsRemoteConfig> {
    const cached = await adsRepository.loadCachedConfig();
    if (cached) {
      ads.setRemoteConfig(cached);
    } else {
      ads.setRemoteConfig({ ...DEFAULT_REMOTE_CONFIG });
    }

    if (!getConfig().apiUrl) {
      this.configLoaded = true;
      return ads.getRemoteConfig();
    }

    try {
      const remote = await adsRepository.fetchConfig();
      ads.setRemoteConfig(remote);
      await adsRepository.saveCachedConfig(remote);
      this.configLoaded = true;
      return remote;
    } catch (error) {
      logger.warn('[AdsModule] Failed to fetch remote config, using cache/fallback', error);
      this.configLoaded = true;
      return ads.getRemoteConfig();
    }
  }

  async showPlacement(placement: string): Promise<{ shown: boolean; error?: string }> {
    const format = ads.resolveFormat(placement);
    if (!format) {
      return { shown: false, error: 'Unknown placement' };
    }

    switch (format) {
      case 'interstitial': {
        const result = await ads.showInterstitial(placement);
        return { shown: result.shown, error: result.error };
      }
      case 'banner':
        await ads.showBanner(placement);
        return { shown: true };
      case 'app_open': {
        const result = await ads.showAppOpen(placement);
        return { shown: result.shown, error: result.error };
      }
      default:
        return { shown: false, error: 'Use requestReward for rewarded placements' };
    }
  }

  async hideBannerForContext(context: string): Promise<void> {
    if (context === 'GAMEPLAY' || context === 'CUTSCENE' || context === 'COMBAT') {
      await ads.hideBanner();
    }
  }

  async requestReward(placement: string): Promise<RewardRequestResult> {
    if (!ads.isOnline()) {
      ads.setAnalyticsHandler((event, metadata) => {
        void adsRepository.logEvent(event, metadata);
      });
      void adsRepository.logEvent(AD_ANALYTICS_EVENTS.OFFLINE_REWARD_BLOCKED, { placement });
      return {
        success: false,
        message: 'Kết nối mạng để nhận thưởng',
      };
    }

    if (!ads.canShowRewarded(placement)) {
      return { success: false, message: 'Reward unavailable' };
    }

    const guestId = await guest.ensureGuestId();
    if (!guestId) {
      return { success: false, message: 'Kết nối mạng để nhận thưởng' };
    }

    let session;
    try {
      session = await adsRepository.startRewardSession(placement);
    } catch (error) {
      logger.warn('[AdsModule] Failed to start reward session', error);
      return { success: false, message: 'Không thể bắt đầu phiên thưởng' };
    }

    const adResult = await ads.showRewarded(placement);
    if (!adResult.shown || !adResult.rewarded) {
      return { success: false, message: adResult.error ?? 'Quảng cáo chưa hoàn thành' };
    }

    try {
      const claim = await adsRepository.claimReward({
        rewardSessionId: session.rewardSessionId,
        provider: ads.getProviderName(),
        providerPayload: adResult.providerPayload ?? {
          shown: adResult.shown,
          rewarded: adResult.rewarded,
          transactionId: adResult.transactionId,
        },
      });

      return {
        success: claim.success,
        reward: claim.reward,
      };
    } catch (error) {
      logger.warn('[AdsModule] Reward claim failed', error);
      return { success: false, message: 'Xác minh thưởng thất bại' };
    }
  }

  isConfigLoaded(): boolean {
    return this.configLoaded;
  }
}

export const adsModule = new AdsModuleService();
