/**
 * Guest identity model.
 *
 * A `guestId` is the player's persistent anonymous identity, shared across all
 * games on the device (see `documents/game.md` §2). It is created once via
 * `POST /guest/init` and reused for every leaderboard / sync request.
 */

/** Capacitor Preferences key for the persisted guest id (per game.md). */
export const GUEST_STORAGE_KEY = 'game_guest_id';

/** Shape of the `POST /guest/init` response payload (inside the envelope). */
export interface InitGuestPayload {
  guestId: string;
}

/** Loose UUID v4 format check — the backend validates `guestId` as `@IsUUID()`. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}
