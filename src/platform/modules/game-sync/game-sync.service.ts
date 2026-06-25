import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { eventBus } from '@platform/core/events';
import { generateId } from '@platform/core/utils';
import { usePlatformStore } from '@platform/core/state';
import { guest, type GuestService } from '@platform/modules/guest';

import {
  buildReplayPayload,
  computeReplayHash,
  sanitizeMetadata,
  toNonNegativeInt,
  MAX_BATCH_SIZE,
  MAX_SYNC_ATTEMPTS,
  type PendingGameResult,
  type ReplayMove,
} from './game-sync.model';
import { gameSyncRepository, type GameSyncRepository } from './game-sync.repository';

export interface RecordResultParams {
  score: number;
  duration: number;
  seed?: number;
  moves?: ReplayMove[];
  metadata?: Record<string, unknown>;
}

/**
 * Offline-first match-result sync (`documents/game.md` §6).
 *
 * Results are always persisted locally first, then batch-uploaded to
 * `POST /game/sync` when possible. A single in-flight lock prevents duplicate
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
    const gameId = getConfig().gameId;
    const score = toNonNegativeInt(params.score);
    const duration = toNonNegativeInt(params.duration);

    const replay = buildReplayPayload({
      score,
      duration,
      seed: params.seed ?? Date.now(),
      moves: params.moves,
    });
    const replayHash = await computeReplayHash(replay);

    const result: PendingGameResult = {
      localId: generateId('result'),
      gameId,
      guestId: this.guestService.getGuestId() ?? '',
      score,
      duration,
      replayHash,
      metadata: params.metadata,
      synced: false,
      syncAttempts: 0,
      createdAt: new Date().toISOString(),
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
      await this.flushForGuest(gameId, guestId);
    } finally {
      this.flushing = false;
    }
  }

  private async flushForGuest(gameId: string, guestId: string): Promise<void> {
    let queue = await this.repository.loadQueue();
    const pending = queue.filter(
      (r) => !r.synced && r.gameId === gameId && r.syncAttempts < MAX_SYNC_ATTEMPTS
    );
    if (pending.length === 0) return;

    for (let i = 0; i < pending.length; i += MAX_BATCH_SIZE) {
      const batch = pending.slice(i, i + MAX_BATCH_SIZE);

      try {
        const response = await this.repository.sync(
          gameId,
          batch.map(({ score, duration, replayHash, metadata }) => ({
            score,
            duration,
            replayHash,
            metadata: sanitizeMetadata(metadata),
          }))
        );

        queue = this.markBatchSynced(queue, batch, gameId, guestId);
        await this.repository.saveQueue(queue);

        if (response.bestScore > 0) {
          usePlatformStore.getState().setHighScore(response.bestScore);
        }

        eventBus.emit('game:synced', response);

        if (response.rejected > 0) {
          logger.warn(`[GameSync] ${response.rejected} result(s) rejected for ${gameId}`);
        }
      } catch (error) {
        if (await this.handleAuthError(error)) {
          // Guest re-created; remaining items retry on the next flush.
          return;
        }

        queue = this.incrementAttempts(queue, batch, gameId);
        await this.repository.saveQueue(queue);
        logger.warn('[GameSync] Batch sync failed, will retry later', error);
        throw error;
      }
    }
  }

  /** On auth failure, re-init guest so the next flush works with a fresh token. */
  private async handleAuthError(error: unknown): Promise<boolean> {
    if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
      logger.warn('[GameSync] Guest auth failed — reinitializing identity');
      await this.guestService.reinit();
      return true;
    }
    return false;
  }

  private markBatchSynced(
    queue: PendingGameResult[],
    batch: PendingGameResult[],
    gameId: string,
    guestId: string
  ): PendingGameResult[] {
    const hashes = new Set(batch.map((r) => r.replayHash));
    return queue.map((item) =>
      hashes.has(item.replayHash) && item.gameId === gameId
        ? { ...item, synced: true, guestId }
        : item
    );
  }

  private incrementAttempts(
    queue: PendingGameResult[],
    batch: PendingGameResult[],
    gameId: string
  ): PendingGameResult[] {
    const ids = new Set(batch.map((r) => r.localId));
    return queue.map((item) =>
      ids.has(item.localId) && item.gameId === gameId
        ? { ...item, syncAttempts: item.syncAttempts + 1 }
        : item
    );
  }
}

export const gameSync = new GameSyncService();
