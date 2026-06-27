/**
 * Leaderboard model (`documents/game.md` §7).
 *
 * The backend exposes an all-time leaderboard per `gameId` via `GET /leaderboards`.
 */

export type LeaderboardStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

/** Cache freshness window — served from cache without a network call. */
export const LEADERBOARD_CACHE_TTL_MS = 60_000;

/** Max entries the backend returns (`limit` is capped at 100). */
export const LEADERBOARD_LIMIT = 100;

/** Storage key prefix for the per-page offline cache. */
export const LEADERBOARD_CACHE_PREFIX = 'leaderboard:cache:';

/** A single ranked entry as returned by the backend. */
export interface LeaderboardEntry {
  guestId: string;
  name: string | null;
  score: number;
  rank: number;
}

/** Raw `data` payload of a leaderboard response. */
export interface LeaderboardData {
  top: LeaderboardEntry[];
  myRank: number | null;
  pagination: LeaderboardPagination;
}

export interface LeaderboardPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Persisted cache entry for one page. */
export interface LeaderboardCache {
  page: number;
  data: LeaderboardData;
  updatedAt: number;
}

/** Immutable view-model handed to the UI layer. */
export interface LeaderboardView {
  status: LeaderboardStatus;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myGuestId: string | null;
  pagination: LeaderboardPagination;
  isEmpty: boolean;
  fromCache: boolean;
  lastUpdated: number | null;
  error: string | null;
}

export function createInitialPagination(page = 1): LeaderboardPagination {
  return { page, limit: LEADERBOARD_LIMIT, total: 0, totalPages: 0 };
}

export function createInitialView(): LeaderboardView {
  return {
    status: 'idle',
    entries: [],
    myRank: null,
    myGuestId: null,
    pagination: createInitialPagination(),
    isEmpty: false,
    fromCache: false,
    lastUpdated: null,
    error: null,
  };
}

/** Masks a guest id for display, e.g. `...440000` (privacy — never show full id). */
export function maskGuestId(guestId: string): string {
  if (!guestId) return '----';
  const tail = guestId.replace(/-/g, '').slice(-4);
  return `...${tail}`;
}

/** Player label for leaderboard rows — prefers display name, falls back to anonymous label. */
export function getLeaderboardDisplayName(
  entry: Pick<LeaderboardEntry, 'name'>,
  anonymousLabel: string
): string {
  const trimmed = entry.name?.trim();
  return trimmed || anonymousLabel;
}

/** Whether the cache entry is still within the freshness window. */
export function isCacheFresh(cache: LeaderboardCache, now = Date.now()): boolean {
  return now - cache.updatedAt < LEADERBOARD_CACHE_TTL_MS;
}
