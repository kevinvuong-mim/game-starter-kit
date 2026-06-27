import {
  MAX_BATCH_SIZE,
  sanitizeMetadata,
  toNonNegativeInt,
  computeReplayHash,
  MAX_SYNC_ATTEMPTS,
  generateRunSeed,
  type PendingGameResult,
  type SyncResponse,
  PERMANENT_SYNC_REJECTIONS,
  type SyncRejectionReason,
} from './game-sync.model';
import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { generateId } from '@platform/core/utils';
import { getConfig } from '@platform/core/config';
import { usePlatformStore } from '@platform/core/state';
import { guest, type GuestService } from '@platform/modules/guest';
import { gameSyncRepository, type GameSyncRepository } from './game-sync.repository';

const BASE_SYNC_BACKOFF_MS = 30_000;
const MAX_SYNC_BACKOFF_MS = 30 * 60 * 1000;

export interface RecordResultParams {
  score: number;
  runSeed?: string;
  playedAt?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Offline-first match-result sync.
 *
 * Results are always persisted locally first, then batch-uploaded to
 * `POST /games/:gameId/results` when possible. A single in-flight lock prevents duplicate
 * uploads; idempotency is guaranteed server-side by `replayHash`.
 */
export class GameSyncService {
  private flushing = false;

  constructor(
    private readonly repository: GameSyncRepository = gameSyncRepository,
    private readonly guestService: GuestService = guest
  ) {}

  /** Persists a finished match to the local queue (always succeeds offline). */
  async recordResult(params: RecordResultParams): Promise<void> {
    const { gameId, maxScore, replaySecret } = getConfig();
    const score = toNonNegativeInt(params.score);
    const runSeed = params.runSeed ?? generateRunSeed();
    const playedAt = params.playedAt ?? new Date().toISOString();

    const replayHash = await computeReplayHash({
      gameId,
      score,
      runSeed,
      replaySecret,
    });

    if (score > maxScore) {
      logger.warn('[GameSync] Result rejected locally: score exceeds maxScore', {
        score,
        maxScore,
        gameId,
      });
      eventBus.emit('game:sync:rejected', {
        gameId,
        items: [{ score, replayHash, reason: 'SCORE_EXCEEDS_MAX' }],
      });
      return;
    }

    const result: PendingGameResult = {
      localId: generateId('result'),
      gameId,
      guestId: this.guestService.getGuestId() ?? '',
      score,
      runSeed,
      playedAt,
      replayHash,
      metadata: params.metadata,
      synced: false,
      syncAttempts: 0,
      createdAt: playedAt,
    };

    const queue = await this.repository.loadQueue();
    queue.push(result);
    await this.repository.saveQueue(queue);
    logger.debug('[GameSync] Result queued', { localId: result.localId, score });
  }

  /**
   * Uploads all unsynced results for the current game. Safe to call repeatedly;
   * no-ops when offline, already running, or the queue is empty.
   */
  async flush(): Promise<void> {
    if (this.flushing) return;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return;

    const gameId = getConfig().gameId;
    const guestId = await this.guestService.ensureGuestId();
    if (!guestId) {
      logger.debug('[GameSync] Flush skipped — no guest credentials (offline)');
      return;
    }

    this.flushing = true;
    try {
      await this.flushForGuest(gameId, guestId, true);
    } finally {
      this.flushing = false;
    }
  }

