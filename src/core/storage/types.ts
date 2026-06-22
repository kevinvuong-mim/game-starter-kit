export type StorageProviderType = 'localStorage' | 'indexedDB' | 'memory';

export interface StorageProvider {
  readonly type: StorageProviderType;
  save<T>(key: string, value: T): Promise<void>;
  load<T>(key: string): Promise<T | null>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  keys(): Promise<string[]>;
}
