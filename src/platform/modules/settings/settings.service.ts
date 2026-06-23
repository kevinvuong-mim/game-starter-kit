import { i18n } from '../i18n/i18n.service';
import { eventBus } from '@platform/core/events';
import { storage } from '@platform/core/storage';
import { usePlatformStore } from '@platform/core/state';
import type { SettingsState } from '@platform/core/state';

const SETTINGS_KEY = 'settings';

export class SettingsService {
  async init(): Promise<void> {
    const saved = await storage.load<SettingsState>(SETTINGS_KEY);
    if (saved) {
      usePlatformStore.getState().updateSettings(saved);
    }
  }

  getSettings() {
    return usePlatformStore.getState().settings;
  }

  async setLanguage(language: string): Promise<void> {
    usePlatformStore.getState().updateSettings({ language });
    await i18n.setLanguage(language);
    await this.persist();
    eventBus.emit('settings:change', { key: 'language', value: language });
  }

  async setSoundEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ soundEnabled: enabled });
    await this.persist();
    eventBus.emit('settings:change', { key: 'soundEnabled', value: enabled });
  }

  async setMusicEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ musicEnabled: enabled });
    await this.persist();
    eventBus.emit('settings:change', { key: 'musicEnabled', value: enabled });
  }

  async setVibrationEnabled(enabled: boolean): Promise<void> {
    usePlatformStore.getState().updateSettings({ vibrationEnabled: enabled });
    await this.persist();
    eventBus.emit('settings:change', { key: 'vibrationEnabled', value: enabled });
  }

  async setGraphicsQuality(quality: 'low' | 'medium' | 'high'): Promise<void> {
    usePlatformStore.getState().updateSettings({ graphicsQuality: quality });
    await this.persist();
    eventBus.emit('settings:change', { key: 'graphicsQuality', value: quality });
  }

  private async persist(): Promise<void> {
    await storage.save(SETTINGS_KEY, usePlatformStore.getState().settings);
  }
}

export const settings = new SettingsService();