  private async flushForGuest(
    gameId: string,
    guestId: string,
    allowAuthRetry: boolean
  ): Promise<void> {
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

    const permanentlyRejected: Array<{
      score: number;
      replayHash: string;
      reason: SyncRejectionReason;
    }> = [];

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
      const batch = pending.slice(i, i + MAX_BATCH_SIZE);

      try {
        const response = await this.repository.sync(
          gameId,
          batch.map(({ score, replayHash, playedAt, runSeed, metadata }) => ({
            score,
            replayHash,
            playedAt,
            metadata: sanitizeMetadata(metadata, runSeed),
          }))
        );

        const { queue: updatedQueue, rejected } = this.applyBatchSyncResults(
          queue,
          batch,
          response,
          gameId,
          guestId
        );
        queue = this.pruneQueue(updatedQueue);
        permanentlyRejected.push(...rejected);
        await this.repository.saveQueue(queue);

        if (response.bestScore > 0) {
          usePlatformStore.getState().setHighScore(response.bestScore);
        }

        eventBus.emit('game:synced', response);

        if (response.rejected > 0) {
          logger.warn(`[GameSync] ${response.rejected} result(s) rejected for ${gameId}`, {
            reasons: response.results
              .filter((item) => item.status === 'rejected')
              .map((item) => item.reason),
          });
        }
      } catch (error) {
        if (allowAuthRetry && (await this.handleGuestAuthError(error))) {
          const newGuestId = await this.guestService.ensureGuestId();
          if (newGuestId) {
            await this.flushForGuest(gameId, newGuestId, false);
          }
          return;
        }

        queue = this.incrementAttempts(queue, batch, gameId, error);
        await this.repository.saveQueue(queue);
        logger.warn('[GameSync] Batch sync failed, will retry later', error);
        throw error;
      }
    }

    if (permanentlyRejected.length > 0) {
      eventBus.emit('game:sync:rejected', { gameId, items: permanentlyRejected });
    }
  }

  private async handleGuestAuthError(error: unknown): Promise<boolean> {
    if (error instanceof ApiError && error.status === 401) {
      logger.warn('[GameSync] Guest auth failed — reinitializing identity');
      await this.guestService.reinit();
      return true;
    }

    if (error instanceof ApiError && error.status === 404) {
      logger.error('[GameSync] Game not found on backend — check gameId config', error);
    }

    return false;
  }

  private applyBatchSyncResults(
    queue: PendingGameResult[],
    batch: PendingGameResult[],
    response: SyncResponse,
    gameId: string,
    guestId: string
  ): {
    queue: PendingGameResult[];
    rejected: Array<{ score: number; replayHash: string; reason: SyncRejectionReason }>;
  } {
    const statusByHash = new Map(response.results.map((item) => [item.replayHash, item]));
    const batchHashes = new Set(batch.map((item) => item.replayHash));
    const rejected: Array<{ score: number; replayHash: string; reason: SyncRejectionReason }> = [];

    const updatedQueue = queue.map((item) => {
      if (!batchHashes.has(item.replayHash) || item.gameId !== gameId) {
        return item;
      }

      const resultItem = statusByHash.get(item.replayHash);
      if (!resultItem) {
        return { ...item, syncAttempts: item.syncAttempts + 1 };
      }

      if (resultItem.status === 'accepted') {
        return { ...item, synced: true, guestId };
      }

      if (resultItem.reason && PERMANENT_SYNC_REJECTIONS.has(resultItem.reason)) {
        logger.warn('[GameSync] Result permanently rejected', {
          replayHash: item.replayHash,
          reason: resultItem.reason,
        });
        rejected.push({
          score: item.score,
          replayHash: item.replayHash,
          reason: resultItem.reason,
        });
        return { ...item, synced: true, syncAttempts: MAX_SYNC_ATTEMPTS, guestId };
      }

      return { ...item, syncAttempts: item.syncAttempts + 1 };
    });

    return { queue: updatedQueue, rejected };
  }

  /** Drops synced items and exhausted retries to keep the queue bounded. */
  private pruneQueue(queue: PendingGameResult[]): PendingGameResult[] {
    const pruned = queue.filter((item) => !item.synced && item.syncAttempts < MAX_SYNC_ATTEMPTS);
    if (pruned.length < queue.length) {
      logger.debug('[GameSync] Pruned queue', {
        removed: queue.length - pruned.length,
        remaining: pruned.length,
      });
    }
    return pruned;
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
