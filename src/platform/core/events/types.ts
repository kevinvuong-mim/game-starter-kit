/**
 * Platform event map. Games emit gameplay events only.
 * App modules subscribe and react.
 */
import type { AnalyticsEvent, AnalyticsParams } from '../analytics/types';
import type {
  SyncResponse,
  SyncRejectionReason,
} from '@platform/modules/game-sync/game-sync.model';
import type { LeaderboardView } from '@platform/modules/leaderboard/leaderboard.model';
import type { RewardProgress } from '@platform/modules/daily-rewards/daily-reward.model';
import type {
  IapEntitlementChangedPayload,
  IapPurchaseFailedPayload,
  IapPurchaseSuccessPayload,
  IapRestoreSuccessPayload,
} from '@platform/modules/iap/events/iap.events';

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
  'game:sync:rejected': {
    gameId: string;
    items: Array<{ score: number; replayHash: string; reason: SyncRejectionReason }>;
  };
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
  'iap:purchase:success': IapPurchaseSuccessPayload;
  'iap:purchase:failed': IapPurchaseFailedPayload;
  'iap:restore:success': IapRestoreSuccessPayload;
  'iap:entitlement:changed': IapEntitlementChangedPayload;
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
  'error:report': { error: Error; context?: string };
  'settings:change': { key: string; value: unknown };
  'shop:purchase': { itemId: string; price: number };
  'ad:reward': { placement: string; reward: unknown };
  'leaderboard:request': { page?: number } | undefined;
  'leaderboard:refresh': { page?: number } | undefined;
  'auth:sign-in:request': { provider: 'google' | 'apple' };
  'mission:update': { missionId: string; progress: number };
  analytics: { event: AnalyticsEvent; params?: AnalyticsParams };
  'daily:status': { canClaim: boolean; timeManipulated: boolean };
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
