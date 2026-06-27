/**
 * Offline game-result sync model.
 *
 * Match results are saved to a local queue at game-over and batch-uploaded to
 * `POST /games/:gameId/results` when the network is available. Each result carries
 * an HMAC `replayHash` (see api-starter-kit replay-hash-hmac.md) for idempotency
 * and casual anti-cheat.
 */

/** Capacitor Preferences key for the unsynced results queue. */
export const PENDING_RESULTS_KEY = 'game_pending_results';

/** Server accepts 1–50 results per request. */
export const MAX_BATCH_SIZE = 50;

/** Stop retrying a permanently failing item after this many attempts. */
export const MAX_SYNC_ATTEMPTS = 10;

/** Metadata key required by the backend when `replaySecret` is configured. */
export const RUN_SEED_METADATA_KEY = 'runSeed';

export type SyncResultStatus = 'accepted' | 'rejected';

export type SyncRejectionReason =
  | 'DUPLICATE_REPLAY'
  | 'MISSING_REPLAY_HASH'
  | 'INVALID_REPLAY_HASH_FORMAT'
  | 'INVALID_REPLAY_SIGNATURE'
  | 'MISSING_RUN_SEED'
  | 'SCORE_EXCEEDS_MAX'
  | 'SCORE_MISMATCH'
  | 'INVALID_PLAYED_AT'
  | 'PLAYED_AT_IN_FUTURE'
  | 'PLAYED_AT_TOO_OLD';

/** A finished match awaiting (or completed) sync. */
export interface PendingGameResult {
  score: number;
  gameId: string;
  guestId: string;
  localId: string;
  runSeed: string;
  synced: boolean;
  playedAt: string;
  createdAt: string;
  replayHash: string;
  syncAttempts: number;
  metadata?: Record<string, unknown>;
}

/** Payload sent for each result in a sync batch (whitelisted fields only). */
export interface GameResultPayload {
  score: number;
  replayHash: string;
  playedAt?: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SyncResultItem {
  replayHash: string;
  status: SyncResultStatus;
  reason?: SyncRejectionReason;
}

/** `POST /games/:gameId/results` response payload (inside the envelope). */
export interface SyncResponse {
  results: SyncResultItem[];
  accepted: number;
  rejected: number;
  bestScore: number;
}

/** Rejection reasons that should not be retried from the offline queue. */
export const PERMANENT_SYNC_REJECTIONS = new Set<SyncRejectionReason>([
  'DUPLICATE_REPLAY',
  'INVALID_REPLAY_HASH_FORMAT',
  'INVALID_REPLAY_SIGNATURE',
  'MISSING_RUN_SEED',
  'SCORE_EXCEEDS_MAX',
  'SCORE_MISMATCH',
  'INVALID_PLAYED_AT',
  'PLAYED_AT_IN_FUTURE',
  'PLAYED_AT_TOO_OLD',
]);

export function generateRunSeed(): string {
  return crypto.randomUUID();
}

/**
 * HMAC-SHA256(replaySecret, "{gameId}|{score}|{runSeed}") as lowercase hex.
 * Must match api-starter-kit `computeReplayHash`.
 */
export async function computeReplayHash(params: {
  gameId: string;
  score: number;
  runSeed: string;
  replaySecret: string;
}): Promise<string> {
  const payload = `${params.gameId}|${params.score}|${params.runSeed}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(params.replaySecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
  metadata?: Record<string, unknown>,
  runSeed?: string
): Record<string, string | number | boolean | null> | undefined {
  const merged: Record<string, unknown> = { ...(metadata ?? {}) };
  if (runSeed) {
    merged[RUN_SEED_METADATA_KEY] = runSeed;
  }

  const result: Record<string, string | number | boolean | null> = {};
  const keys = Object.keys(merged).slice(0, METADATA_MAX_KEYS);

  for (const key of keys) {
    if (key.length === 0 || key.length > METADATA_MAX_KEY_LENGTH) continue;

    const value = merged[key];
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
