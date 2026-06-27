import {
  type SyncResponse,
  PENDING_RESULTS_KEY,
  type GameResultPayload,
  type PendingGameResult,
} from './game-sync.model';
import { apiClient } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { Preferences } from '@capacitor/preferences';
import type { ApiEnvelope } from '@platform/core/api';

function isPendingGameResult(value: unknown): value is PendingGameResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PendingGameResult>;
  return (
    typeof item.localId === 'string' &&
    typeof item.gameId === 'string' &&
    typeof item.replayHash === 'string' &&
    typeof item.runSeed === 'string' &&
    typeof item.playedAt === 'string' &&
    typeof item.score === 'number'
  );
}

/**
 * Owns the persisted pending-results queue (Capacitor Preferences) and the
 * `POST /games/:gameId/results` call. Queue writes are atomic read-modify-write
 * at the call site (the service serializes access via a lock).
 */
export class GameSyncRepository {
  async loadQueue(): Promise<PendingGameResult[]> {
    const { value } = await Preferences.get({ key: PENDING_RESULTS_KEY });
    if (!value) return [];

    try {
      const parsed = JSON.parse(value) as unknown[];
      if (!Array.isArray(parsed)) return [];

      const queue = parsed.filter(isPendingGameResult);
      if (queue.length < parsed.length) {
        logger.warn('[GameSync] Dropped legacy queue items missing runSeed/playedAt');
        await this.saveQueue(queue);
      }

      return queue;
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

  /** Uploads a batch of results for a single game. Guest auth via Bearer token. */
  async sync(gameId: string, results: GameResultPayload[]): Promise<SyncResponse> {
    const envelope = await apiClient.post<ApiEnvelope<SyncResponse>>(
      `/games/${encodeURIComponent(gameId)}/results`,
      { results }
    );
    return envelope.data;
  }
}

export const gameSyncRepository = new GameSyncRepository();
