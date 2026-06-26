import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import type { ApiEnvelope } from '@platform/core/api';
import type { AdsRemoteConfig } from '@platform/core/advertising';

export interface StartRewardSessionResponse {
  expiresAt: string;
  rewardSessionId: string;
}

export interface ClaimRewardResponse {
  success: boolean;
  reward: {
    type: string;
    amount: number;
  };
  placement: string;
}

const CONFIG_CACHE_KEY = 'ads_remote_config_v1';

export class AdsRepository {
  async fetchConfig(): Promise<AdsRemoteConfig> {
    const envelope = await apiClient.get<ApiEnvelope<AdsRemoteConfig>>('/ads/config', {
      auth: false,
      timeout: 10_000,
    });
    return envelope.data;
  }

  async loadCachedConfig(): Promise<AdsRemoteConfig | null> {
    return storage.load<AdsRemoteConfig>(CONFIG_CACHE_KEY);
  }

  async saveCachedConfig(config: AdsRemoteConfig): Promise<void> {
    await storage.save(CONFIG_CACHE_KEY, config);
  }

  async startRewardSession(placement: string): Promise<StartRewardSessionResponse> {
    const envelope = await apiClient.post<ApiEnvelope<StartRewardSessionResponse>>(
      '/ads/reward/start',
      { placement }
    );
    return envelope.data;
  }

  async claimReward(input: {
    rewardSessionId: string;
    provider: string;
    providerPayload: Record<string, unknown>;
  }): Promise<ClaimRewardResponse> {
    const envelope = await apiClient.post<ApiEnvelope<ClaimRewardResponse>>(
      '/ads/reward/claim',
      input
    );
    return envelope.data;
  }

  async logEvent(event: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await apiClient.post('/ads/events', { event, metadata });
    } catch {
      // Best-effort analytics; never block gameplay.
    }
  }
}

export const adsRepository = new AdsRepository();
