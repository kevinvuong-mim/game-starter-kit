export type AdType = 'banner' | 'rewarded' | 'interstitial';

export interface AdReward {
  type: string;
  amount: number;
}

export interface AdShowResult {
  error?: string;
  shown: boolean;
  rewarded?: AdReward;
}

export interface IAdsProvider {
  destroy(): void;
  hideBanner(): void;
  init(): Promise<void>;
  readonly name: string;
  isReady(type: AdType): boolean;
  preload(type: AdType): Promise<void>;
  showBanner(placement?: string): Promise<void>;
  showRewarded(placement?: string): Promise<AdShowResult>;
  showInterstitial(placement?: string): Promise<AdShowResult>;
}
