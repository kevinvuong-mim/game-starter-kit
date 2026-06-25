import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import type { ApiEnvelope } from '@platform/core/api';

import {
  LEADERBOARD_LIMIT,
  LEADERBOARD_CACHE_PREFIX,
  type LeaderboardBoard,
  type LeaderboardCache,
  type LeaderboardData,
} from './leaderboard.model';

export interface FetchLeaderboardParams {
  board: LeaderboardBoard;
  gameId: string;
  guestId?: string | null;
  limit?: number;
  page?: number;
}

/**
 * API + cache layer for the leaderboard. The only place that talks to
 * `GET /leaderboard/global` or persists the offline cache.
 */
export class LeaderboardRepository {
  private readonly timeoutMs = 10_000;

  /** Fetches one board. Sends only backend-whitelisted query params. */
  async fetch(params: FetchLeaderboardParams): Promise<LeaderboardData> {
    const query = new URLSearchParams({
      gameId: params.gameId,
      limit: String(params.limit ?? LEADERBOARD_LIMIT),
    });
    if (params.guestId) query.set('guestId', params.guestId);
    if (params.page && params.page > 1) query.set('page', String(params.page));

    const envelope = await apiClient.get<ApiEnvelope<LeaderboardData>>(
      `/leaderboard/${params.board}?${query.toString()}`,
      { timeout: this.timeoutMs }
    );

    return this.normalize(envelope.data);
  }

  async loadCache(board: LeaderboardBoard, gameId: string): Promise<LeaderboardCache | null> {
    return storage.load<LeaderboardCache>(this.cacheKey(board, gameId));
  }

  async saveCache(cache: LeaderboardCache, gameId: string): Promise<void> {
    await storage.save(this.cacheKey(cache.board, gameId), cache);
  }

  /** Defensively normalizes the payload so the UI never sees malformed data. */
  private normalize(data: LeaderboardData | undefined): LeaderboardData {
    const top = Array.isArray(data?.top) ? data!.top : [];
    return {
      top: top.map((entry) => ({
        guestId: String(entry?.guestId ?? ''),
        name: typeof entry?.name === 'string' ? entry.name : null,
        score: Number(entry?.score ?? 0),
        rank: Number(entry?.rank ?? 0),
      })),
      myRank: typeof data?.myRank === 'number' ? data.myRank : null,
    };
  }

  private cacheKey(board: LeaderboardBoard, gameId: string): string {
    return `${LEADERBOARD_CACHE_PREFIX}${gameId}:${board}`;
  }
}

export const leaderboardRepository = new LeaderboardRepository();
