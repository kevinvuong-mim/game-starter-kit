import { storage } from '@platform/core/storage';
import { apiClient } from '@platform/core/api';
import { logger } from '@platform/core/error';
import {
  type SyncResponse,
  PENDING_RESULTS_KEY,
  MAX_PENDING_RESULTS,
  type GameResultBatchRequest,
  type GameResultPayload,
  type PendingGameResult,
} from './game-sync.model';

function isPendingGameResult(value: unknown): value is PendingGameResult {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<PendingGameResult>;
  return (
    typeof item.localId === 'string' &&
    typeof item.clientResultId === 'string' &&
    typeof item.gameId === 'string' &&
    typeof item.playedAt === 'string' &&
    typeof item.score === 'number' &&
    typeof item.synced === 'boolean' &&
    typeof item.syncAttempts === 'number' &&
    (item.signature === undefined || typeof item.signature === 'string')
  );
}

export class GameSyncRepository {
  async loadQueue(): Promise<PendingGameResult[]> {
    const parsed = await storage.load<PendingGameResult[]>(PENDING_RESULTS_KEY);
    if (!parsed || !Array.isArray(parsed)) return [];

    const queue = this.pruneQueue(parsed.filter(isPendingGameResult));
    if (queue.length < parsed.length) {
      logger.warn('[GameSync] Dropped invalid queue items');
      await this.saveQueue(queue);
    }

    return queue;
  }

  async saveQueue(queue: PendingGameResult[]): Promise<void> {
    await storage.save(PENDING_RESULTS_KEY, this.pruneQueue(queue));
  }

  async clear(): Promise<void> {
    await storage.remove(PENDING_RESULTS_KEY);
  }

  async sync(gameId: string, items: GameResultPayload[]): Promise<SyncResponse> {
    const body: GameResultBatchRequest = {
      gameId,
      items,
    };

    return apiClient.post<SyncResponse>('/results', body);
  }

  private pruneQueue(queue: PendingGameResult[]): PendingGameResult[] {
    return queue.slice(-MAX_PENDING_RESULTS);
  }
}

export const gameSyncRepository = new GameSyncRepository();
