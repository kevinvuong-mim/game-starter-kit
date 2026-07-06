import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { t } from '@platform/modules/i18n/i18n.service';
import { NOTIFICATION_IDS, getNextDailyRewardReminderAt } from './notification.model';

export class LocalNotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform() || this.initialized) {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.requestPermissions();
      this.initialized = true;
    } catch (error) {
      logger.warn('[LocalNotification] Init failed', error);
    }
  }

  async hasPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      const status = await LocalNotifications.checkPermissions();
      return status.display === 'granted';
    } catch (error) {
      logger.warn('[LocalNotification] Permission check failed', error);
      return false;
    }
  }

  async scheduleDailyRewardReminder(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    const granted = await this.hasPermission();
    if (!granted) {
      logger.info('[LocalNotification] Permission not granted — skipping daily reward reminder');
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS.DAILY_REWARD }] });

      const scheduleAt = getNextDailyRewardReminderAt();
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_IDS.DAILY_REWARD,
            title: t('notifications.dailyReward.title'),
            body: t('notifications.dailyReward.body'),
            schedule: { at: scheduleAt },
            extra: {
              route: 'DailyReward',
              type: 'daily_reward',
            },
          },
        ],
      });

      logger.info('[LocalNotification] Daily reward reminder scheduled', {
        at: scheduleAt.toISOString(),
      });
    } catch (error) {
      logger.warn('[LocalNotification] Failed to schedule daily reward reminder', error);
    }
  }

  async cancelDailyRewardReminder(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_IDS.DAILY_REWARD }] });
    } catch (error) {
      logger.warn('[LocalNotification] Failed to cancel daily reward reminder', error);
    }
  }

  async reconcileDailyRewardSchedule(canClaim: boolean): Promise<void> {
    if (canClaim) {
      await this.cancelDailyRewardReminder();
      return;
    }

    await this.scheduleDailyRewardReminder();
  }
}

export const localNotificationService = new LocalNotificationService();
