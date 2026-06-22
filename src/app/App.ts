import { eventBus } from '@core/events';
import { analytics } from '@core/analytics';
import { ads } from '@core/advertising';
import { iap } from '@core/iap';
import { usePlatformStore } from '@core/state';
import { generateId } from '@core/utils';
import { logger } from '@core/error';
import { i18n } from './modules/localization/i18n.service';
import { settings } from './modules/settings/settings.service';
import { leaderboard } from './modules/leaderboard/leaderboard.service';
import { missions } from './modules/missions/mission.service';
import { dailyRewards } from './modules/daily-rewards/daily-reward.service';
import { saveService } from './modules/save/save.service';

/**
 * App layer orchestrator. Wires platform modules to the event bus.
 * Games never import this directly.
 */
export class App {
  private initialized = false;
  private unsubscribers: Array<() => void> = [];

  async init(): Promise<void> {
    if (this.initialized) return;

    logger.info('[App] Initializing platform...');

    // Ensure user exists
    const store = usePlatformStore.getState();
    if (!store.user.id) {
      store.setUser({ id: generateId('user'), displayName: 'Player' });
    }

    // Settings must load before i18n so language preference is available
    await settings.init();
    await Promise.all([
      i18n.init(),
      analytics.init(),
      ads.init(),
      iap.init(),
      leaderboard.init(),
      dailyRewards.init(),
    ]);

    await saveService.loadLocal();
    missions.init();

    this.bindPlatformEvents();
    this.bindLifecycle();

    this.initialized = true;
    logger.info('[App] Platform ready');
  }

  private bindPlatformEvents(): void {
    this.unsubscribers.push(
      eventBus.on('coin:add', ({ amount }) => {
        usePlatformStore.getState().addCoins(amount);
      }),

      eventBus.on('coin:spend', ({ amount }) => {
        usePlatformStore.getState().spendCoins(amount);
      }),

      eventBus.on('score:update', ({ score }) => {
        usePlatformStore.getState().setHighScore(score);
      }),

      eventBus.on('game:start', () => {
        usePlatformStore.getState().incrementGamesPlayed();
        analytics.track('game_start');
      }),

      eventBus.on('game:over', async ({ score }) => {
        analytics.track('level_complete', { score });
        await leaderboard.submitScore(score, 'daily');
        await saveService.saveLocal();
      }),

      eventBus.on('shop:purchase', ({ itemId, price }) => {
        analytics.track('purchase', { itemId, price });
      }),

      eventBus.on('ad:reward', ({ placement, reward }) => {
        analytics.track('ad_reward', { placement, reward: JSON.stringify(reward) });
      }),

      eventBus.on('save:sync', () => {
        void saveService.sync();
      })
    );
  }

  private bindLifecycle(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        eventBus.emit('app:pause', undefined);
        void saveService.saveLocal();
      } else {
        eventBus.emit('app:resume', undefined);
      }
    });
  }

  destroy(): void {
    missions.destroy();
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.initialized = false;
  }
}

export const app = new App();
