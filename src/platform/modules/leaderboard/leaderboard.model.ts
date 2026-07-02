/**
 * Leaderboard model — matches `GET /leaderboards` response shape from game-api.
 */

export type LeaderboardStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

export const LEADERBOARD_CACHE_TTL_MS = 60_000;
export const LEADERBOARD_LIMIT = 20;
export const LEADERBOARD_CACHE_PREFIX = 'leaderboard:cache:';

export interface LeaderboardEntry {
  guestId: string;
  name: string | null;
  bestScore: number;
  rank: number;
}

export interface LeaderboardSelf {
  rank: number;
  bestScore: number;
}

export interface LeaderboardData {
  gameId: string;
  total: number;
  page: number;
  limit: number;
  items: LeaderboardEntry[];
  self: LeaderboardSelf | null;
}

export interface LeaderboardCache {
  page: number;
  data: LeaderboardData;
  updatedAt: number;
}

export interface LeaderboardView {
  status: LeaderboardStatus;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myBestScore: number | null;
  myGuestId: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  isEmpty: boolean;
  fromCache: boolean;
  lastUpdated: number | null;
  error: string | null;
}

export function createInitialPagination(page = 1) {
  return { page, limit: LEADERBOARD_LIMIT, total: 0, totalPages: 0 };
}

export function createInitialView(): LeaderboardView {
  return {
    status: 'idle',
    entries: [],
    myRank: null,
    myBestScore: null,
    myGuestId: null,
    pagination: createInitialPagination(),
    isEmpty: false,
    fromCache: false,
    lastUpdated: null,
    error: null,
  };
}

export function maskGuestId(guestId: string): string {
  if (!guestId) return '----';
  const tail = guestId.replace(/-/g, '').slice(-4);
  return `...${tail}`;
}

export function getLeaderboardDisplayName(
  entry: Pick<LeaderboardEntry, 'name'>,
  anonymousLabel: string
): string {
  const trimmed = entry.name?.trim();
  return trimmed || anonymousLabel;
}

export function isCacheFresh(cache: LeaderboardCache, now = Date.now()): boolean {
  return now - cache.updatedAt < LEADERBOARD_CACHE_TTL_MS;
}
