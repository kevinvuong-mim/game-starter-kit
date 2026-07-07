import { i18n } from '../i18n/i18n.service';
import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import type { SettingsState } from '@platform/core/state';

type LegacySettingsState = SettingsState & {
  localRemindersEnabled?: boolean;
  pushNotificationsEnabled?: boolean;
};

export class SettingsService {
  async init(): Promise<void> {
    const { language } = this.getSettings();
    await i18n.setLanguage(language);
  }

  getSettings(): SettingsState {
    const raw = usePlatformStore.getState().settings as LegacySettingsState;
    return {
      ...raw,
      notificationsEnabled: this.resolveNotificationsEnabled(raw),
    };
  }

  async setLanguage(language: string): Promise<void> {
    await i18n.setLanguage(language);
    eventBus.emit('settings:change', { key: 'language', value: i18n.getCurrentLanguage() });
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ soundEnabled: enabled });
    eventBus.emit('settings:change', { key: 'soundEnabled', value: enabled });
  }

  async setMusicEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ musicEnabled: enabled });
    eventBus.emit('settings:change', { key: 'musicEnabled', value: enabled });
  }

  async setVibrationEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ vibrationEnabled: enabled });
    eventBus.emit('settings:change', { key: 'vibrationEnabled', value: enabled });
  }

  async setGraphicsQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    usePlatformStore.getState().updateSettings({ graphicsQuality: quality });
    eventBus.emit('settings:change', { key: 'graphicsQuality', value: quality });
  }

  async setNotificationsEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ notificationsEnabled: enabled });
    eventBus.emit('settings:change', { key: 'notificationsEnabled', value: enabled });
  }

  private resolveNotificationsEnabled(settings: LegacySettingsState): boolean {
    if (typeof settings.notificationsEnabled === 'boolean') {
      return settings.notificationsEnabled;
    }

    const pushEnabled = settings.pushNotificationsEnabled ?? true;
    const localEnabled = settings.localRemindersEnabled ?? true;
    return pushEnabled && localEnabled;
  }
}

export const settings = new SettingsService();
