/**
 * Guest identity model.
 *
 * A `guestId` is the player's persistent anonymous identity, shared across all
 * games on the device. A `sessionToken` authenticates the guest on protected
 * API endpoints via `Authorization: Bearer <token>`.
 *
 * `installId` + `installSecret` are persisted across reinstalls so the backend
 * can securely re-link the same guest after token loss.
 */

/** Capacitor Preferences key for the persisted guest id. */
export const GUEST_STORAGE_KEY = 'game_guest_id';

/** Capacitor Preferences key for the persisted session token. */
export const SESSION_TOKEN_STORAGE_KEY = 'game_session_token';

/** Capacitor Preferences key for the session token expiry (ISO string). */
export const SESSION_TOKEN_EXPIRES_AT_STORAGE_KEY = 'game_session_token_expires_at';

/** Capacitor Preferences key for the persisted install id (survives reinit). */
export const INSTALL_ID_STORAGE_KEY = 'game_install_id';

/** Capacitor Preferences key for the install secret (returned once at guest creation). */
export const INSTALL_SECRET_STORAGE_KEY = 'game_install_secret';

/** Shape of the `POST /guest/init` response payload (inside the envelope). */
export interface InitGuestPayload {
  guestId: string;
  sessionToken: string;
  sessionTokenExpiresAt: string;
  relinked: boolean;
  /** Present only when a new guest is created with `installId`. */
  installSecret?: string;
}

/** Shape of guest profile payloads (`GET /guest/me`, `PATCH /guest/name`). */
export interface GuestProfilePayload {
  guestId: string;
  name: string | null;
  sessionTokenExpiresAt: string;
}

/** Loose UUID v4 format check. */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidGuestId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidSessionToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && UUID_PATTERN.test(value);
}

export function isValidInstallId(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function isValidInstallSecret(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export function generateInstallId(): string {
  return crypto.randomUUID();
}

/** Parses an ISO date string into epoch ms, or null when invalid. */
export function parseExpiryToMs(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  const ms = new Date(value).getTime();
  return Number.isNaN(ms) ? null : ms;
}
