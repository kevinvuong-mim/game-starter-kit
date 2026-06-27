import { Preferences } from '@capacitor/preferences';

import type { StorageProvider } from './types';

const PREFIX = 'gsk:';

export class PreferencesStorageProvider implements StorageProvider {
  readonly type = 'preferences' as const;

  private prefKey(key: string): string {
    return PREFIX + key;
  }

  async save<T>(key: string, value: T): Promise<void> {
    await Preferences.set({ key: this.prefKey(key), value: JSON.stringify(value) });
  }

  async load<T>(key: string): Promise<T | null> {
    const { value } = await Preferences.get({ key: this.prefKey(key) });
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key: this.prefKey(key) });
  }

  async clear(): Promise<void> {
    const keys = await this.keys();
    await Promise.all(keys.map((k) => Preferences.remove({ key: this.prefKey(k) })));
  }

  async keys(): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys.filter((key) => key.startsWith(PREFIX)).map((key) => key.slice(PREFIX.length));
  }
}
