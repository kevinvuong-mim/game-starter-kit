import {
  isValidGuestId,
  parseExpiryToMs,
  GUEST_STORAGE_KEY,
  isValidInstallId,
  isValidSessionToken,
  isValidInstallSecret,
  generateInstallId,
  type InitGuestPayload,
  type GuestProfilePayload,
  INSTALL_ID_STORAGE_KEY,
  SESSION_TOKEN_STORAGE_KEY,
  INSTALL_SECRET_STORAGE_KEY,
  SESSION_TOKEN_EXPIRES_AT_STORAGE_KEY,
} from './guest.model';
import { apiClient } from '@platform/core/api';
import { Preferences } from '@capacitor/preferences';
import type { ApiEnvelope } from '@platform/core/api';

/**
 * Owns guest credentials persistence (Capacitor Preferences) and remote
 * guest API calls. No orchestration logic lives here.
 */
export class GuestRepository {
  async loadGuestId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: GUEST_STORAGE_KEY });
    return isValidGuestId(value) ? value : null;
  }

  async loadSessionToken(): Promise<string | null> {
    const { value } = await Preferences.get({ key: SESSION_TOKEN_STORAGE_KEY });
    return isValidSessionToken(value) ? value : null;
  }

  /** Returns the persisted session token expiry as epoch ms, or null when absent/invalid. */
  async loadSessionTokenExpiresAt(): Promise<number | null> {
    const { value } = await Preferences.get({ key: SESSION_TOKEN_EXPIRES_AT_STORAGE_KEY });
    return parseExpiryToMs(value);
  }

  async loadInstallId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: INSTALL_ID_STORAGE_KEY });
    return isValidInstallId(value) ? value : null;
  }

  async loadInstallSecret(): Promise<string | null> {
    const { value } = await Preferences.get({ key: INSTALL_SECRET_STORAGE_KEY });
    return isValidInstallSecret(value) ? value : null;
  }

  async ensureInstallId(): Promise<string> {
    const existing = await this.loadInstallId();
    if (existing) return existing;

    const installId = generateInstallId();
    await Preferences.set({ key: INSTALL_ID_STORAGE_KEY, value: installId });
    return installId;
  }

  async saveGuestId(guestId: string): Promise<void> {
    await Preferences.set({ key: GUEST_STORAGE_KEY, value: guestId });
  }

  async saveSessionToken(sessionToken: string): Promise<void> {
    await Preferences.set({ key: SESSION_TOKEN_STORAGE_KEY, value: sessionToken });
  }

  async saveSessionTokenExpiresAt(expiresAt: string): Promise<void> {
    await Preferences.set({ key: SESSION_TOKEN_EXPIRES_AT_STORAGE_KEY, value: expiresAt });
  }

  async saveInstallSecret(installSecret: string): Promise<void> {
    await Preferences.set({ key: INSTALL_SECRET_STORAGE_KEY, value: installSecret });
  }

  /** Clears session credentials only — keeps installId/installSecret for guest re-link. */
  async clearCredentials(): Promise<void> {
    await Preferences.remove({ key: GUEST_STORAGE_KEY });
    await Preferences.remove({ key: SESSION_TOKEN_STORAGE_KEY });
    await Preferences.remove({ key: SESSION_TOKEN_EXPIRES_AT_STORAGE_KEY });
  }

  /** Clears install recovery pair (e.g. legacy migration). */
  async clearInstallRecovery(): Promise<void> {
    await Preferences.remove({ key: INSTALL_ID_STORAGE_KEY });
    await Preferences.remove({ key: INSTALL_SECRET_STORAGE_KEY });
  }

  async clear(): Promise<void> {
    await this.clearCredentials();
    await this.clearInstallRecovery();
  }

  /** Calls `POST /guest/init` and returns guest credentials. */
  async initGuest(installId?: string, installSecret?: string): Promise<InitGuestPayload> {
    const body: { installId?: string; installSecret?: string } = {};
    if (installId) body.installId = installId;
    if (installSecret) body.installSecret = installSecret;

    const envelope = await apiClient.post<ApiEnvelope<InitGuestPayload>>('/guest/init', body, {
      auth: false,
    });
    const payload = envelope.data;

    if (
      !payload ||
      !isValidGuestId(payload.guestId) ||
      !isValidSessionToken(payload.sessionToken)
    ) {
      throw new Error('[Guest] /guest/init returned invalid credentials');
    }

    return payload;
  }

  /** Calls `GET /guest/me` — guest is identified by the Bearer token. */
  async getProfile(): Promise<GuestProfilePayload> {
    const envelope = await apiClient.get<ApiEnvelope<GuestProfilePayload>>('/guest/me');
    return envelope.data;
  }

  /** Calls `PATCH /guest/name` — guest is identified by the Bearer token. */
  async updateName(name: string): Promise<GuestProfilePayload> {
    const envelope = await apiClient.patch<ApiEnvelope<GuestProfilePayload>>('/guest/name', {
      name,
    });
    return envelope.data;
  }
}

export const guestRepository = new GuestRepository();
