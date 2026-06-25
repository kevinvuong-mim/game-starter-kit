import { Preferences } from '@capacitor/preferences';

import { apiClient } from '@platform/core/api';
import type { ApiEnvelope } from '@platform/core/api';

import {
  GUEST_STORAGE_KEY,
  SESSION_TOKEN_STORAGE_KEY,
  isValidGuestId,
  isValidSessionToken,
  type GuestProfilePayload,
  type InitGuestPayload,
} from './guest.model';

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

  async saveGuestId(guestId: string): Promise<void> {
    await Preferences.set({ key: GUEST_STORAGE_KEY, value: guestId });
  }

  async saveSessionToken(sessionToken: string): Promise<void> {
    await Preferences.set({ key: SESSION_TOKEN_STORAGE_KEY, value: sessionToken });
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: GUEST_STORAGE_KEY });
    await Preferences.remove({ key: SESSION_TOKEN_STORAGE_KEY });
  }

  /** Calls `POST /guest/init` and returns guest credentials. */
  async initGuest(): Promise<InitGuestPayload> {
    const envelope = await apiClient.post<ApiEnvelope<InitGuestPayload>>('/guest/init', undefined, {
      auth: false,
    });
    const { guestId, sessionToken } = envelope.data ?? {};

    if (!isValidGuestId(guestId) || !isValidSessionToken(sessionToken)) {
      throw new Error('[Guest] /guest/init returned invalid credentials');
    }

    return { guestId, sessionToken };
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
