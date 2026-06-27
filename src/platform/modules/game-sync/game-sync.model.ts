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
}

/** A finished match awaiting (or completed) sync. */
export interface PendingGameResult {
  score: number;
  gameId: string;
  guestId: string;
  localId: string;
  synced: boolean;
  createdAt: string;
  replayHash: string;
  syncAttempts: number;
  metadata?: Record<string, unknown>;
}

/** Payload sent for each result in a sync batch (whitelisted fields only). */
export interface GameResultPayload {
  score: number;
  replayHash: string;
  metadata?: Record<string, string | number | boolean | null>;
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
  moves?: ReplayMove[];
}): ReplayPayload {
  return {
    seed: params.seed,
    moves: params.moves ?? [{ t: 0, action: 'final', score: params.score }],
  };
}

/** Normalizes a raw value into a non-negative integer (per backend constraints). */
export function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

const METADATA_MAX_KEYS = 10;
const METADATA_MAX_BYTES = 2048;
const METADATA_MAX_KEY_LENGTH = 64;
const METADATA_MAX_STRING_LENGTH = 256;

/**
 * Sanitizes metadata to match backend `@IsValidMetadata` rules before upload.
 * Drops nested values, arrays, and oversized fields.
 */
export function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, string | number | boolean | null> | undefined {
  if (!metadata) return undefined;

  const result: Record<string, string | number | boolean | null> = {};
  const keys = Object.keys(metadata).slice(0, METADATA_MAX_KEYS);

  for (const key of keys) {
    if (key.length === 0 || key.length > METADATA_MAX_KEY_LENGTH) continue;

    const value = metadata[key];
    if (value === null) {
      result[key] = null;
      continue;
    }
    if (typeof value === 'boolean') {
      result[key] = value;
      continue;
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      result[key] = value;
      continue;
    }
    if (typeof value === 'string' && value.length <= METADATA_MAX_STRING_LENGTH) {
      result[key] = value;
    }
  }

  if (Object.keys(result).length === 0) return undefined;
  if (JSON.stringify(result).length > METADATA_MAX_BYTES) return undefined;
  return result;
}
