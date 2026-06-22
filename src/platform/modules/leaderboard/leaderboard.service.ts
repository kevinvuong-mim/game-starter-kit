import { eventBus } from '@platform/core/events';
import { usePlatformStore } from '@platform/core/state';
import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import { logger } from '@platform/core/error';
import type { LeaderboardEntry, LeaderboardState } from '@platform/core/state';

export type LeaderboardBoard = 'daily' | 'weekly' | 'allTime';

interface QueuedSubmission {
  score: number;
  board: LeaderboardBoard;
  timestamp: number;
}

const CACHE_KEY = 'leaderboard:cache';
const QUEUE_KEY = 'leaderboard:queue';

export class LeaderboardService {
  private queue: QueuedSubmission[] = [];

  async init(): Promise<void> {
    const cached = await storage.load<LeaderboardState>(CACHE_KEY);
    if (cached) {
      usePlatformStore.getState().hydrate({ leaderboard: cached });
    }

    const queued = await storage.load<QueuedSubmission[]>(QUEUE_KEY);
    if (queued?.length) {
      this.queue = queued;
      void this.flushQueue();
    }
  }

  async submitScore(score: number, board: LeaderboardBoard = 'daily'): Promise<void> {
    const store = usePlatformStore.getState();
    const userId = store.user.id || 'anonymous';
    const displayName = store.user.displayName;

    // Optimistic update
    const optimistic: LeaderboardEntry = {
      rank: 0,
      playerId: userId,
      displayName,
      score,
    };

    const current = store.leaderboard[board];
    const updated = [...current, optimistic]
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    store.setLeaderboard(board, updated);
    eventBus.emit('leaderboard:submit', { score, board });

    try {
      await apiClient.post('/leaderboard/submit', { score, board, userId, displayName });
    } catch {
      logger.warn('[Leaderboard] Offline - queuing submission');
      this.queue.push({ score, board, timestamp: Date.now() });
      await storage.save(QUEUE_KEY, this.queue);
    }
  }

  async getLeaderboard(board: LeaderboardBoard = 'daily'): Promise<LeaderboardEntry[]> {
    const cached = usePlatformStore.getState().leaderboard[board];
    const lastFetch = usePlatformStore.getState().leaderboard.lastFetchedAt;
    const cacheAge = Date.now() - lastFetch;

    if (cached.length > 0 && cacheAge < 60_000) {
      return cached;
    }

    try {
      const data = await apiClient.get<LeaderboardEntry[]>(`/leaderboard/${board}`);
      usePlatformStore.getState().setLeaderboard(board, data);
      await this.persistCache();
      return data;
    } catch {
      return cached;
    }
  }

  async getRank(board: LeaderboardBoard = 'daily'): Promise<number> {
    const cachedRank = usePlatformStore.getState().leaderboard.playerRanks[board];
    if (cachedRank) return cachedRank;

    const userId = usePlatformStore.getState().user.id;
    if (!userId) return -1;

    try {
      const { rank } = await apiClient.get<{ rank: number }>(
        `/leaderboard/${board}/rank/${userId}`
      );
      usePlatformStore.getState().setPlayerRank(board, rank);
      return rank;
    } catch {
      const board_data = usePlatformStore.getState().leaderboard[board];
      const entry = board_data.find((e) => e.playerId === userId);
      return entry?.rank ?? -1;
    }
  }

  private async flushQueue(): Promise<void> {
    const pending = [...this.queue];
    this.queue = [];

    for (const item of pending) {
      try {
        const store = usePlatformStore.getState();
        await apiClient.post('/leaderboard/submit', {
          score: item.score,
          board: item.board,
          userId: store.user.id,
          displayName: store.user.displayName,
        });
      } catch {
        this.queue.push(item);
      }
    }

    await storage.save(QUEUE_KEY, this.queue);
  }

  private async persistCache(): Promise<void> {
    await storage.save(CACHE_KEY, usePlatformStore.getState().leaderboard);
  }
}

export const leaderboard = new LeaderboardService();
