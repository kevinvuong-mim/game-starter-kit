/**
 * Offline game-result sync model.
 *
 * Results are queued locally and batch-uploaded to `POST /games/:gameId/results`
 * with an HMAC `signature` per item.
 */

export const PENDING_RESULTS_KEY = 'game-sync:pending';

export const MAX_BATCH_SIZE = 50;
export const MAX_SYNC_ATTEMPTS = 10;
export const MAX_PENDING_RESULTS = 500;

export interface PendingGameResult {
  score: number;
  gameId: string;
  guestId: string;
  localId: string;
  clientResultId: string;
  synced: boolean;
  playedAt: string;
  createdAt: string;
  signature: string;
  syncAttempts: number;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  lastErrorCode?: string;
  metadata?: Record<string, unknown>;
}

export interface GameResultPayload {
  clientResultId: string;
  score: number;
  playedAt?: string;
  signature: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface SyncResponse {
  success: boolean;
  insertedCount: number;
  message: string;
}

export function buildReplayPayload(params: {
  gameId: string;
  guestId: string;
  clientResultId: string;
  score: number;
  playedAt?: string;
}): string {
  return `${params.gameId}|${params.guestId}|${params.clientResultId}|${params.score}|${params.playedAt ?? ''}`;
}

/**
 * HMAC-SHA256(replaySecret, payload) as lowercase hex.
 * Payload must match game-api exactly.
 */
export async function computeReplaySignature(params: {
  gameId: string;
  guestId: string;
  clientResultId: string;
  score: number;
  playedAt?: string;
  replaySecret: string;
}): Promise<string> {
  const payload = buildReplayPayload(params);
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

export function toNonNegativeInt(value: number): number {
  if (!Number.isFinite(value) || value < 0) return 0;
  return Math.floor(value);
}

const METADATA_MAX_KEYS = 10;
const METADATA_MAX_BYTES = 2048;
const METADATA_MAX_KEY_LENGTH = 64;
const METADATA_MAX_STRING_LENGTH = 256;

export function sanitizeMetadata(
  metadata?: Record<string, unknown>
): Record<string, string | number | boolean | null> | undefined {
  const result: Record<string, string | number | boolean | null> = {};
  const keys = Object.keys(metadata ?? {}).slice(0, METADATA_MAX_KEYS);

  for (const key of keys) {
    if (key.length === 0 || key.length > METADATA_MAX_KEY_LENGTH) continue;

    const value = metadata?.[key];
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
