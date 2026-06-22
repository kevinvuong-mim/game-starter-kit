import { storage } from '@core/storage';
import { apiClient } from '@core/api';
import { usePlatformStore } from '@core/state';
import { logger } from '@core/error';
import type { PlatformState } from '@core/state';

const SAVE_KEY = 'game-save';
const CLOUD_SAVE_KEY = 'cloud-save';

export interface SaveData {
  version: number;
  timestamp: number;
  state: Partial<PlatformState>;
}

export class SaveService {
  private syncInProgress = false;

  async saveLocal(): Promise<void> {
    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      state: this.extractSaveableState(),
    };
    await storage.save(SAVE_KEY, data, 'indexedDB');
    logger.debug('[Save] Local save complete');
  }

  async loadLocal(): Promise<boolean> {
    const data = await storage.load<SaveData>(SAVE_KEY, 'indexedDB');
    if (!data?.state) return false;

    usePlatformStore.getState().hydrate(data.state);
    logger.info('[Save] Local save loaded');
    return true;
  }

  async saveCloud(): Promise<void> {
    const data: SaveData = {
      version: 1,
      timestamp: Date.now(),
      state: this.extractSaveableState(),
    };

    try {
      await apiClient.post('/save', data);
      await storage.save(CLOUD_SAVE_KEY, data, 'indexedDB');
      logger.info('[Save] Cloud save complete');
    } catch (e) {
      logger.warn('[Save] Cloud save failed, saved locally', e);
      await storage.save(SAVE_KEY, data, 'indexedDB');
    }
  }

  async loadCloud(): Promise<boolean> {
    try {
      const cloudData = await apiClient.get<SaveData>('/save');
      const localData = await storage.load<SaveData>(SAVE_KEY, 'indexedDB');

      const resolved = this.resolveConflict(localData, cloudData);
      if (resolved?.state) {
        usePlatformStore.getState().hydrate(resolved.state);
        await storage.save(SAVE_KEY, resolved, 'indexedDB');
        logger.info('[Save] Cloud save loaded (conflict resolved)');
        return true;
      }
    } catch {
      return this.loadLocal();
    }
    return false;
  }

  async sync(): Promise<void> {
    if (this.syncInProgress) return;
    this.syncInProgress = true;

    try {
      const localData = await storage.load<SaveData>(SAVE_KEY, 'indexedDB');

      try {
        const cloudData = await apiClient.get<SaveData>('/save');
        const resolved = this.resolveConflict(localData, cloudData);

        if (resolved) {
          usePlatformStore.getState().hydrate(resolved.state);
          await apiClient.post('/save', resolved);
          await storage.save(SAVE_KEY, resolved, 'indexedDB');
        }
      } catch {
        if (localData) {
          await apiClient.post('/save', localData);
        }
      }
    } finally {
      this.syncInProgress = false;
    }
  }

  private resolveConflict(
    local: SaveData | null,
    cloud: SaveData | null
  ): SaveData | null {
    if (!local && !cloud) return null;
    if (!local) return cloud;
    if (!cloud) return local;
    return local.timestamp >= cloud.timestamp ? local : cloud;
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
