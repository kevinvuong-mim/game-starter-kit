import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
import { deviceSyncService } from './device-sync.service';
import { i18n } from '@platform/modules/i18n/i18n.service';
import { mapLocaleToDeviceLocale, type PushNotificationPayload } from './notification.model';
import { notificationRepository, type NotificationRepository } from './notification.repository';

type PushActionHandler = (payload: PushNotificationPayload) => void;

export class PushNotificationService {
  private listenersBound = false;
  private currentToken: string | null = null;
  private onAction: PushActionHandler | null = null;
  private onReceived: PushActionHandler | null = null;

  constructor(private readonly repository: NotificationRepository = notificationRepository) {}

  setHandlers(handlers: { onAction?: PushActionHandler; onReceived?: PushActionHandler }): void {
    this.onAction = handlers.onAction ?? null;
    this.onReceived = handlers.onReceived ?? null;
  }

  async initialize(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const permission = await PushNotifications.requestPermissions();

      if (permission.receive !== 'granted') {
        logger.info('[PushNotification] Permission not granted');
        return false;
      }

      await PushNotifications.register();

      if (!this.listenersBound) {
        this.bindListeners();
        this.listenersBound = true;
      }

      await this.hydrateTokenFromStorage();
      return true;
    } catch (error) {
      logger.warn('[PushNotification] Init failed', error);
      return false;
    }
  }

  async syncDeviceState(): Promise<void> {
    const token = await this.resolveToken();
    if (!token) {
      return;
    }

    const locale = mapLocaleToDeviceLocale(i18n.getCurrentLanguage());
    const platform = this.repository.resolvePlatform();
    await deviceSyncService.enqueueRegister(token, platform, locale);
    void deviceSyncService.flush().catch(() => undefined);
  }

  async hasPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      const status = await PushNotifications.checkPermissions();
      return status.receive === 'granted';
    } catch {
      return false;
    }
  }

  async refreshTokenIfNeeded(): Promise<void> {
    const token = await this.resolveToken();
    if (!token) {
      return;
    }

    const locale = mapLocaleToDeviceLocale(i18n.getCurrentLanguage());
    const platform = this.repository.resolvePlatform();
    await deviceSyncService.enqueueRegister(token, platform, locale);
    await deviceSyncService.enqueueHeartbeat();
    void deviceSyncService.flush().catch(() => undefined);
  }

  async unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await deviceSyncService.enqueueUnregister();
      void deviceSyncService.flush().catch(() => undefined);
      this.currentToken = null;
    } catch (error) {
      logger.warn('[PushNotification] Unregister failed', error);
    }
  }

  private async hydrateTokenFromStorage(): Promise<void> {
    if (this.currentToken) {
      return;
    }

    this.currentToken = await deviceSyncService.getPersistedToken();
  }

  private async resolveToken(): Promise<string | null> {
    await this.hydrateTokenFromStorage();
    return this.currentToken;
  }

  private bindListeners(): void {
    void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('registration', (event) => {
        this.currentToken = event.value;
        void this.syncDeviceState();
      });

      PushNotifications.addListener('registrationError', (error) => {
        logger.warn('[PushNotification] Registration error', error);
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        const payload = this.extractPayload(notification.data);
        this.onReceived?.(payload);
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const payload = this.extractPayload(action.notification.data);
        this.onAction?.(payload);
      });
    });
  }

  private extractPayload(data?: Record<string, unknown>): PushNotificationPayload {
    return {
      type:
        typeof data?.type === 'string' ? (data.type as PushNotificationPayload['type']) : undefined,
      route:
        typeof data?.route === 'string'
          ? (data.route as PushNotificationPayload['route'])
          : undefined,
    };
  }
}

export const pushNotificationService = new PushNotificationService();
