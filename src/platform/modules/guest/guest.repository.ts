import { Preferences } from '@capacitor/preferences';

import { apiClient } from '@platform/core/api';
import type { ApiEnvelope } from '@platform/core/api';

import { GUEST_STORAGE_KEY, isValidGuestId, type InitGuestPayload } from './guest.model';

/**
 * Owns guest-id persistence (Capacitor Preferences) and the remote
 * `POST /guest/init` call. No orchestration logic lives here.
 */
export class GuestRepository {
  async loadGuestId(): Promise<string | null> {
    const { value } = await Preferences.get({ key: GUEST_STORAGE_KEY });
    return isValidGuestId(value) ? value : null;
  }

  async saveGuestId(guestId: string): Promise<void> {
    await Preferences.set({ key: GUEST_STORAGE_KEY, value: guestId });
  }

  async clear(): Promise<void> {
    await Preferences.remove({ key: GUEST_STORAGE_KEY });
  }

  /** Calls `POST /guest/init` and returns the freshly created guest id. */
  async initGuest(): Promise<string> {
    const envelope = await apiClient.post<ApiEnvelope<InitGuestPayload>>('/guest/init');
    const guestId = envelope.data?.guestId;

    if (!isValidGuestId(guestId)) {
      throw new Error('[Guest] /guest/init returned an invalid guestId');
    }

    return guestId;
  }
}

export const guestRepository = new GuestRepository();
