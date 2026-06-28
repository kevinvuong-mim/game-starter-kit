/**
 * Guest identity model.
 *
 * A `guestId` is the player's persistent anonymous identity, shared across all
 * games on the device. `installId` is generated once per app install and lets
 * the backend return the same guest for the same installation.
 */

/** Capacitor Preferences key for the persisted guest id. */
export const GUEST_STORAGE_KEY = 'game_guest_id';

/** Capacitor Preferences key for the persisted install id (survives reinit). */
export const INSTALL_ID_STORAGE_KEY = 'game_install_id';

/** Shape of the `POST /guest/init` response payload (inside the envelope). */
export interface InitGuestPayload {
  guestId: string;
  relinked: boolean;
}

/** Shape of guest profile payloads (`GET /guest/me`, `PATCH /guest/name`). */
export interface GuestProfilePayload {
  guestId: string;
  name: string | null;
}

/** Loose UUID v4 format check. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function generateInstallId(): string {
  return crypto.randomUUID();
}
