import { logger } from '@platform/core/error';
import { apiClient } from '@platform/core/api';
import { guest } from '@platform/modules/guest';
import { services } from '@platform/core/services';
import { usePlatformStore } from '@platform/core/state';
import { bindAdsController } from '@platform/modules/ads';
import { bindIapController } from '@platform/modules/iap';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { registerAdsProvider } from '@platform/bootstrap/ads';
import { registerIapProvider } from '@platform/bootstrap/iap';
import { gameSyncController } from '@platform/modules/game-sync';
import { saveService } from '@platform/modules/save/save.service';
import { trackSessionEnd } from '@platform/core/analytics/events';
import { bindAppEvents } from '@platform/bootstrap/bind-app-events';
import { settings } from '@platform/modules/settings/settings.service';
import { missions, missionController } from '@platform/modules/missions';
import { notificationController } from '@platform/modules/notifications';
import { bindAppLifecycle } from '@platform/bootstrap/bind-app-lifecycle';
import { bindGuestStoreSync } from '@platform/bootstrap/sync-guest-store';
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
    if (!store.user.displayName) {
      store.setUser({ displayName: 'Player' });
    }

    registerAnalyticsProviders();
    registerAdsProvider();

    apiClient.setAuthRecoveryHandler(() => guest.recoverFromUnauthorized());

    const parallelInits = await Promise.allSettled([
      i18n.init(),
      ads.init(),
      guest.init(),
      analytics.init(),
      leaderboard.init(),
    ]);

    for (const [index, result] of parallelInits.entries()) {
      if (result.status === 'rejected') {
        const labels = ['i18n', 'ads', 'guest', 'analytics', 'leaderboard'];
        logger.error(`[App] ${labels[index]} init failed`, result.reason);
      }
    }

    this.unsubscribers.push(
      guest.onReady((guestId) => {
        analytics.setUserId(guestId);
      }),
      bindGuestStoreSync()
    );

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

    await saveService.loadLocal();
    await dailyRewards.init();
    await settings.init();
    missions.init();

    this.unsubscribers.push(bindAppEvents());
    this.unsubscribers.push(bindAppLifecycle());
    this.dailyRewardUnsubscribe = dailyRewardController.bind(events);
    this.controllerUnsubscribers.push(
      leaderboardController.bind(events),
      gameSyncController.bind(events),
      bindAdsController(events),
      bindIapController(events),
      missionController.bind(events),
      notificationController.bind(events)
    );

    this.initialized = true;
    logger.info('[App] Platform ready');
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
