/**
 * Platform event map. Games emit gameplay events only.
 * App modules subscribe and react.
 */
import type {
  IapPurchaseFailedPayload,
  IapRestoreSuccessPayload,
  IapPurchaseSuccessPayload,
  IapEntitlementChangedPayload,
} from '@platform/modules/iap/events/iap.events';
import type { AnalyticsEvent, AnalyticsParams } from '../analytics/types';
import type { SyncResponse } from '@platform/modules/game-sync/game-sync.model';
import type { LeaderboardView } from '@platform/modules/leaderboard/leaderboard.model';
import type { RewardProgress } from '@platform/modules/daily-rewards/daily-reward.model';

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
  'shop:restore': void;
  'ad:banner:hide': void;
  'daily:claim:request': void;
  'game:synced': SyncResponse;
  'daily:status:request': void;
  'daily:progress:request': void;
  'daily:progress': RewardProgress;
  'daily:claim:result': {
    day?: number;
    coins?: number;
    itemId?: string;
    success: boolean;
    message?: string;
    rewardType?: 'coins' | 'chest';
  };
  'leaderboard:page': { page: number };
  'leaderboard:update': LeaderboardView;
  'ad:show:request': { placement: string };
  'ad:context:change': { context: string };
  'mission:complete': { missionId: string };
  'ad:reward:request': { placement: string };
  'ad:reward:result': {
    message?: string;
    success: boolean;
    placement: string;
    reward?: { type: string; amount: number };
  };
  'daily:claim': { day: number; streak: number };
  'iap:purchase:failed': IapPurchaseFailedPayload;
  'iap:restore:success': IapRestoreSuccessPayload;
  'iap:purchase:success': IapPurchaseSuccessPayload;
  'error:report': { error: Error; context?: string };
  'settings:change': { key: string; value: unknown };
  'shop:purchase': { itemId: string; price: number };
  'ad:reward': { placement: string; reward: unknown };
  'leaderboard:refresh': { page?: number } | undefined;
  'leaderboard:request': { page?: number } | undefined;
  'iap:entitlement:changed': IapEntitlementChangedPayload;
  'auth:sign-in:request': { provider: 'google' | 'apple' };
  'mission:update': { missionId: string; progress: number };
  analytics: { event: AnalyticsEvent; params?: AnalyticsParams };
  'daily:status': { canClaim: boolean; timeManipulated: boolean };
  'game:sync:dropped': { clientResultId: string; attempts: number };
  'analytics:track': { event: AnalyticsEvent; params?: AnalyticsParams };
  'ad:show:result': { placement: string; shown: boolean; error?: string };
}

export interface IEventBus {
  clear(): void;
  off<T extends PlatformEvent>(event: T, handler: EventHandler<T>): void;
  emit<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): void;
  on<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
  once<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
}
