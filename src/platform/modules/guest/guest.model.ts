/**
 * Guest identity model.
 *
 * A `guestId` is the player's persistent anonymous identity, shared across all
 * games on the device. A `sessionToken` authenticates the guest on protected
 * API endpoints via `Authorization: Bearer <token>`.
 */

/** Capacitor Preferences key for the persisted guest id. */
export const GUEST_STORAGE_KEY = 'game_guest_id';

/** Capacitor Preferences key for the persisted session token. */
export const SESSION_TOKEN_STORAGE_KEY = 'game_session_token';

/** Shape of the `POST /guest/init` response payload (inside the envelope). */
export interface InitGuestPayload {
  guestId: string;
  sessionToken: string;
}

/** Shape of the `PATCH /guest/name` response payload (inside the envelope). */
export interface GuestProfilePayload {
  guestId: string;
  name: string | null;
}

/** Loose UUID v4 format check. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && UUID_PATTERN.test(value);
}
