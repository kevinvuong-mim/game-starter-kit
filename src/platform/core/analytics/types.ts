export const AnalyticsEvents = {
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  GAME_START: 'game_start',
  GAME_OVER: 'game_over',
  LEVEL_START: 'level_start',
  LEVEL_COMPLETE: 'level_complete',
  PURCHASE: 'purchase',
  AD_REWARD: 'ad_reward',
  SHOP_OPEN: 'shop_open',
  DAILY_CLAIM: 'daily_claim',
  MISSION_COMPLETE: 'mission_complete',
} as const;

export type AnalyticsEvent = (typeof AnalyticsEvents)[keyof typeof AnalyticsEvents];

export interface AnalyticsParams {
  [key: string]: string | number | boolean | undefined;
}

export interface IAnalyticsProvider {
  readonly name: string;
  init(): Promise<void>;
  track(event: AnalyticsEvent, params?: AnalyticsParams): void;
  setUserId(userId: string): void;
  setUserProperty(key: string, value: string): void;
  flush(): Promise<void>;
  reset?(): Promise<void>;
  shutdown?(): Promise<void>;
}
