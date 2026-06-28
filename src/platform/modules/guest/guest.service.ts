import { logger } from '@platform/core/error';
import { guestRepository, type GuestRepository } from './guest.repository';

/**
 * Manages the anonymous guest identity.
 *
 * - Credentials are loaded from storage on boot (offline-safe, no network).
 * - Created lazily via `POST /guest/init` the first time they are needed.
 * - `installId` survives reinit so the backend returns the same guest for this install.
 */
export class GuestService {
  private initialized = false;
  private guestId: string | null = null;
  private inflight: Promise<string | null> | null = null;

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  /** Load persisted credentials into memory. Never hits the network. */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.guestId = await this.repository.loadGuestId();
    this.initialized = true;

    logger.info('[Guest] Initialized', {
      hasGuestId: this.guestId !== null,
      hasInstallId: (await this.repository.loadInstallId()) !== null,
    });
  }

  getGuestId(): string | null {
    return this.guestId;
  }

  /**
   * Returns the guest id, creating the install identity via `/guest/init` if needed.
   * Returns `null` (does not throw) when creation fails, e.g. offline.
   */
  async ensureGuestId(): Promise<string | null> {
    if (this.guestId) {
      return this.guestId;
    }

    if (this.inflight) return this.inflight;

    this.inflight = this.createGuest().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Discards the cached guest id and re-initializes via installId.
   */
  async reinit(): Promise<string | null> {
    this.guestId = null;
    await this.repository.clearCredentials();
    return this.ensureGuestId();
  }

  async updateName(name: string): Promise<void> {
    const guestId = await this.ensureGuestId();
    if (!guestId) return;

    await this.repository.updateName(guestId, name);
  }

  private async createGuest(): Promise<string | null> {
    try {
      return await this.createGuestWithRecovery();
    } catch (error) {
      logger.warn('[Guest] Failed to create guest identity (offline?)', error);
      return null;
    }
  }

  private async createGuestWithRecovery(): Promise<string | null> {
    const installId = await this.repository.ensureInstallId();

    return await this.persistCredentials(await this.repository.initGuest(installId));
  }

  private async persistCredentials(
    credentials: Awaited<ReturnType<GuestRepository['initGuest']>>
  ): Promise<string> {
    await this.repository.saveGuestId(credentials.guestId);

    this.guestId = credentials.guestId;

    logger.info('[Guest] Guest identity ready', { relinked: credentials.relinked });
    return credentials.guestId;
  }
}

export const guest = new GuestService();
