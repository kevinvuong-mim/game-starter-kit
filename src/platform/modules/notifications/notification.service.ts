import {
  deviceSyncNeeded,
  NOTIFICATION_TYPES,
  resolveNotificationRoute,
  type PushNotificationPayload,
} from './notification.model';
import { t } from '@platform/modules/i18n';
import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { toast } from '@platform/ui/toast/ToastManager';
import { deviceSyncService } from './device-sync.service';
import { dailyRewards } from '@platform/modules/daily-reward';
import { pushNotificationService } from './push-notification.service';
import { settings } from '@platform/modules/settings/settings.service';
import { localNotificationService } from './local-notification.service';
import { navigationService } from '@platform/modules/navigation/navigation.service';

export type NotificationStatus = 'off' | 'active' | 'denied' | 'pending';

export class NotificationService {
  private pushInitialized = false;
  private localInitialized = false;

  /** Local notifications do not require guest or network. */
  async initializeLocal(): Promise<void> {
    const config = getConfig();

    if (!Capacitor.isNativePlatform() || this.localInitialized) {
      return;
    }

    if (!config.localNotificationsEnabled || !this.isNotificationsEnabledInSettings()) {
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

    if (!config.pushNotificationsEnabled || !this.isNotificationsEnabledInSettings()) {
      return;
    }

    pushNotificationService.setHandlers({
      onReceived: (payload) => this.handleForegroundNotification(payload),
      onAction: (payload) => this.handleNotificationTap(payload),
    });

    const granted = await pushNotificationService.initialize();
    if (granted) {
      await pushNotificationService.syncDeviceState();
    }

    void deviceSyncService.flush().catch(() => undefined);

    this.pushInitialized = true;
    logger.info('[Notification] Push notifications initialized');
  }

  async scheduleDailyRewardReminder(): Promise<void> {
    if (!getConfig().localNotificationsEnabled || !this.isNotificationsEnabledInSettings()) {
      return;
    }

    await localNotificationService.scheduleDailyRewardReminder();
  }

  async reconcileDailyRewardSchedule(canClaim: boolean): Promise<void> {
    if (!getConfig().localNotificationsEnabled || !this.isNotificationsEnabledInSettings()) {
      if (getConfig().localNotificationsEnabled) {
        await localNotificationService.cancelDailyRewardReminder();
      }
      return;
    }

    await localNotificationService.reconcileDailyRewardSchedule(canClaim);
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    const config = getConfig();

    if (enabled) {
      if (config.localNotificationsEnabled) {
        this.localInitialized = false;
        await this.initializeLocal();
        await this.reconcileDailyRewardSchedule(dailyRewards.canClaim());
      }

      if (config.pushNotificationsEnabled) {
        await deviceSyncService.enqueuePreference(true);
        this.pushInitialized = false;
        await this.initializePush();
        void deviceSyncService.flush().catch(() => undefined);
      }

      return;
    }

    if (config.localNotificationsEnabled) {
      await localNotificationService.cancelDailyRewardReminder();
    }

    if (config.pushNotificationsEnabled) {
      await deviceSyncService.enqueuePreference(false);
      await pushNotificationService.unregister();
      void deviceSyncService.flush().catch(() => undefined);
      this.pushInitialized = false;
    }
  }

  async getNotificationStatus(): Promise<NotificationStatus> {
    if (!this.isNotificationsEnabledInSettings()) {
      return 'off';
    }

    const config = getConfig();

    if (config.pushNotificationsEnabled) {
      const pushGranted = await pushNotificationService.hasPermission();
      if (!pushGranted) {
        return 'denied';
      }
    }

    if (config.localNotificationsEnabled) {
      const localGranted = await localNotificationService.hasPermission();
      if (!localGranted) {
        return 'denied';
      }
    }

    if (config.pushNotificationsEnabled) {
      const state = await deviceSyncService.loadState();
      if (
        state.pendingNotificationsEnabled !== null ||
        deviceSyncNeeded(state) ||
        state.unregisterPending
      ) {
        return 'pending';
      }

      if (!state.lastSyncedToken) {
        return 'pending';
      }
    }

    return 'active';
  }

  async onAppResume(canClaimDailyReward: boolean): Promise<void> {
    if (!this.isNotificationsEnabledInSettings()) {
      return;
    }

    const config = getConfig();

    if (config.pushNotificationsEnabled) {
      await pushNotificationService.refreshTokenIfNeeded();
      await deviceSyncService.flush();
    }

    if (config.localNotificationsEnabled) {
      await this.reconcileDailyRewardSchedule(canClaimDailyReward);
    }
  }

  async onLocaleChanged(): Promise<void> {
    const config = getConfig();

    if (!config.pushNotificationsEnabled || !this.isNotificationsEnabledInSettings()) {
      return;
    }

    await pushNotificationService.refreshTokenIfNeeded();
    void deviceSyncService.flush().catch(() => undefined);
  }

  handleNotificationTap(payload: PushNotificationPayload): void {
    const scene = resolveNotificationRoute(payload.type, payload.route);
    navigationService.navigateToScene(scene, { returnTo: 'Home' });
  }

  private handleForegroundNotification(payload: PushNotificationPayload): void {
    logger.info('[Notification] Received in foreground', payload);

    const message = this.resolveForegroundMessage(payload);
    if (message) {
      toast.show({ message, type: 'info', duration: 4000 });
    }
  }

  private resolveForegroundMessage(payload: PushNotificationPayload): string | null {
    switch (payload.type) {
      case NOTIFICATION_TYPES.TOP_100_EXITED:
        return t('notifications.top100Exited.body');
      case NOTIFICATION_TYPES.RANK_PUSH:
        return t('notifications.rankPush.body');
      default:
        return null;
    }
  }

  private isNotificationsEnabledInSettings(): boolean {
    return settings.getSettings().notificationsEnabled;
  }
}

export const notificationService = new NotificationService();
