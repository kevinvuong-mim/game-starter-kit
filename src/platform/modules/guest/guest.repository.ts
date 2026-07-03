import {
  GUEST_STORAGE_KEY,
  type GuestCredentials,
  type InitGuestPayload,
  isValidGuestCredentials,
  type GuestProfilePayload,
} from './guest.model';
import { Capacitor } from '@capacitor/core';
import { apiClient } from '@platform/core/api';
import { storage } from '@platform/core/storage';
import { getConfig } from '@platform/core/config';
import type { ApiEnvelope } from '@platform/core/api';
import type { StorageProviderType } from '@platform/core/storage';

function guestStorageProvider(): StorageProviderType {
  return Capacitor.isNativePlatform() ? 'preferences' : 'localStorage';
}

/**
 * Owns guest credentials persistence and remote guest API calls.
 */
export class GuestRepository {
  async loadCredentials(): Promise<GuestCredentials | null> {
    const value = await storage.load<GuestCredentials>(GUEST_STORAGE_KEY, guestStorageProvider());
    return isValidGuestCredentials(value) ? value : null;
  }

  async saveCredentials(credentials: GuestCredentials): Promise<void> {
    await storage.save(GUEST_STORAGE_KEY, credentials, guestStorageProvider());
  }

  async clearCredentials(): Promise<void> {
    await storage.remove(GUEST_STORAGE_KEY, guestStorageProvider());
  }

  async initGuest(): Promise<InitGuestPayload> {
    const { gameId } = getConfig();
    const envelope = await apiClient.post<ApiEnvelope<InitGuestPayload>>(
      '/guest/init',
      { gameId },
      { auth: false, retries: 0 }
    );
    const payload = envelope.data;

    if (!payload?.guestId || !payload.secretToken) {
      throw new Error('[Guest] /guest/init returned invalid identity');
    }

    return payload;
  }

  async updateName(name: string): Promise<GuestProfilePayload> {
    const envelope = await apiClient.patch<ApiEnvelope<GuestProfilePayload>>('/guest/name', {
      name,
    });
    return envelope.data;
  }
}

export const guestRepository = new GuestRepository();
