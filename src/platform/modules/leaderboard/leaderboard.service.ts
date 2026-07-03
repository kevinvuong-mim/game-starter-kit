import {
  isCacheFresh,
  createInitialView,
  type LeaderboardData,
  type LeaderboardView,
} from './leaderboard.model';
import { ApiError } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { eventBus } from '@platform/core/events';
import { getConfig } from '@platform/core/config';
import { guest, type GuestService } from '@platform/modules/guest';
import { leaderboardRepository, type LeaderboardRepository } from './leaderboard.repository';

export interface FetchOptions {
  page?: number;
  force?: boolean;
}

export class LeaderboardService {
  private view: LeaderboardView = createInitialView();
  private currentPage = 1;
  private inflight: Promise<LeaderboardView> | null = null;

  constructor(
    private readonly repository: LeaderboardRepository = leaderboardRepository,
    private readonly guestService: GuestService = guest
  ) {}

  async init(): Promise<void> {
    const gameId = getConfig().gameId;
    const cache = await this.repository.loadCache(gameId, this.currentPage);
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

  async fetchLeaderboard(options: FetchOptions = {}): Promise<LeaderboardView> {
    if (options.page) {
      this.currentPage = options.page;
    }

    const current = this.view;
    if (!options.force && current.lastUpdated && !current.fromCache) {
      const fresh = isCacheFresh({
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

  async refreshLeaderboard(page?: number): Promise<LeaderboardView> {
    return this.fetchLeaderboard({ force: true, page });
  }

  async fetchPlayerRank(): Promise<number | null> {
    const view = await this.fetchLeaderboard();
    return view.myRank;
  }

  private async runFetch(): Promise<LeaderboardView> {
    const gameId = getConfig().gameId;
    const hasData = this.view.entries.length > 0;

    this.transition({ status: hasData ? 'refreshing' : 'loading', error: null });

    const guestId = this.guestService.getGuestId();

    try {
      const data = await this.repository.fetch({
        gameId,
        page: this.currentPage,
        guestId,
      });
      return this.applySuccess(data, guestId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        logger.error('[Leaderboard] Game not found on backend — check gameId config', error);
      }

      return this.applyFailure(error);
    }
  }

  private async applySuccess(
    data: LeaderboardData,
    guestId: string | null
  ): Promise<LeaderboardView> {
    const updatedAt = Date.now();
    await this.repository.saveCache({ page: data.page, data, updatedAt }, getConfig().gameId);

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
    const totalPages = data.total > 0 ? Math.ceil(data.total / data.limit) : 0;

    return {
      status: 'ready',
      entries: data.items,
      myRank: data.self?.rank ?? null,
      myBestScore: data.self?.bestScore ?? null,
      pagination: {
        page: data.page,
        limit: data.limit,
        total: data.total,
        totalPages,
      },
      myGuestId: extra.myGuestId ?? this.guestService.getGuestId(),
      isEmpty: data.items.length === 0,
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
      gameId: getConfig().gameId,
      total: view.pagination.total,
      page: view.pagination.page,
      limit: view.pagination.limit,
      items: view.entries,
      self:
        view.myRank !== null && view.myBestScore !== null
          ? { rank: view.myRank, bestScore: view.myBestScore }
          : null,
    };
  }

  private emit(view: LeaderboardView): void {
    eventBus.emit('leaderboard:update', view);
  }
}

export const leaderboard = new LeaderboardService();
