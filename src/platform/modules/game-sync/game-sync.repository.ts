import { Preferences } from '@capacitor/preferences';

import { apiClient } from '@platform/core/api';
import type { ApiEnvelope } from '@platform/core/api';

import {
  PENDING_RESULTS_KEY,
  type GameResultPayload,
  type PendingGameResult,
  type SyncResponse,
} from './game-sync.model';

/**
 * Owns the persisted pending-results queue (Capacitor Preferences) and the
 * `POST /game/sync` call. Queue writes are atomic read-modify-write at the
 * call site (the service serializes access via a lock).
 */
export class GameSyncRepository {
  async loadQueue(): Promise<PendingGameResult[]> {
    const { value } = await Preferences.get({ key: PENDING_RESULTS_KEY });
    if (!value) return [];

    try {
      const parsed = JSON.parse(value) as PendingGameResult[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async saveQueue(queue: PendingGameResult[]): Promise<void> {
    await Preferences.set({ key: PENDING_RESULTS_KEY, value: JSON.stringify(queue) });
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: PENDING_RESULTS_KEY });
  }

  /** Uploads a batch of results for a single `gameId` / `guestId`. */
  async sync(gameId: string, guestId: string, results: GameResultPayload[]): Promise<SyncResponse> {
    const envelope = await apiClient.post<ApiEnvelope<SyncResponse>>('/game/sync', {
      gameId,
      guestId,
      results,
    });
    return envelope.data;
  }
}

export const gameSyncRepository = new GameSyncRepository();
