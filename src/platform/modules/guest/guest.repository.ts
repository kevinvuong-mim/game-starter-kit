import {
  isValidGuestId,
  GUEST_STORAGE_KEY,
  isValidInstallId,
  generateInstallId,
  type InitGuestPayload,
  type GuestProfilePayload,
  INSTALL_ID_STORAGE_KEY,
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

  async loadInstallId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: INSTALL_ID_STORAGE_KEY });
    return isValidInstallId(value) ? value : null;
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

  /** Clears guest identity only — keeps installId so the same app install can relink. */
  async clearCredentials(): Promise<void> {
    await Preferences.remove({ key: GUEST_STORAGE_KEY });
  }

  /** Clears the install identity. The next init will create a new guest. */
  async clearInstallRecovery(): Promise<void> {
    await Preferences.remove({ key: INSTALL_ID_STORAGE_KEY });
  }

  async clear(): Promise<void> {
    await this.clearCredentials();
    await this.clearInstallRecovery();
  }

  /** Calls `POST /guest/init` and returns the install's guest identity. */
  async initGuest(installId?: string): Promise<InitGuestPayload> {
    const body: { installId?: string } = {};
    if (installId) body.installId = installId;

    const envelope = await apiClient.post<ApiEnvelope<InitGuestPayload>>('/guest/init', body, {
      auth: false,
    });
    const payload = envelope.data;

    if (!payload || !isValidGuestId(payload.guestId)) {
      throw new Error('[Guest] /guest/init returned invalid identity');
    }

    return payload;
  }

  /** Calls `GET /guest/me` — guest is identified by public guestId. */
  async getProfile(guestId: string): Promise<GuestProfilePayload> {
    const query = new URLSearchParams({ guestId });
    const envelope = await apiClient.get<ApiEnvelope<GuestProfilePayload>>(
      `/guest/me?${query.toString()}`,
      { auth: false }
    );
    return envelope.data;
  }

  /** Calls `PATCH /guest/name` — guest is identified by public guestId. */
  async updateName(guestId: string, name: string): Promise<GuestProfilePayload> {
    const envelope = await apiClient.patch<ApiEnvelope<GuestProfilePayload>>(
      '/guest/name',
      {
        guestId,
        name,
      },
      { auth: false }
    );
    return envelope.data;
  }
}

export const guestRepository = new GuestRepository();
