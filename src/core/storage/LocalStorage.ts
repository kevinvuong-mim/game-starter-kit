import type { StorageProvider } from './types';

const PREFIX = 'gsk:';

export class LocalStorageProvider implements StorageProvider {
  readonly type = 'localStorage' as const;
  private available: boolean;

  constructor() {
    this.available = this.checkAvailability();
  }

  private checkAvailability(): boolean {
    try {
      const test = '__storage_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      return true;
    } catch {
      return false;
    }
  }

  async save<T>(key: string, value: T): Promise<void> {
    if (!this.available) return;
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  async load<T>(key: string): Promise<T | null> {
    if (!this.available) return null;
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  async remove(key: string): Promise<void> {
    if (!this.available) return;
    localStorage.removeItem(PREFIX + key);
  }

  async clear(): Promise<void> {
    if (!this.available) return;
    const keys = await this.keys();
    for (const key of keys) {
      localStorage.removeItem(PREFIX + key);
    }
  }

  async keys(): Promise<string[]> {
    if (!this.available) return [];
    const result: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(PREFIX)) {
        result.push(key.slice(PREFIX.length));
      }
    }
    return result;
  }
}
