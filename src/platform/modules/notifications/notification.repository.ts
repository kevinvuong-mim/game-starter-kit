import {
  type DeviceLocale,
  type DevicePlatform,
  type NotificationState,
  NOTIFICATION_STORAGE_KEY,
  createDefaultNotificationState,
} from './notification.model';
import { Capacitor } from '@capacitor/core';
import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import type { ApiEnvelope } from '@platform/core/api';

interface RegisterDeviceResponse {
  status: string;
  deviceId: string;
}

export class NotificationRepository {
  async loadState(): Promise<NotificationState> {
    const value = await storage.load<NotificationState>(NOTIFICATION_STORAGE_KEY);
    if (!value || typeof value !== 'object') {
      return createDefaultNotificationState();
    }

    return {
      permissionGranted: Boolean(value.permissionGranted),
      lastRegisteredToken: value.lastRegisteredToken ?? null,
    };
  }

  async saveState(state: NotificationState): Promise<void> {
    await storage.save(NOTIFICATION_STORAGE_KEY, state);
  }

  resolvePlatform(): DevicePlatform {
    return Capacitor.getPlatform() === 'ios' ? 'IOS' : 'ANDROID';
  }

  async registerDevice(token: string, platform: DevicePlatform, locale: DeviceLocale) {
    const envelope = await apiClient.post<ApiEnvelope<RegisterDeviceResponse>>('/devices', {
      token,
      platform,
      locale,
    });
    return envelope.data;
  }

  async updateDevice(token: string, locale: DeviceLocale) {
    const envelope = await apiClient.patch<ApiEnvelope<RegisterDeviceResponse>>('/devices', {
      token,
      locale,
    });
    return envelope.data;
  }

  async unregisterDevice() {
    await apiClient.delete('/devices');
  }

  async heartbeat() {
    await apiClient.patch('/devices/heartbeat', {});
  }
}

export const notificationRepository = new NotificationRepository();
