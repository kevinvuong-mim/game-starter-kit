/**
 * Platform event map. Games emit gameplay events only.
 * App modules subscribe and react.
 */
export interface PlatformEventMap {
  // Lifecycle
  'app:ready': void;
  'app:pause': void;
  'app:resume': void;
  'game:init': { gameId: string };
  'game:start': { gameId: string };
  'game:pause': void;
  'game:resume': void;
  'game:over': { score: number; duration: number };
  'game:destroy': void;

  // Gameplay (game layer emits, platform consumes)
  'coin:add': { amount: number; source?: string };
  'coin:spend': { amount: number; reason?: string };
  'score:update': { score: number };
  'level:complete': { level: number; stars?: number };
  'jump': { count?: number };
  'collect': { itemId: string; count?: number };

  // Platform
  'mission:update': { missionId: string; progress: number };
  'mission:complete': { missionId: string };
  'shop:purchase': { itemId: string; price: number };
  'shop:restore': void;
  'daily:claim': { day: number; streak: number };
  'leaderboard:submit': { score: number; board: string };
  'settings:change': { key: string; value: unknown };
  'analytics:track': { event: string; params?: Record<string, unknown> };
  'ad:reward': { placement: string; reward: unknown };
  'iap:purchase': { productId: string };
  'save:sync': void;
  'error:report': { error: Error; context?: string };
}

export type PlatformEvent = keyof PlatformEventMap;

export type EventHandler<T extends PlatformEvent> = (
  payload: PlatformEventMap[T]
) => void | Promise<void>;

export interface IEventBus {
  emit<T extends PlatformEvent>(event: T, payload: PlatformEventMap[T]): void;
  on<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
  off<T extends PlatformEvent>(event: T, handler: EventHandler<T>): void;
  once<T extends PlatformEvent>(event: T, handler: EventHandler<T>): () => void;
  clear(): void;
}
