/**
 * Leaderboard model (`documents/game.md` §7).
 *
 * The backend exposes two read-only boards per `gameId` — `global` (all-time)
 * and `weekly` (current season) — that share an identical response shape.
 */

export type LeaderboardBoard = 'global' | 'weekly';

export type LeaderboardStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'error';

/** Cache freshness window — served from cache without a network call. */
export const LEADERBOARD_CACHE_TTL_MS = 60_000;

/** Max entries the backend returns (`limit` is capped at 100). */
export const LEADERBOARD_LIMIT = 100;

/** Storage key prefix for the per-board offline cache. */
export const LEADERBOARD_CACHE_PREFIX = 'leaderboard:cache:';

/** A single ranked entry as returned by the backend. */
export interface LeaderboardEntry {
  guestId: string;
  score: number;
  rank: number;
}

/** Raw `data` payload of a leaderboard response. */
export interface LeaderboardData {
  top: LeaderboardEntry[];
  myRank: number | null;
}

/** Persisted cache entry for one board. */
export interface LeaderboardCache {
  board: LeaderboardBoard;
  data: LeaderboardData;
  updatedAt: number;
}

/** Immutable view-model handed to the UI layer. */
export interface LeaderboardView {
  board: LeaderboardBoard;
  status: LeaderboardStatus;
  entries: LeaderboardEntry[];
  myRank: number | null;
  myGuestId: string | null;
  isEmpty: boolean;
  fromCache: boolean;
  lastUpdated: number | null;
  error: string | null;
}

export function createInitialView(board: LeaderboardBoard): LeaderboardView {
  return {
    board,
    status: 'idle',
    entries: [],
    myRank: null,
    myGuestId: null,
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

/** Whether the cache entry is still within the freshness window. */
export function isCacheFresh(cache: LeaderboardCache, now = Date.now()): boolean {
  return now - cache.updatedAt < LEADERBOARD_CACHE_TTL_MS;
}
