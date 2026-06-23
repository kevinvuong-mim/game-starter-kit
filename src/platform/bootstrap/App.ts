import { iap } from '@platform/core/iap';
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
import { ads } from '@platform/core/advertising';
import { eventBus } from '@platform/core/events';
import { generateId } from '@platform/core/utils';
import { getConfig } from '@platform/core/config';
import { analytics } from '@platform/core/analytics';
import { usePlatformStore } from '@platform/core/state';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { saveService } from '@platform/modules/save/save.service';
import { missions } from '@platform/modules/missions/mission.service';
import { settings } from '@platform/modules/settings/settings.service';
import { registerAnalyticsProviders } from '@platform/bootstrap/analytics';
import { leaderboard } from '@platform/modules/leaderboard/leaderboard.service';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';

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

    await Promise.all([
      i18n.init(),
      analytics.init(),
      ads.init(),
      iap.init(),
      leaderboard.init(),
      dailyRewards.init(),
    ]);

    analytics.setUserId(usePlatformStore.getState().user.id);
    analytics.setUserProperty('game_id', getConfig().gameId);

    await saveService.loadLocal();
    await settings.init();
    missions.init();

    this.bindPlatformEvents();
    this.bindLifecycle();

    this.initialized = true;
    logger.info('[App] Platform ready');
  }

  private bindPlatformEvents(): void {
    const forwardAnalytics = eventBus.on('analytics', ({ event, params }) => {
      analytics.track(event, params);
    });

    const forwardLegacyAnalytics = eventBus.on('analytics:track', ({ event, params }) => {
      analytics.track(event, params);
    });

    this.unsubscribers.push(
      forwardAnalytics,
      forwardLegacyAnalytics,

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
        trackGameStart();
      }),

      eventBus.on('game:over', async ({ score, duration, jumps }) => {
        trackGameOver({ score, duration, jumps });
        await leaderboard.submitScore(score, 'daily');
        await saveService.saveLocal();
      }),

      eventBus.on('level:complete', ({ level, stars }) => {
        trackLevelComplete({ level, stars });
      }),

      eventBus.on('mission:complete', ({ missionId }) => {
        trackMissionComplete({ missionId });
      }),

      eventBus.on('settings:change', () => {
        void saveService.saveLocal();
      }),

      eventBus.on('daily:status:request', () => {
        eventBus.emit('daily:status', { canClaim: dailyRewards.canClaim() });
      }),

      eventBus.on('daily:claim:request', async () => {
        const reward = await dailyRewards.claim();
        if (reward) {
          trackDailyClaim({
            day: reward.day,
            gems: reward.reward.gems,
            coins: reward.reward.coins,
          });
          eventBus.emit('daily:claim:result', {
            success: true,
            gems: reward.reward.gems,
            coins: reward.reward.coins,
          });
        } else {
          eventBus.emit('daily:claim:result', {
            success: false,
            message: 'Cooldown active',
          });
        }
      }),

      eventBus.on('shop:purchase', ({ itemId, price }) => {
        trackPurchase({ itemId, price });
      }),

      eventBus.on('ad:reward', ({ placement, reward }) => {
        trackAdReward({ placement, reward: JSON.stringify(reward) });
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
        trackSessionEnd();
        eventBus.emit('app:pause', undefined);
        void saveService.saveLocal();
        void analytics.flush();
      } else {
        eventBus.emit('app:resume', undefined);
      }
    });
  }

  async destroy(): Promise<void> {
    trackSessionEnd();
    await analytics.flush();
    await analytics.shutdown();
    missions.destroy();
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.initialized = false;
  }
}

export const app = new App();
