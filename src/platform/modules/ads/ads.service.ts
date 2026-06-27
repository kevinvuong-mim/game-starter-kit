import {
  ads,
  DEFAULT_REMOTE_CONFIG,
  type AdsRemoteConfig,
} from '@platform/core/advertising';

export interface RewardRequestResult {
  message?: string;
  success: boolean;
  reward?: { type: string; amount: number };
}

export class AdsModuleService {
  private configLoaded = false;
  private runtimeConfig: AdsRemoteConfig = { ...DEFAULT_REMOTE_CONFIG };

  async init(): Promise<void> {
    ads.setRemoteConfig(this.runtimeConfig);
    this.configLoaded = true;
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
      return {
        success: false,
        message: 'Kết nối mạng để nhận thưởng',
      };
    }

    if (!ads.canShowRewarded(placement)) {
      return { success: false, message: 'Reward unavailable' };
    }

    const reward = this.runtimeConfig.rewards[placement];
    if (!reward) {
      return { success: false, message: `No reward configured for placement ${placement}` };
    }

    const adResult = await ads.showRewarded(placement);
    if (!adResult.shown || !adResult.rewarded) {
      return { success: false, message: adResult.error ?? 'Quảng cáo chưa hoàn thành' };
    }

    return {
      success: true,
      reward,
    };
  }

  isConfigLoaded(): boolean {
    return this.configLoaded;
  }
}

export const adsModule = new AdsModuleService();
