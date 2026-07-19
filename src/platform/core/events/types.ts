/**
 * Platform event map. Games emit gameplay events only.
 * App modules subscribe and react.
 */
import type {
  IapPurchaseFailedPayload,
  IapRestoreSuccessPayload,
  IapPurchaseSuccessPayload,
  IapEntitlementChangedPayload,
} from '@platform/modules/iap/iap.events';
import type { AnalyticsEvent, AnalyticsParams } from '../analytics/types';
import type { DeepLinkPayload } from '@platform/modules/deep-link/deep-link.model';
import type { LeaderboardView } from '@platform/modules/leaderboard/leaderboard.model';
import type { RewardProgress } from '@platform/modules/daily-reward/daily-reward.model';

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

  // Lifecycle
  'app:back': void;
  'app:ready': void;
  'app:pause': void;
  'app:resume': void;
  'game:destroy': void;
  'game:start': { gameId: string };
  'game:over': { score: number; jumps?: number; duration: number };

  // Platform
  'shop:restore': void;
  'ad:banner:hide': void;
  'daily:claim:request': void;
  'daily:status:request': void;
  'boot:preload-complete': void;
  'daily:progress:request': void;
  'daily:progress': RewardProgress;
  'deeplink:open': DeepLinkPayload;
  'shop:equip': { itemId: string };
  'daily:claim:result': {
    day?: number;
    coins?: number;
    itemId?: string;
    success: boolean;
    message?: string;
    rewardType?: 'coins' | 'chest';
  };
  'deeplink:received': DeepLinkPayload;
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
  'settings:change': { key: string; value: unknown };
  'shop:purchase': { itemId: string; price: number };
  'ad:reward': { placement: string; reward: unknown };
  'leaderboard:refresh': { page?: number } | undefined;
  'iap:entitlement:changed': IapEntitlementChangedPayload;
  'mission:update': { missionId: string; progress: number };
  'game:sync:completed': { rank: number; bestScore: number };
  analytics: { event: AnalyticsEvent; params?: AnalyticsParams };
  'daily:status': { canClaim: boolean; timeManipulated: boolean };
  'game:sync:dropped': { clientResultId: string; attempts: number };
  'ad:show:result': { placement: string; shown: boolean; error?: string };
}

export interface IEventBus {
  clear(): void;
  off<T extends PlatformEvent>(event: T, handler: EventHandler<T>): void;
  emit<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): void;
  emitAsync<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): Promise<void>;
  on<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
  once<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
}
