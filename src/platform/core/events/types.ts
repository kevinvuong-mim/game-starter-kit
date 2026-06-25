/**
 * Platform event map. Games emit gameplay events only.
 * App modules subscribe and react.
 */
import type { AnalyticsEvent, AnalyticsParams } from '../analytics/types';
import type { SyncResponse } from '@platform/modules/game-sync/game-sync.model';
import type { RewardProgress } from '@platform/modules/daily-rewards/daily-reward.model';
import type { LeaderboardView } from '@platform/modules/leaderboard/leaderboard.model';

export type PlatformEvent = keyof PlatformEventMap;

export type EventHandler<T extends PlatformEvent> = (
  payload: PlatformEventMap[T]
) => void | Promise<void>;

export interface PlatformEventMap {
  // Gameplay (game layer emits, platform consumes)
  jump: { count?: number };
  'score:update': { score: number };
  collect: { itemId: string; count?: number };
  'coin:add': { amount: number; source?: string };
  'coin:spend': { amount: number; reason?: string };
  'level:complete': { level: number; stars?: number };

  // Lifecycle
  'app:back': void;
  'app:ready': void;
  'app:pause': void;
  'game:pause': void;
  'app:resume': void;
  'game:resume': void;
  'game:destroy': void;
  'game:init': { gameId: string };
  'game:start': { gameId: string };
  'game:over': { score: number; jumps?: number; duration: number };

  // Platform
  'save:sync': void;
  'shop:restore': void;
  'daily:claim:result': {
    day?: number;
    coins?: number;
    itemId?: string;
    success: boolean;
    message?: string;
    rewardType?: 'coins' | 'chest';
  };
  'daily:claim:request': void;
  'daily:progress:request': void;
  'daily:progress': RewardProgress;
  'daily:status:request': void;
  'daily:status': { canClaim: boolean; timeManipulated: boolean };
  'iap:purchase': { productId: string };
  'mission:complete': { missionId: string };
  'daily:claim': { day: number; streak: number };
  'error:report': { error: Error; context?: string };
  'settings:change': { key: string; value: unknown };
  'shop:purchase': { itemId: string; price: number };
  'ad:reward': { placement: string; reward: unknown };
  'game:synced': SyncResponse;
  'leaderboard:request': void;
  'leaderboard:refresh': void;
  'leaderboard:update': LeaderboardView;
  'auth:sign-in:request': { provider: 'google' | 'apple' };
  'mission:update': { missionId: string; progress: number };
  analytics: { event: AnalyticsEvent; params?: AnalyticsParams };
  'analytics:track': { event: AnalyticsEvent; params?: AnalyticsParams };
}

export interface IEventBus {
  clear(): void;
  off<T extends PlatformEvent>(event: T, handler: EventHandler<T>): void;
  emit<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): void;
  on<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
  once<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
}
