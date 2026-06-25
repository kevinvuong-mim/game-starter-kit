/**
 * Offline game-result sync model (`documents/game.md` §4, §5, §6).
 *
 * Match results are saved to a local queue at game-over and batch-uploaded to
 * `POST /game/sync` when the network is available. Each result carries a
 * `replayHash` (SHA-256 of the replay payload) that makes sync idempotent.
 */

/** Capacitor Preferences key for the unsynced results queue (per game.md). */
export const PENDING_RESULTS_KEY = 'game_pending_results';

/** Server accepts 1–50 results per request. */
export const MAX_BATCH_SIZE = 50;

/** Stop retrying a permanently failing item after this many attempts. */
export const MAX_SYNC_ATTEMPTS = 10;

export interface ReplayMove {
  t: number;
  action: string;
  [key: string]: unknown;
}

/** Deterministic replay payload — the same match must always hash identically. */
export interface ReplayPayload {
  seed: number;
  moves: ReplayMove[];
  duration: number;
}

/** A finished match awaiting (or completed) sync. */
export interface PendingGameResult {
  localId: string;
  gameId: string;
  guestId: string;
  score: number;
  duration: number;
  replayHash: string;
  metadata?: Record<string, unknown>;
  synced: boolean;
  syncAttempts: number;
  createdAt: string;
}

/** Payload sent for each result in a sync batch (whitelisted fields only). */
export interface GameResultPayload {
  score: number;
  duration: number;
  replayHash: string;
  metadata?: Record<string, unknown>;
}

/** `POST /game/sync` response payload (inside the envelope). */
export interface SyncResponse {
  accepted: number;
  rejected: number;
  bestScore: number;
}

/**
 * Computes a 64-char lowercase hex SHA-256 of the replay payload using the
 * WebCrypto API (works in the Capacitor WebView). Keep JSON key order stable.
 */
export async function computeReplayHash(replay: ReplayPayload): Promise<string> {
  const encoded = new TextEncoder().encode(JSON.stringify(replay));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Builds a minimal deterministic replay payload from a match summary.
 *
 * The starter gameplay does not record per-input replay data; this captures
 * enough to produce a unique, valid `replayHash`. Replace `seed`/`moves` with
 * real recorded replay data when implementing a game with deterministic RNG.
 */
export function buildReplayPayload(params: {
  seed: number;
  score: number;
  duration: number;
  moves?: ReplayMove[];
}): ReplayPayload {
  return {
    seed: params.seed,
    duration: params.duration,
    moves: params.moves ?? [{ t: params.duration, action: 'final', score: params.score }],
  };
}

/** Normalizes a raw value into a non-negative integer (per backend constraints). */
export function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}
