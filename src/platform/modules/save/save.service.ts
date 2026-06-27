import { logger } from '@platform/core/error';
import { storage } from '@platform/core/storage';
import { usePlatformStore } from '@platform/core/state';
import type { PlatformState } from '@platform/core/state';

const SAVE_KEY = 'game-save';

export interface SaveData {
  version: number;
  timestamp: number;
  state: Partial<PlatformState>;
}

export class SaveService {
  async saveLocal(): Promise<void> {
    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      state: this.extractSaveableState(),
    };
    await storage.save(SAVE_KEY, data, storage.getDurableProviderType());
    logger.debug('[Save] Local save complete');
  }

  async loadLocal(): Promise<boolean> {
    const durable = storage.getDurableProviderType();
    let data = await storage.load<SaveData>(SAVE_KEY, durable);

    if (!data?.state && durable === 'preferences') {
      data = await this.migrateFromIndexedDb();
    }

    if (!data?.state) return false;

    usePlatformStore.getState().hydrate(data.state);
    logger.info('[Save] Local save loaded');
    return true;
  }

  /** One-time migration for installs that saved to WebView IndexedDB before native Preferences. */
  private async migrateFromIndexedDb(): Promise<SaveData | null> {
    const legacy = await storage.load<SaveData>(SAVE_KEY, 'indexedDB');
    if (!legacy?.state) return null;

    await storage.save(SAVE_KEY, legacy, 'preferences');
    await storage.remove(SAVE_KEY, 'indexedDB');
    logger.info('[Save] Migrated save from IndexedDB to Preferences');
    return legacy;
  }

  private extractSaveableState(): Partial<PlatformState> {
    const state = usePlatformStore.getState();
    return {
      user: state.user,
      currency: state.currency,
      inventory: state.inventory,
      progress: state.progress,
      settings: state.settings,
      missions: state.missions,
      dailyRewards: state.dailyRewards,
    };
  }
}

export const saveService = new SaveService();
