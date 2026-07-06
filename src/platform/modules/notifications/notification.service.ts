import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { pushNotificationService } from './push-notification.service';
import { localNotificationService } from './local-notification.service';
import { navigationService } from '@platform/modules/navigation/navigation.service';
import { resolveNotificationRoute, type PushNotificationPayload } from './notification.model';

export class NotificationService {
  private initialized = false;

  async initialize(): Promise<void> {
    const config = getConfig();

    if (!Capacitor.isNativePlatform() || this.initialized) {
      return;
    }

    if (!config.pushNotificationsEnabled && !config.localNotificationsEnabled) {
      return;
    }

    if (config.localNotificationsEnabled) {
      await localNotificationService.initialize();
    }

    if (config.pushNotificationsEnabled) {
      pushNotificationService.setHandlers({
        onReceived: (payload) => this.handleForegroundNotification(payload),
        onAction: (payload) => this.handleNotificationTap(payload),
      });

      const granted = await pushNotificationService.initialize();
      if (granted) {
        await pushNotificationService.registerTokenWithBackend();
      }
    }

    this.initialized = true;
    logger.info('[Notification] Service initialized', {
      push: config.pushNotificationsEnabled,
      local: config.localNotificationsEnabled,
    });
  }

  async scheduleDailyRewardReminder(): Promise<void> {
    if (!getConfig().localNotificationsEnabled) {
      return;
    }

    await localNotificationService.scheduleDailyRewardReminder();
  }

  async reconcileDailyRewardSchedule(canClaim: boolean): Promise<void> {
    if (!getConfig().localNotificationsEnabled) {
      return;
    }

    await localNotificationService.reconcileDailyRewardSchedule(canClaim);
  }

  async onAppResume(canClaimDailyReward: boolean): Promise<void> {
    const config = getConfig();

    if (config.pushNotificationsEnabled) {
      await pushNotificationService.refreshTokenIfNeeded();
    }

    if (config.localNotificationsEnabled) {
      await this.reconcileDailyRewardSchedule(canClaimDailyReward);
    }
  }

  async onLocaleChanged(): Promise<void> {
    if (!getConfig().pushNotificationsEnabled) {
      return;
    }

    await pushNotificationService.refreshTokenIfNeeded();
  }

  handleNotificationTap(payload: PushNotificationPayload): void {
    const scene = resolveNotificationRoute(payload.type, payload.route);
    navigationService.navigateToScene(scene, { returnTo: 'Home' });
  }

  private handleForegroundNotification(payload: PushNotificationPayload): void {
    logger.info('[Notification] Received in foreground', payload);
  }
}

export const notificationService = new NotificationService();
