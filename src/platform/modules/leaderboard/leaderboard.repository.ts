import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import type { ApiEnvelope } from '@platform/core/api';

import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_CACHE_PREFIX,
  createInitialPagination,
  type LeaderboardBoard,
  type LeaderboardCache,
  type LeaderboardData,
  type LeaderboardPagination,
} from './leaderboard.model';

export interface FetchLeaderboardParams {
  board: LeaderboardBoard;
  gameId: string;
  limit?: number;
  page?: number;
}

/**
 * API + cache layer for the leaderboard. The only place that talks to
 * `GET /leaderboard/global` or persists the offline cache.
 */
export class LeaderboardRepository {
  private readonly timeoutMs = 10_000;

  /** Fetches one board page. Guest identity is sent via Bearer token when available. */
  async fetch(params: FetchLeaderboardParams): Promise<LeaderboardData> {
    const page = params.page ?? 1;
    const limit = params.limit ?? LEADERBOARD_LIMIT;

    const query = new URLSearchParams({
      gameId: params.gameId,
      page: String(page),
      limit: String(limit),
    });

    const envelope = await apiClient.get<ApiEnvelope<LeaderboardData>>(
      `/leaderboard/${params.board}?${query.toString()}`,
      { timeout: this.timeoutMs }
    );

    return this.normalize(envelope.data, page, limit);
  }

  async loadCache(
    board: LeaderboardBoard,
    gameId: string,
    page: number
  ): Promise<LeaderboardCache | null> {
    return storage.load<LeaderboardCache>(this.cacheKey(board, gameId, page));
  }

  async saveCache(cache: LeaderboardCache, gameId: string): Promise<void> {
    await storage.save(this.cacheKey(cache.board, gameId, cache.page), cache);
  }

  private normalize(
    data: LeaderboardData | undefined,
    page: number,
    limit: number
  ): LeaderboardData {
    const top = Array.isArray(data?.top) ? data!.top : [];
    const pagination = this.normalizePagination(data?.pagination, page, limit);

    return {
      top: top.map((entry) => ({
        guestId: String(entry?.guestId ?? ''),
        name: typeof entry?.name === 'string' ? entry.name : null,
        score: Number(entry?.score ?? 0),
        rank: Number(entry?.rank ?? 0),
      })),
      myRank: typeof data?.myRank === 'number' ? data.myRank : null,
      pagination,
    };
  }

  private normalizePagination(
    pagination: LeaderboardPagination | undefined,
    page: number,
    limit: number
  ): LeaderboardPagination {
    if (!pagination) {
      return createInitialPagination(page);
    }

    return {
      page: Number(pagination.page ?? page),
      limit: Number(pagination.limit ?? limit),
      total: Number(pagination.total ?? 0),
      totalPages: Number(pagination.totalPages ?? 0),
    };
  }

  private cacheKey(board: LeaderboardBoard, gameId: string, page: number): string {
    return `${LEADERBOARD_CACHE_PREFIX}${gameId}:${board}:p${page}`;
  }
}

export const leaderboardRepository = new LeaderboardRepository();
