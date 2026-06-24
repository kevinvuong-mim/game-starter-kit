import { logger } from '@platform/core/error';
import { apiClient } from '@platform/core/api';
import { eventBus } from '@platform/core/events';
import { storage } from '@platform/core/storage';
import { usePlatformStore } from '@platform/core/state';
import type { LeaderboardEntry, LeaderboardState } from '@platform/core/state';

const BOARD = 'allTime' as const;

interface QueuedSubmission {
  score: number;
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

  async submitScore(score: number): Promise<void> {
    const store = usePlatformStore.getState();
    const userId = store.user.id || 'anonymous';
    const displayName = store.user.displayName;

    const optimistic: LeaderboardEntry = {
      rank: 0,
      playerId: userId,
      displayName,
      score,
    };

    const current = store.leaderboard.allTime;
    const updated = [...current, optimistic]
      .sort((a, b) => b.score - a.score)
      .slice(0, 100)
      .map((e, i) => ({ ...e, rank: i + 1 }));

    store.setLeaderboard(updated);
    eventBus.emit('leaderboard:submit', { score, board: BOARD });

    try {
      await apiClient.post('/leaderboard/submit', { score, board: BOARD, userId, displayName });
    } catch {
      logger.warn('[Leaderboard] Offline - queuing submission');
      this.queue.push({ score, timestamp: Date.now() });
      await storage.save(QUEUE_KEY, this.queue);
    }
  }

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const cached = usePlatformStore.getState().leaderboard.allTime;
    const lastFetch = usePlatformStore.getState().leaderboard.lastFetchedAt;
    const cacheAge = Date.now() - lastFetch;

    if (cached.length > 0 && cacheAge < 60_000) {
      return cached;
    }

    try {
      const data = await apiClient.get<LeaderboardEntry[]>(`/leaderboard/${BOARD}`);
      usePlatformStore.getState().setLeaderboard(data);
      await this.persistCache();
      return data;
    } catch {
      return cached;
    }
  }

  async getRank(): Promise<number> {
    const cachedRank = usePlatformStore.getState().leaderboard.playerRank;
    if (cachedRank >= 0) return cachedRank;

    const userId = usePlatformStore.getState().user.id;
    if (!userId) return -1;

    try {
      const { rank } = await apiClient.get<{ rank: number }>(
        `/leaderboard/${BOARD}/rank/${userId}`
      );
      usePlatformStore.getState().setPlayerRank(rank);
      return rank;
    } catch {
      const entries = usePlatformStore.getState().leaderboard.allTime;
      const entry = entries.find((e) => e.playerId === userId);
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
          board: BOARD,
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
