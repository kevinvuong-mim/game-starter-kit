import {
  LEADERBOARD_LIMIT,
  type LeaderboardData,
  type LeaderboardCache,
  createInitialPagination,
  LEADERBOARD_CACHE_PREFIX,
  type LeaderboardPagination,
} from './leaderboard.model';
import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import type { ApiEnvelope } from '@platform/core/api';

export interface FetchLeaderboardParams {
  page?: number;
  gameId: string;
  guestId?: string | null;
  limit?: number;
}

/**
 * API + cache layer for the leaderboard. The only place that talks to
 * `GET /leaderboards` or persists the offline cache.
 */
export class LeaderboardRepository {
  private readonly timeoutMs = 10_000;

  /** Fetches one page. Guest identity is sent as a public query param when available. */
  async fetch(params: FetchLeaderboardParams): Promise<LeaderboardData> {
    const page = params.page ?? 1;
    const limit = params.limit ?? LEADERBOARD_LIMIT;

    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      gameId: params.gameId,
    });
    if (params.guestId) {
      query.set('guestId', params.guestId);
    }

    const envelope = await apiClient.get<ApiEnvelope<LeaderboardData>>(
      `/leaderboards?${query.toString()}`,
      { timeout: this.timeoutMs, auth: false }
    );

    return this.normalize(envelope.data, page, limit);
  }

  async loadCache(gameId: string, page: number): Promise<LeaderboardCache | null> {
    return storage.load<LeaderboardCache>(this.cacheKey(gameId, page));
  }

  async saveCache(cache: LeaderboardCache, gameId: string): Promise<void> {
    await storage.save(this.cacheKey(gameId, cache.page), cache);
  }

  private normalize(
    data: LeaderboardData | undefined,
    page: number,
    limit: number
  ): LeaderboardData {
    const top = Array.isArray(data?.top) ? data!.top : [];
    const pagination = this.normalizePagination(data?.pagination, page, limit);

    return {
      pagination,
      top: top.map((entry) => ({
        rank: Number(entry?.rank ?? 0),
        score: Number(entry?.score ?? 0),
        guestId: String(entry?.guestId ?? ''),
        name: typeof entry?.name === 'string' ? entry.name : null,
      })),
      myRank: typeof data?.myRank === 'number' ? data.myRank : null,
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

  private cacheKey(gameId: string, page: number): string {
    return `${LEADERBOARD_CACHE_PREFIX}${gameId}:p${page}`;
  }
}

export const leaderboardRepository = new LeaderboardRepository();
