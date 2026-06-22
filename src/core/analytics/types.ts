export type AnalyticsEvent =
  | 'session_start'
  | 'game_start'
  | 'level_complete'
  | 'purchase'
  | 'ad_reward'
  | 'custom';

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
}
