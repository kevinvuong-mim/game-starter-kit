import { eventBus } from '@platform/core/events';
import type { AnalyticsEvent, AnalyticsParams } from '@platform/core/analytics/types';
import { analytics } from '@platform/core/analytics';
import { ads } from '@platform/core/advertising';
import { iap } from '@platform/core/iap';
import { usePlatformStore } from '@platform/core/state';
import { generateId } from '@platform/core/utils';
import { logger } from '@platform/core/error';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { settings } from '@platform/modules/settings/settings.service';
import { leaderboard } from '@platform/modules/leaderboard/leaderboard.service';
import { missions } from '@platform/modules/missions/mission.service';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';
import { saveService } from '@platform/modules/save/save.service';

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

    const store = usePlatformStore.getState();
    if (!store.user.id) {
      store.setUser({ id: generateId('user'), displayName: 'Player' });
    }

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

      eventBus.on('game:over', async ({ score, jumps }) => {
        analytics.track('level_complete', { score, jumps });
        await leaderboard.submitScore(score, 'daily');
        await saveService.saveLocal();
      }),

      eventBus.on('analytics:track', ({ event, params }) => {
        analytics.track(event as AnalyticsEvent, params as AnalyticsParams | undefined);
      }),

      eventBus.on('settings:set', async ({ key, value }) => {
        if (key === 'language' && typeof value === 'string') {
          await settings.setLanguage(value);
        } else if (key === 'soundEnabled' && typeof value === 'boolean') {
          await settings.setSoundEnabled(value);
        } else if (key === 'musicEnabled' && typeof value === 'boolean') {
          await settings.setMusicEnabled(value);
        } else if (key === 'vibrationEnabled' && typeof value === 'boolean') {
          await settings.setVibrationEnabled(value);
        } else if (
          key === 'graphicsQuality' &&
          (value === 'low' || value === 'medium' || value === 'high')
        ) {
          await settings.setGraphicsQuality(value);
        }
      }),

      eventBus.on('daily:status:request', () => {
        eventBus.emit('daily:status', { canClaim: dailyRewards.canClaim() });
      }),

      eventBus.on('daily:claim:request', async () => {
        const reward = await dailyRewards.claim();
        if (reward) {
          eventBus.emit('daily:claim:result', {
            success: true,
            coins: reward.reward.coins,
            gems: reward.reward.gems,
          });
        } else {
          eventBus.emit('daily:claim:result', {
            success: false,
            message: 'Cooldown active',
          });
        }
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
