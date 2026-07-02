import {
  MAX_BATCH_SIZE,
  sanitizeMetadata,
  toNonNegativeInt,
  computeReplaySignature,
  MAX_SYNC_ATTEMPTS,
  type PendingGameResult,
  type SyncResponse,
} from './game-sync.model';
import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { generateId } from '@platform/core/utils';
import { getConfig } from '@platform/core/config';
import { guest, type GuestService } from '@platform/modules/guest';
import { gameSyncRepository, type GameSyncRepository } from './game-sync.repository';

const BASE_SYNC_BACKOFF_MS = 30_000;
const MAX_SYNC_BACKOFF_MS = 30 * 60 * 1000;

export interface RecordResultParams {
  score: number;
  playedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Offline-first match-result sync.
 */
export class GameSyncService {
  private flushing = false;

  constructor(
    private readonly repository: GameSyncRepository = gameSyncRepository,
    private readonly guestService: GuestService = guest
  ) {}

  async recordResult(params: RecordResultParams): Promise<void> {
    const { gameId, replaySecret } = getConfig();
    const guestId = this.guestService.getGuestId() ?? '';
    const score = toNonNegativeInt(params.score);
    const playedAt = params.playedAt ?? new Date().toISOString();
    const clientResultId = generateId('result');

    const signature = await computeReplaySignature({
      gameId,
      guestId,
      clientResultId,
      score,
      playedAt,
      replaySecret,
    });

    const result: PendingGameResult = {
      localId: clientResultId,
      clientResultId,
      gameId,
      guestId,
      score,
      playedAt,
      signature,
      metadata: params.metadata,
      synced: false,
      syncAttempts: 0,
      createdAt: playedAt,
    };

    const queue = await this.repository.loadQueue();
    queue.push(result);
    await this.repository.saveQueue(queue);
    logger.debug('[GameSync] Result queued', { clientResultId, score });
  }

  async flush(): Promise<void> {
    if (this.flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const gameId = getConfig().gameId;
    const guestId = this.guestService.getGuestId();
    if (!guestId) {
      logger.debug('[GameSync] Flush skipped — no guest credentials');
      return;
    }

    this.flushing = true;
    try {
      await this.flushForGuest(gameId, guestId);
    } finally {
      this.flushing = false;
    }
  }

  private async flushForGuest(gameId: string, guestId: string): Promise<void> {
    let queue = await this.repository.loadQueue();
    const now = Date.now();
    const pending = queue.filter(
      (r) =>
        !r.synced &&
        r.gameId === gameId &&
        r.syncAttempts < MAX_SYNC_ATTEMPTS &&
        (!r.nextAttemptAt || Date.parse(r.nextAttemptAt) <= now)
    );
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
      const batch = pending.slice(i, i + MAX_BATCH_SIZE);

      try {
        const response = await this.repository.sync(
          gameId,
          batch.map(({ clientResultId, score, playedAt, signature, metadata }) => ({
            clientResultId,
            score,
            playedAt,
            signature,
            metadata: sanitizeMetadata(metadata),
          }))
        );

        queue = this.applyBatchSyncResults(queue, batch, response, gameId, guestId);
        queue = this.pruneQueue(queue);
        await this.repository.saveQueue(queue);
        eventBus.emit('game:synced', response);
      } catch (error) {
        this.logExpectedApiErrors(error);
        queue = this.incrementAttempts(queue, batch, gameId, error);
        await this.repository.saveQueue(queue);
        logger.warn('[GameSync] Batch sync failed, will retry later', error);
        throw error;
      }
    }
  }

  private logExpectedApiErrors(error: unknown): void {
    if (error instanceof ApiError && error.status === 404) {
      logger.error('[GameSync] Game not found on backend — check gameId config', error);
    }
    if (error instanceof ApiError && error.status === 401) {
      logger.error('[GameSync] Guest auth failed — credentials may be invalid', error);
    }
  }

  private applyBatchSyncResults(
    queue: PendingGameResult[],
    batch: PendingGameResult[],
    response: SyncResponse,
    gameId: string,
    guestId: string
  ): PendingGameResult[] {
    if (!response.success) {
      return queue;
    }

    const batchIds = new Set(batch.map((item) => item.localId));
    return queue.map((item) =>
      batchIds.has(item.localId) && item.gameId === gameId
        ? { ...item, synced: true, guestId }
        : item
    );
  }

  private pruneQueue(queue: PendingGameResult[]): PendingGameResult[] {
    return queue.filter((item) => !item.synced && item.syncAttempts < MAX_SYNC_ATTEMPTS);
  }

  private incrementAttempts(
    queue: PendingGameResult[],
    batch: PendingGameResult[],
    gameId: string,
    error: unknown
  ): PendingGameResult[] {
    const ids = new Set(batch.map((r) => r.localId));
    const errorCode = error instanceof ApiError ? String(error.status) : 'network';
    return queue.map((item) =>
      ids.has(item.localId) && item.gameId === gameId
        ? this.markAttemptFailed(item, errorCode)
        : item
    );
  }

  private markAttemptFailed(item: PendingGameResult, errorCode: string): PendingGameResult {
    const syncAttempts = item.syncAttempts + 1;
    const backoffMs = Math.min(
      MAX_SYNC_BACKOFF_MS,
      BASE_SYNC_BACKOFF_MS * 2 ** Math.max(0, syncAttempts - 1)
    );
    const now = Date.now();

    return {
      ...item,
      syncAttempts,
      lastErrorCode: errorCode,
      lastAttemptAt: new Date(now).toISOString(),
      nextAttemptAt: new Date(now + backoffMs).toISOString(),
    };
  }
}

export const gameSync = new GameSyncService();
