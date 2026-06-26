export type StorageProviderType = 'memory' | 'indexedDB' | 'preferences' | 'localStorage';

export interface StorageProvider {
  clear(): Promise<void>;
  keys(): Promise<string[]>;
  readonly type: StorageProviderType;
  remove(key: string): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  save<T>(key: string, value: T): Promise<void>;
}
