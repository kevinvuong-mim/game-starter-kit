import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { guest } from '@platform/modules/guest';
import { getConfig } from '@platform/core/config';
import type { IEventBus } from '@platform/core/events';
import { notificationService } from './notification.service';
import { dailyRewards } from '@platform/modules/daily-rewards/daily-reward.service';
import { navigationService } from '@platform/modules/navigation/navigation.service';
import { resolveNotificationRoute, type PushNotificationPayload } from './notification.model';

export class NotificationController {
  bind(events: IEventBus): () => void {
    const config = getConfig();

    if (!Capacitor.isNativePlatform()) {
      return () => {};
    }

    if (!config.pushNotificationsEnabled && !config.localNotificationsEnabled) {
      return () => {};
    }

    const unsubs: Array<() => void> = [];

    guest.onReady(() => {
      void notificationService.initialize();
    });

    unsubs.push(
      events.on('app:resume', () => {
        void notificationService.onAppResume(dailyRewards.canClaim());
      })
    );

    if (config.localNotificationsEnabled) {
      unsubs.push(
        events.on('daily:claim', () => {
          void notificationService.scheduleDailyRewardReminder();
        })
      );

      void this.bindLocalNotificationActions();
    }

    if (config.pushNotificationsEnabled) {
      unsubs.push(
        events.on('settings:change', ({ key }) => {
          if (key === 'language') {
            void notificationService.onLocaleChanged();
          }
        })
      );
    }

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }

  private async bindLocalNotificationActions(): Promise<void> {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');

      await LocalNotifications.addListener('localNotificationActionPerformed', (event) => {
        const payload: PushNotificationPayload = {
          type:
            typeof event.notification.extra?.type === 'string'
              ? (event.notification.extra.type as PushNotificationPayload['type'])
              : undefined,
          route:
            typeof event.notification.extra?.route === 'string'
              ? (event.notification.extra.route as PushNotificationPayload['route'])
              : undefined,
        };

        const scene = resolveNotificationRoute(payload.type, payload.route);
        navigationService.navigateToScene(scene, { returnTo: 'Home' });
      });
    } catch (error) {
      logger.warn('[NotificationController] Failed to bind local notification actions', error);
    }
  }
}

export const notificationController = new NotificationController();
