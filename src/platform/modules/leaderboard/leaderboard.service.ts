import {
  isCacheFresh,
  createInitialView,
  type LeaderboardData,
  type LeaderboardView,
  type LeaderboardBoard,
} from './leaderboard.model';
import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { getConfig } from '@platform/core/config';
import { guest, type GuestService } from '@platform/modules/guest';
import { leaderboardRepository, type LeaderboardRepository } from './leaderboard.repository';

const BOARD: LeaderboardBoard = 'global';

export interface FetchOptions {
  page?: number;
  force?: boolean;
}

/**
 * Orchestrates leaderboard reads.
 *
 * Owns an in-memory view, a TTL cache, predictable loading/error
 * transitions, and offline fallback to the persisted cache. The UI consumes
 * the emitted {@link LeaderboardView}; it never calls the API directly.
 */
export class LeaderboardService {
  private view: LeaderboardView = createInitialView(BOARD);
  private currentPage = 1;
  private inflight: Promise<LeaderboardView> | null = null;

  constructor(
    private readonly repository: LeaderboardRepository = leaderboardRepository,
    private readonly guestService: GuestService = guest
  ) {}

  /** Warm the in-memory view from the persisted cache (offline-friendly). */
  async init(): Promise<void> {
    const gameId = getConfig().gameId;
    const cache = await this.repository.loadCache(BOARD, gameId, this.currentPage);
    if (cache) {
      this.view = this.buildView(cache.data, {
        fromCache: true,
        lastUpdated: cache.updatedAt,
      });
    }
    logger.info('[Leaderboard] Initialized');
  }

  getView(): LeaderboardView {
    return this.view;
  }

  /** Loads the leaderboard, using a fresh cache when available unless `force` is set. */
  async fetchLeaderboard(options: FetchOptions = {}): Promise<LeaderboardView> {
    if (options.page) {
      this.currentPage = options.page;
    }

    const current = this.view;
    if (!options.force && current.lastUpdated && !current.fromCache) {
      const fresh = isCacheFresh({
        board: BOARD,
        page: this.currentPage,
        data: this.toData(current),
        updatedAt: current.lastUpdated,
      });
      if (fresh && current.status === 'ready') {
        this.emit(current);
        return current;
      }
    }

    if (this.inflight) return this.inflight;

    const request = this.runFetch().finally(() => {
      this.inflight = null;
    });
    this.inflight = request;
    return request;
  }

  /** Force a network refresh for the current page. */
  async refreshLeaderboard(page?: number): Promise<LeaderboardView> {
    return this.fetchLeaderboard({ force: true, page });
  }

  /** Ensures the leaderboard is loaded and returns the current player's rank (or null). */
  async fetchPlayerRank(): Promise<number | null> {
    const view = await this.fetchLeaderboard();
    return view.myRank;
  }

  private async runFetch(): Promise<LeaderboardView> {
    const gameId = getConfig().gameId;
    const hasData = this.view.entries.length > 0;

    this.transition({ status: hasData ? 'refreshing' : 'loading', error: null });

    // Optional auth — applies Bearer token when guest credentials exist.
    const guestId = await this.guestService.ensureGuestId();

    try {
      const data = await this.repository.fetch({
        board: BOARD,
        gameId,
        page: this.currentPage,
      });
      return this.applySuccess(data, guestId);
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 404)) {
        const retried = await this.retryAfterGuestReset(gameId);
        if (retried) return retried;
      }
      return this.applyFailure(error);
    }
  }

  /** Recover from auth failure by re-creating the guest once. */
  private async retryAfterGuestReset(gameId: string): Promise<LeaderboardView | null> {
    try {
      const guestId = await this.guestService.reinit();
      const data = await this.repository.fetch({
        board: BOARD,
        gameId,
        page: this.currentPage,
      });
      return this.applySuccess(data, guestId);
    } catch (error) {
      logger.warn('[Leaderboard] Retry after guest reset failed', error);
      return null;
    }
  }

  private async applySuccess(
    data: LeaderboardData,
    guestId: string | null
  ): Promise<LeaderboardView> {
    const updatedAt = Date.now();
    await this.repository.saveCache(
      { board: BOARD, page: data.pagination.page, data, updatedAt },
      getConfig().gameId
    );

    const view = this.buildView(data, {
      fromCache: false,
      lastUpdated: updatedAt,
      myGuestId: guestId,
    });
    this.view = view;
    this.emit(view);
    return view;
  }

  private applyFailure(error: unknown): LeaderboardView {
    logger.warn('[Leaderboard] Fetch failed', error);
    const current = this.view;
    const hasData = current.entries.length > 0;

    const view: LeaderboardView = {
      ...current,
      status: hasData ? 'ready' : 'error',
      fromCache: hasData ? true : current.fromCache,
      error: hasData ? 'leaderboard.offline' : 'leaderboard.error',
    };
    this.view = view;
    this.emit(view);
    return view;
  }

  private buildView(
    data: LeaderboardData,
    extra: { fromCache: boolean; lastUpdated: number; myGuestId?: string | null }
  ): LeaderboardView {
    return {
      board: BOARD,
      status: 'ready',
      entries: data.top,
      myRank: data.myRank,
      pagination: data.pagination,
      myGuestId: extra.myGuestId ?? this.guestService.getGuestId(),
      isEmpty: data.top.length === 0,
      fromCache: extra.fromCache,
      lastUpdated: extra.lastUpdated,
      error: null,
    };
  }

  private transition(patch: Partial<LeaderboardView>): void {
    this.view = { ...this.view, ...patch };
    this.emit(this.view);
  }

  private toData(view: LeaderboardView): LeaderboardData {
    return {
      top: view.entries,
      myRank: view.myRank,
      pagination: view.pagination,
    };
  }

  private emit(view: LeaderboardView): void {
    eventBus.emit('leaderboard:update', view);
  }
}

export const leaderboard = new LeaderboardService();
