import {
  trackAdReward,
  trackGameOver,
  trackPurchase,
  trackGameStart,
  trackDailyClaim,
  trackSessionEnd,
  trackLevelComplete,
  trackMissionComplete,
} from '@platform/core/analytics/events';
import { logger } from '@platform/core/error';
import { generateId } from '@platform/core/utils';
import { services } from '@platform/core/services';
import { usePlatformStore } from '@platform/core/state';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { saveService } from '@platform/modules/save/save.service';
import { missions } from '@platform/modules/missions/mission.service';
import { settings } from '@platform/modules/settings/settings.service';
import { registerAnalyticsProviders } from '@platform/bootstrap/analytics';
import { leaderboard } from '@platform/modules/leaderboard/leaderboard.service';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';
import { hideNativeSplash } from '@platform/bootstrap/capacitor';

const { events, analytics, ads, iap, config } = services;

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

    registerAnalyticsProviders();

    await Promise.all([i18n.init(), analytics.init(), ads.init(), iap.init(), leaderboard.init()]);

    analytics.setUserId(usePlatformStore.getState().user.id);
    analytics.setUserProperty('game_id', config().gameId);

    await saveService.loadLocal();
    await dailyRewards.init();
    await settings.init();
    missions.init();

    this.bindPlatformEvents();
    this.bindLifecycle();

    this.initialized = true;
    logger.info('[App] Platform ready');
  }

  private bindPlatformEvents(): void {
    const forwardAnalytics = events.on('analytics', ({ event, params }) => {
      analytics.track(event, params);
    });

    const forwardLegacyAnalytics = events.on('analytics:track', ({ event, params }) => {
      analytics.track(event, params);
    });

    this.unsubscribers.push(
      forwardAnalytics,
      forwardLegacyAnalytics,

      events.on('app:ready', () => {
        logger.info('[App] Game shell ready');
        void hideNativeSplash();
      }),

      events.on('coin:add', ({ amount }) => {
        usePlatformStore.getState().addCoins(amount);
      }),

      events.on('coin:spend', ({ amount }) => {
        usePlatformStore.getState().spendCoins(amount);
      }),

      events.on('score:update', ({ score }) => {
        usePlatformStore.getState().setHighScore(score);
      }),

      events.on('game:start', () => {
        usePlatformStore.getState().incrementGamesPlayed();
        trackGameStart();
      }),

      events.on('game:over', async ({ score, duration, jumps }) => {
        trackGameOver({ score, duration, jumps });
        await leaderboard.submitScore(score, 'daily');
        await saveService.saveLocal();
      }),

      events.on('level:complete', ({ level, stars }) => {
        trackLevelComplete({ level, stars });
      }),

      events.on('mission:complete', ({ missionId }) => {
        trackMissionComplete({ missionId });
      }),

      events.on('settings:change', () => {
        void saveService.saveLocal();
      }),

      events.on('daily:status:request', () => {
        events.emit('daily:status', { canClaim: dailyRewards.canClaim() });
      }),

      events.on('daily:claim:request', async () => {
        const reward = await dailyRewards.claim();
        if (reward) {
          trackDailyClaim({
            day: reward.day,
            coins: reward.reward.coins,
          });
          await saveService.saveLocal();
          events.emit('daily:claim:result', {
            success: true,
            coins: reward.reward.coins,
          });
        } else {
          events.emit('daily:claim:result', {
            success: false,
            message: 'Cooldown active',
          });
        }
      }),

      events.on('shop:purchase', ({ itemId, price }) => {
        trackPurchase({ itemId, price });
        void saveService.saveLocal();
      }),

      events.on('shop:restore', () => {
        void saveService.saveLocal();
      }),

      events.on('game:destroy', () => {
        void saveService.saveLocal();
      }),

      events.on('ad:reward', ({ placement, reward }) => {
        trackAdReward({ placement, reward: JSON.stringify(reward) });
      }),

      events.on('save:sync', () => {
        void saveService.sync();
      })
    );
  }

  private bindLifecycle(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        trackSessionEnd();
        events.emit('app:pause', undefined);
        void saveService.saveLocal();
        void analytics.flush();
      } else {
        events.emit('app:resume', undefined);
      }
    });
  }

  async destroy(): Promise<void> {
    trackSessionEnd();
    await saveService.saveLocal();
    await analytics.flush();
    await analytics.shutdown();
    analytics.clearProviders();
    missions.destroy();
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.initialized = false;
  }
}

export const app = new App();
