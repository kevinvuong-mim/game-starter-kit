import { Capacitor } from '@capacitor/core';
import { logger } from '@platform/core/error';
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

      return true;
    } catch (error) {
      logger.warn('[PushNotification] Init failed', error);
      return false;
    }
  }

  async registerTokenWithBackend(): Promise<void> {
    if (!this.currentToken) {
      return;
    }

    const locale = mapLocaleToDeviceLocale(i18n.getCurrentLanguage());
    const platform = this.repository.resolvePlatform();
    const state = await this.repository.loadState();

    if (state.lastRegisteredToken === this.currentToken) {
      await this.repository.updateDevice(this.currentToken, locale);
    } else {
      await this.repository.registerDevice(this.currentToken, platform, locale);
    }

    await this.repository.saveState({
      lastRegisteredToken: this.currentToken,
      permissionGranted: true,
    });
  }

  async refreshTokenIfNeeded(): Promise<void> {
    if (!this.currentToken) {
      return;
    }

    await this.registerTokenWithBackend();
    await this.repository.heartbeat();
  }

  async unregister(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      return;
    }

    try {
      await this.repository.unregisterDevice();
      await this.repository.saveState({
        lastRegisteredToken: null,
        permissionGranted: false,
      });
    } catch (error) {
      logger.warn('[PushNotification] Unregister failed', error);
    }
  }

  private bindListeners(): void {
    void import('@capacitor/push-notifications').then(({ PushNotifications }) => {
      PushNotifications.addListener('registration', (event) => {
        this.currentToken = event.value;
        void this.registerTokenWithBackend();
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
