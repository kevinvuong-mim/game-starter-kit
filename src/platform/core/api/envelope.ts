/**
 * Backend response envelope.
 *
 * Every endpoint on the Game Leaderboard API wraps its payload in this shape
 * (see `documents/game.md` §9). The shared {@link ApiClient} returns the raw
 * body, so repositories must unwrap `.data` to reach the real payload.
 */
import { ApiError } from './types';

export interface ApiEnvelope<T> {
  data: T;
  path: string;
  message: string;
  success: boolean;
  timestamp: string;
  statusCode: number;
}

export interface ApiErrorEnvelope {
  path: string;
  error: string;
  message: string;
  success: false;
  timestamp: string;
  statusCode: number;
  errors?: Array<{ field: string; message: string; constraint: string; value: unknown }>;
}

/** Unwrap a success envelope to its inner payload, throwing if success is false. */
export function unwrapSuccessEnvelope<T>(envelope: ApiEnvelope<T>): T {
  if (!envelope.success) {
    throw new ApiError(
      envelope.message ?? 'API request failed',
      envelope.statusCode ?? 500,
      envelope
    );
  }
  return envelope.data;
}
