export type AdType = 'rewarded' | 'interstitial' | 'banner';

export interface AdReward {
  type: string;
  amount: number;
}

export interface AdShowResult {
  shown: boolean;
  rewarded?: AdReward;
  error?: string;
}

export interface IAdsProvider {
  readonly name: string;
  init(): Promise<void>;
  isReady(type: AdType): boolean;
  preload(type: AdType): Promise<void>;
  showRewarded(placement?: string): Promise<AdShowResult>;
  showInterstitial(placement?: string): Promise<AdShowResult>;
  showBanner(placement?: string): Promise<void>;
  hideBanner(): void;
  destroy(): void;
}
