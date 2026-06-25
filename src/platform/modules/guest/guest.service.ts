import { logger } from '@platform/core/error';

import { guestRepository, type GuestRepository } from './guest.repository';

/**
 * Manages the anonymous guest identity (`documents/game.md` §2).
 *
 * - The id is loaded from storage on boot (offline-safe, no network).
 * - It is created lazily via `POST /guest/init` the first time it is needed
 *   and then reused for the lifetime of the install.
 * - `ensureGuestId()` returns `null` when offline with no stored id, so the
 *   leaderboard can still load the public top list (guestId is optional there).
 */
export class GuestService {
  private guestId: string | null = null;
  private initialized = false;
  private inflight: Promise<string | null> | null = null;

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  /** Load the persisted guest id into memory. Never hits the network. */
  async init(): Promise<void> {
    if (this.initialized) return;
    this.guestId = await this.repository.loadGuestId();
    this.initialized = true;
    logger.info('[Guest] Initialized', { hasGuestId: this.guestId !== null });
  }

  /** Synchronous accessor — returns the cached id or `null` if not yet created. */
  getGuestId(): string | null {
    return this.guestId;
  }

  /**
   * Returns the guest id, creating one via `/guest/init` if needed.
   * Returns `null` (does not throw) when creation fails, e.g. offline.
   */
  async ensureGuestId(): Promise<string | null> {
    if (this.guestId) return this.guestId;
    if (this.inflight) return this.inflight;

    this.inflight = this.createGuestId().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Discards the current identity and creates a new one. Used to recover from a
   * `404 Guest player not found` after a server-side data wipe.
   */
  async reinit(): Promise<string | null> {
    this.guestId = null;
    await this.repository.clear();
    return this.ensureGuestId();
  }

  private async createGuestId(): Promise<string | null> {
    try {
      const guestId = await this.repository.initGuest();
      await this.repository.saveGuestId(guestId);
      this.guestId = guestId;
      logger.info('[Guest] Created new guest identity');
      return guestId;
    } catch (error) {
      logger.warn('[Guest] Failed to create guest identity (offline?)', error);
      return null;
    }
  }
}

export const guest = new GuestService();
