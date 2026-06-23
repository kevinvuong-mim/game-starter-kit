import { LocalStorageProvider } from './LocalStorage';
import { MemoryStorageProvider } from './MemoryStorage';
import { IndexedDBStorageProvider } from './IndexedDBStorage';
import type { StorageProvider, StorageProviderType } from './types';

export class StorageService {
  private primary: StorageProviderType = 'localStorage';
  private providers = new Map<StorageProviderType, StorageProvider>();

  constructor() {
    this.providers.set('localStorage', new LocalStorageProvider());
    this.providers.set('indexedDB', new IndexedDBStorageProvider());
    this.providers.set('memory', new MemoryStorageProvider());
  }

  setPrimary(type: StorageProviderType): void {
    this.primary = type;
  }

  getProvider(type?: StorageProviderType): StorageProvider {
    return this.providers.get(type ?? this.primary) ?? this.providers.get('memory')!;
  }

  async save<T>(key: string, value: T, provider?: StorageProviderType): Promise<void> {
    await this.getProvider(provider).save(key, value);
  }

  async load<T>(key: string, provider?: StorageProviderType): Promise<T | null> {
    return this.getProvider(provider).load<T>(key);
  }

  async remove(key: string, provider?: StorageProviderType): Promise<void> {
    await this.getProvider(provider).remove(key);
  }

  async clear(provider?: StorageProviderType): Promise<void> {
    await this.getProvider(provider).clear();
  }

  async keys(provider?: StorageProviderType): Promise<string[]> {
    return this.getProvider(provider).keys();
  }
}

export const storage = new StorageService();
