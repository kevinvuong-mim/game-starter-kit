import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { eventBus } from '@platform/core/events';
import { guest, type GuestService } from '@platform/modules/guest';

import {
  isCacheFresh,
  createInitialView,
  type LeaderboardBoard,
  type LeaderboardData,
  type LeaderboardView,
} from './leaderboard.model';
import { leaderboardRepository, type LeaderboardRepository } from './leaderboard.repository';

const BOARDS: LeaderboardBoard[] = ['global', 'weekly'];

export interface FetchOptions {
  force?: boolean;
}

/**
 * Orchestrates leaderboard reads (`documents/game.md` §7).
 *
 * Owns an in-memory view per board, a TTL cache, predictable loading/error
 * transitions, and offline fallback to the persisted cache. The UI consumes
 * the emitted {@link LeaderboardView}; it never calls the API directly.
 */
export class LeaderboardService {
  private lastBoard: LeaderboardBoard = 'global';
  private readonly views: Record<LeaderboardBoard, LeaderboardView> = {
    global: createInitialView('global'),
    weekly: createInitialView('weekly'),
  };
  private readonly inflight = new Map<LeaderboardBoard, Promise<LeaderboardView>>();

  constructor(
    private readonly repository: LeaderboardRepository = leaderboardRepository,
    private readonly guestService: GuestService = guest
  ) {}

  /** Warm the in-memory views from the persisted cache (offline-friendly). */
  async init(): Promise<void> {
    const gameId = getConfig().gameId;
    await Promise.all(
      BOARDS.map(async (board) => {
        const cache = await this.repository.loadCache(board, gameId);
        if (cache) {
          this.views[board] = this.buildView(board, cache.data, {
            fromCache: true,
            lastUpdated: cache.updatedAt,
          });
        }
      })
    );
    logger.info('[Leaderboard] Initialized');
  }

  getView(board: LeaderboardBoard = this.lastBoard): LeaderboardView {
    return this.views[board];
  }

  /** Loads a board, using a fresh cache when available unless `force` is set. */
  async fetchLeaderboard(
    board: LeaderboardBoard = this.lastBoard,
    options: FetchOptions = {}
  ): Promise<LeaderboardView> {
    this.lastBoard = board;

    const current = this.views[board];
    if (!options.force && current.lastUpdated && !current.fromCache) {
      // Already loaded from network this session and still fresh enough.
      const fresh = isCacheFresh({
        board,
        data: this.toData(current),
        updatedAt: current.lastUpdated,
      });
      if (fresh && current.status === 'ready') {
        this.emit(current);
        return current;
      }
    }

    const existing = this.inflight.get(board);
    if (existing) return existing;

    const request = this.runFetch(board).finally(() => this.inflight.delete(board));
    this.inflight.set(board, request);
    return request;
  }

  /** Force a network refresh of a board. */
  async refreshLeaderboard(board: LeaderboardBoard = this.lastBoard): Promise<LeaderboardView> {
    return this.fetchLeaderboard(board, { force: true });
  }

  /** Ensures a board is loaded and returns the current player's rank (or null). */
  async fetchPlayerRank(board: LeaderboardBoard = this.lastBoard): Promise<number | null> {
    const view = await this.fetchLeaderboard(board);
    return view.myRank;
  }

  private async runFetch(board: LeaderboardBoard): Promise<LeaderboardView> {
    const gameId = getConfig().gameId;
    const hasData = this.views[board].entries.length > 0;

    this.transition(board, { status: hasData ? 'refreshing' : 'loading', error: null });

    const guestId = await this.guestService.ensureGuestId();

    try {
      const data = await this.repository.fetch({ board, gameId, guestId });
      return this.applySuccess(board, data, guestId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        const retried = await this.retryAfterGuestReset(board, gameId);
        if (retried) return retried;
      }
      return this.applyFailure(board, error);
    }
  }

  /** Recover from `404 Guest player not found` by re-creating the guest once. */
  private async retryAfterGuestReset(
    board: LeaderboardBoard,
    gameId: string
  ): Promise<LeaderboardView | null> {
    try {
      const guestId = await this.guestService.reinit();
      const data = await this.repository.fetch({ board, gameId, guestId });
      return this.applySuccess(board, data, guestId);
    } catch (error) {
      logger.warn('[Leaderboard] Retry after guest reset failed', error);
      return null;
    }
  }

  private async applySuccess(
    board: LeaderboardBoard,
    data: LeaderboardData,
    guestId: string | null
  ): Promise<LeaderboardView> {
    const updatedAt = Date.now();
    await this.repository.saveCache({ board, data, updatedAt }, getConfig().gameId);

    const view = this.buildView(board, data, {
      fromCache: false,
      lastUpdated: updatedAt,
      myGuestId: guestId,
    });
    this.views[board] = view;
    this.emit(view);
    return view;
  }

  private applyFailure(board: LeaderboardBoard, error: unknown): LeaderboardView {
    logger.warn('[Leaderboard] Fetch failed', error);
    const current = this.views[board];
    const hasData = current.entries.length > 0;

    // Keep showing cached data when we have it; otherwise surface an error state.
    const view: LeaderboardView = {
      ...current,
      status: hasData ? 'ready' : 'error',
      fromCache: hasData ? true : current.fromCache,
      error: hasData ? 'leaderboard.offline' : 'leaderboard.error',
    };
    this.views[board] = view;
    this.emit(view);
    return view;
  }

  private buildView(
    board: LeaderboardBoard,
    data: LeaderboardData,
    extra: { fromCache: boolean; lastUpdated: number; myGuestId?: string | null }
  ): LeaderboardView {
    return {
      board,
      status: 'ready',
      entries: data.top,
      myRank: data.myRank,
      myGuestId: extra.myGuestId ?? this.guestService.getGuestId(),
      isEmpty: data.top.length === 0,
      fromCache: extra.fromCache,
      lastUpdated: extra.lastUpdated,
      error: null,
    };
  }

  private transition(board: LeaderboardBoard, patch: Partial<LeaderboardView>): void {
    this.views[board] = { ...this.views[board], ...patch };
    this.emit(this.views[board]);
  }

  private toData(view: LeaderboardView): LeaderboardData {
    return { top: view.entries, myRank: view.myRank };
  }

  private emit(view: LeaderboardView): void {
    eventBus.emit('leaderboard:update', view);
  }
}

export const leaderboard = new LeaderboardService();
