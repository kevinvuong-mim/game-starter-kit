import {
  trackAdReward,
  trackGameOver,
  trackPurchase,
  trackGameStart,
  trackSessionEnd,
  trackLevelComplete,
  trackMissionComplete,
} from '@platform/core/analytics/events';
import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { guest } from '@platform/modules/guest';
import { generateId } from '@platform/core/utils';
import { services } from '@platform/core/services';
import { usePlatformStore } from '@platform/core/state';
import { bindAdsController } from '@platform/modules/ads';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { registerAdsProvider } from '@platform/bootstrap/ads';
import { registerIapProvider } from '@platform/bootstrap/iap';
import { bindIapController } from '@platform/modules/iap';
import { gameSyncController } from '@platform/modules/game-sync';
import { hideNativeSplash } from '@platform/bootstrap/capacitor';
import { saveService } from '@platform/modules/save/save.service';
import { missions, missionController } from '@platform/modules/missions';
import { settings } from '@platform/modules/settings/settings.service';
import { registerAnalyticsProviders } from '@platform/bootstrap/analytics';
import { leaderboard, leaderboardController } from '@platform/modules/leaderboard';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';
import { dailyRewardController } from '@platform/modules/daily-rewards/daily-reward.controller';

const { ads, iap, config, events, analytics } = services;

/**
 * App layer orchestrator. Wires platform modules to the event bus.
 * Games never import this directly.
 */
export class App {
  private initialized = false;
  private dailyRewardUnsubscribe?: () => void;
  private unsubscribers: Array<() => void> = [];
  private controllerUnsubscribers: Array<() => void> = [];

  async init(): Promise<void> {
    if (this.initialized) return;

    logger.info('[App] Initializing platform...');

    const store = usePlatformStore.getState();
    if (!store.user.id) {
      store.setUser({ id: generateId('user'), displayName: 'Player' });
    }

    registerAnalyticsProviders();
    registerAdsProvider();

    await Promise.all([
      i18n.init(),
      ads.init(),
      guest.init(),
      analytics.init(),
      leaderboard.init(),
    ]);

    const fallbackUserId = usePlatformStore.getState().user.id || undefined;
    const analyticsUserId = guest.getGuestId() ?? fallbackUserId;
    registerIapProvider(analyticsUserId);
    await iap.initialize().catch((error) => {
      logger.warn('[App] IAP init failed — continuing without IAP', error);
    });

    const { adsModule } = await import('@platform/modules/ads');
    await adsModule.init();

    if (analyticsUserId) {
      analytics.setUserId(analyticsUserId);
    }
    analytics.setUserProperty('game_id', config().gameId);
    void guest
      .ensureGuestId()
      .then((guestId) => {
        if (guestId) {
          analytics.setUserId(guestId);
        }
      })
      .catch((error) => logger.warn('[App] Background guest init failed', error));

    await saveService.loadLocal();
    await dailyRewards.init();
    await settings.init();
    missions.init();

    this.bindPlatformEvents();
    this.dailyRewardUnsubscribe = dailyRewardController.bind(events);
    this.controllerUnsubscribers.push(
      leaderboardController.bind(events),
      gameSyncController.bind(events),
      bindAdsController(events),
      bindIapController(events),
      missionController.bind(events)
    );
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
        events.emit('ad:show:request', { placement: 'APP_START' });
        events.emit('ad:show:request', { placement: 'HOME' });
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
        events.emit('ad:show:request', { placement: 'GAME_OVER' });
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
      })
    );
  }

  private bindLifecycle(): void {
    if (typeof document === 'undefined' || Capacitor.isNativePlatform()) return;

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
    ads.destroy();
    await analytics.flush();
    await analytics.shutdown();
    analytics.clearProviders();
    this.dailyRewardUnsubscribe?.();
    this.dailyRewardUnsubscribe = undefined;
    for (const unsub of this.controllerUnsubscribers) unsub();
    this.controllerUnsubscribers = [];
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
    this.initialized = false;
  }
}

export const app = new App();
