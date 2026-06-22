import { describe, it, expect, beforeEach } from 'vitest';
import { MemoryStorageProvider } from '@core/storage';

describe('MemoryStorageProvider', () => {
  let storage: MemoryStorageProvider;

  beforeEach(() => {
    storage = new MemoryStorageProvider();
  });

  it('saves and loads data', async () => {
    await storage.save('test-key', { value: 42 });
    const result = await storage.load<{ value: number }>('test-key');
    expect(result).toEqual({ value: 42 });
  });

  it('returns null for missing keys', async () => {
    const result = await storage.load('missing');
    expect(result).toBeNull();
  });

  it('removes keys', async () => {
    await storage.save('temp', 'data');
    await storage.remove('temp');
    const result = await storage.load('temp');
    expect(result).toBeNull();
  });

  it('clears all data', async () => {
    await storage.save('a', 1);
    await storage.save('b', 2);
    await storage.clear();
    const keys = await storage.keys();
    expect(keys).toHaveLength(0);
  });
});
