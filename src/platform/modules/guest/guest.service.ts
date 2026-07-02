import { apiClient } from '@platform/core/api';
import { logger } from '@platform/core/error';
import { getConfig } from '@platform/core/config';
import { guestRepository, type GuestRepository } from './guest.repository';

/**
 * Manages the anonymous guest identity.
 *
 * `init()` loads stored credentials or creates a new guest once per install.
 */
export class GuestService {
  private initialized = false;
  private guestId: string | null = null;

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  async init(): Promise<void> {
    if (this.initialized) return;

    const stored = await this.repository.loadCredentials();
    if (stored) {
      apiClient.setAuthToken(stored.secretToken);
      this.guestId = stored.guestId;
      this.initialized = true;
      logger.info('[Guest] Loaded credentials from storage');
      return;
    }

    try {
      const { gameId } = getConfig();
      const payload = await this.repository.initGuest();

      if (payload.gameId !== gameId) {
        logger.warn('[Guest] Backend gameId mismatch', {
          expected: gameId,
          received: payload.gameId,
        });
      }

      await this.repository.saveCredentials({
        guestId: payload.guestId,
        secretToken: payload.secretToken,
      });
      apiClient.setAuthToken(payload.secretToken);
      this.guestId = payload.guestId;
      this.initialized = true;
      logger.info('[Guest] Created new guest identity');
    } catch (error) {
      this.initialized = true;
      logger.warn('[Guest] Failed to create guest identity (offline?)', error);
    }
  }

  getGuestId(): string | null {
    return this.guestId;
  }

  async updateName(name: string): Promise<void> {
    if (!this.guestId) return;
    await this.repository.updateName(name);
  }
}

export const guest = new GuestService();
