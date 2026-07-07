/**
 * Leaderboard model — matches `GET /leaderboards` response shape from game-api.
 */
export type LeaderboardStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

export const LEADERBOARD_LIMIT = 10;
export const LEADERBOARD_CACHE_TTL_MS = 60_000;
export const LEADERBOARD_CACHE_PREFIX = 'leaderboard:cache:';

export interface LeaderboardEntry {
  rank: number;
  guestId: string;
  bestScore: number;
  name: string | null;
}

export interface LeaderboardSelf {
  rank: number;
  bestScore: number;
}

export interface LeaderboardData {
  page: number;
  limit: number;
  total: number;
  gameId: string;
  items: LeaderboardEntry[];
  self: LeaderboardSelf | null;
}

export interface LeaderboardCache {
  page: number;
  updatedAt: number;
  data: LeaderboardData;
}

export interface LeaderboardView {
  isEmpty: boolean;
  isStale: boolean;
  fromCache: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  myRank: number | null;
  myGuestId: string | null;
  status: LeaderboardStatus;
  myBestScore: number | null;
  lastUpdated: number | null;
  entries: LeaderboardEntry[];
}

export function createInitialPagination(page = 1) {
  return { page, limit: LEADERBOARD_LIMIT, total: 0, totalPages: 0 };
}

export function createInitialView(): LeaderboardView {
  return {
    entries: [],
    error: null,
    myRank: null,
    isEmpty: false,
    status: 'idle',
    myGuestId: null,
    fromCache: false,
    isStale: false,
    myBestScore: null,
    lastUpdated: null,
    pagination: createInitialPagination(),
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
