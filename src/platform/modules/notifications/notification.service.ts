import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { pushNotificationService } from './push-notification.service';
import { localNotificationService } from './local-notification.service';
import { navigationService } from '@platform/modules/navigation/navigation.service';
import { resolveNotificationRoute, type PushNotificationPayload } from './notification.model';

export class NotificationService {
  private localInitialized = false;
  private pushInitialized = false;

  /** Local notifications do not require guest or network. */
  async initializeLocal(): Promise<void> {
    const config = getConfig();

    if (!Capacitor.isNativePlatform() || this.localInitialized) {
      return;
    }

    if (!config.localNotificationsEnabled) {
      return;
    }

    await localNotificationService.initialize();
    this.localInitialized = true;
    logger.info('[Notification] Local notifications initialized');
  }

  /** Push registration requires guest auth for device token sync. */
  async initializePush(): Promise<void> {
    const config = getConfig();

    if (!Capacitor.isNativePlatform() || this.pushInitialized) {
      return;
    }

    if (!config.pushNotificationsEnabled) {
      return;
    }

    pushNotificationService.setHandlers({
      onReceived: (payload) => this.handleForegroundNotification(payload),
      onAction: (payload) => this.handleNotificationTap(payload),
    });

    const granted = await pushNotificationService.initialize();
    if (granted) {
      await pushNotificationService.registerTokenWithBackend();
    }

    this.pushInitialized = true;
    logger.info('[Notification] Push notifications initialized');
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
