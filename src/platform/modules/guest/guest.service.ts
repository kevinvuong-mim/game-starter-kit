import { logger } from '@platform/core/error';
import { apiClient } from '@platform/core/api';
import { guestRepository, type GuestRepository } from './guest.repository';

/**
 * Manages the anonymous guest identity and session authentication.
 *
 * - Credentials are loaded from storage on boot (offline-safe, no network).
 * - Created lazily via `POST /guest/init` the first time they are needed.
 * - `sessionToken` is applied to `apiClient` for protected endpoints.
 */
export class GuestService {
  private initialized = false;
  private guestId: string | null = null;
  private sessionToken: string | null = null;
  private inflight: Promise<string | null> | null = null;

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  /** Load persisted credentials into memory. Never hits the network. */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.guestId = await this.repository.loadGuestId();
    this.sessionToken = await this.repository.loadSessionToken();

    // Legacy installs may have guestId without sessionToken — force re-create on next use.
    if (this.guestId && !this.sessionToken) {
      logger.warn('[Guest] Legacy guestId without sessionToken — clearing credentials');
      this.guestId = null;
      await this.repository.clear();
    }

    this.applySessionToken();
    this.initialized = true;

    logger.info('[Guest] Initialized', {
      hasGuestId: this.guestId !== null,
      hasSessionToken: this.sessionToken !== null,
    });
  }

  getGuestId(): string | null {
    return this.guestId;
  }

  getSessionToken(): string | null {
    return this.sessionToken;
  }

  /**
   * Returns the guest id, creating credentials via `/guest/init` if needed.
   * Returns `null` (does not throw) when creation fails, e.g. offline.
   */
  async ensureGuestId(): Promise<string | null> {
    if (this.guestId && this.sessionToken) {
      this.applySessionToken();
      return this.guestId;
    }

    if (this.inflight) return this.inflight;

    this.inflight = this.createGuest().finally(() => {
      this.inflight = null;
    });

    return this.inflight;
  }

  /**
   * Discards current credentials and creates a new guest. Used to recover from
   * `401 Invalid session token` or `404 Guest player not found`.
   */
  async reinit(): Promise<string | null> {
    this.guestId = null;
    this.sessionToken = null;
    apiClient.setAuthToken(null);
    await this.repository.clear();
    return this.ensureGuestId();
  }

  async updateName(name: string): Promise<void> {
    await this.ensureGuestId();
    await this.repository.updateName(name);
  }

  private async createGuest(): Promise<string | null> {
    try {
      const credentials = await this.repository.initGuest();
      await this.repository.saveGuestId(credentials.guestId);
      await this.repository.saveSessionToken(credentials.sessionToken);

      this.guestId = credentials.guestId;
      this.sessionToken = credentials.sessionToken;
      this.applySessionToken();

      logger.info('[Guest] Created new guest identity');
      return this.guestId;
    } catch (error) {
      logger.warn('[Guest] Failed to create guest identity (offline?)', error);
      return null;
    }
  }

  private applySessionToken(): void {
    apiClient.setAuthToken(this.sessionToken);
  }
}

export const guest = new GuestService();
