import { logger } from '@platform/core/error';
import { ApiError } from '@platform/core/api';
import { apiClient } from '@platform/core/api';
import { guestRepository, type GuestRepository } from './guest.repository';

/**
 * Manages the anonymous guest identity and session authentication.
 *
 * - Credentials are loaded from storage on boot (offline-safe, no network).
 * - Created lazily via `POST /guest/init` the first time they are needed.
 * - `installId` + `installSecret` survive reinit so the backend can re-link securely.
 * - `sessionToken` is applied to `apiClient` for protected endpoints.
 */
/** Refresh the session when it expires within this window (ms). */
const SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000;

export class GuestService {
  private initialized = false;
  private guestId: string | null = null;
  private sessionToken: string | null = null;
  private sessionTokenExpiresAt: number | null = null;
  private inflight: Promise<string | null> | null = null;

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  /** Load persisted credentials into memory. Never hits the network. */
  async init(): Promise<void> {
    if (this.initialized) return;

    this.guestId = await this.repository.loadGuestId();
    this.sessionToken = await this.repository.loadSessionToken();
    this.sessionTokenExpiresAt = await this.repository.loadSessionTokenExpiresAt();

    if (this.guestId && !this.sessionToken) {
      logger.warn('[Guest] Legacy guestId without sessionToken — clearing credentials');
      this.guestId = null;
      this.sessionTokenExpiresAt = null;
      await this.repository.clearCredentials();
    }

    if (this.sessionToken && this.isSessionExpired()) {
      logger.warn('[Guest] Persisted session token expired — clearing credentials');
      this.guestId = null;
      this.sessionToken = null;
      this.sessionTokenExpiresAt = null;
      await this.repository.clearCredentials();
    }

    this.applySessionToken();
    this.initialized = true;

    logger.info('[Guest] Initialized', {
      hasGuestId: this.guestId !== null,
      hasSessionToken: this.sessionToken !== null,
      sessionExpiresAt: this.sessionTokenExpiresAt,
      hasInstallId: (await this.repository.loadInstallId()) !== null,
      hasInstallSecret: (await this.repository.loadInstallSecret()) !== null,
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
      if (this.isSessionExpired()) {
        logger.info('[Guest] Session expired or near expiry — refreshing');
        return this.reinit();
      }

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
   * Discards session credentials and re-initializes via installId + installSecret.
   * Used to recover from expired/invalid session tokens.
   */
  async reinit(): Promise<string | null> {
    this.guestId = null;
    this.sessionToken = null;
    this.sessionTokenExpiresAt = null;
    apiClient.setAuthToken(null);
    await this.repository.clearCredentials();
    return this.ensureGuestId();
  }

  async updateName(name: string): Promise<void> {
    await this.ensureGuestId();
    await this.repository.updateName(name);
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
    const installSecret = await this.repository.loadInstallSecret();

    try {
      return await this.persistCredentials(
        await this.repository.initGuest(installId, installSecret ?? undefined)
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 409 && installSecret) {
        logger.warn('[Guest] installId conflict — retrying relink once');
        await this.delay(250);
        return await this.persistCredentials(
          await this.repository.initGuest(installId, installSecret)
        );
      }

      if (error instanceof ApiError && error.status === 401 && installSecret === null) {
        logger.warn(
          '[Guest] installSecret missing for existing installId — resetting install recovery'
        );
        await this.repository.clearInstallRecovery();
        const freshInstallId = await this.repository.ensureInstallId();
        return await this.persistCredentials(await this.repository.initGuest(freshInstallId));
      }

      throw error;
    }
  }

  private async persistCredentials(
    credentials: Awaited<ReturnType<GuestRepository['initGuest']>>
  ): Promise<string> {
    if (credentials.installSecret) {
      await this.repository.saveInstallSecret(credentials.installSecret);
    }

    await this.repository.saveGuestId(credentials.guestId);
    await this.repository.saveSessionToken(credentials.sessionToken);
    await this.repository.saveSessionTokenExpiresAt(credentials.sessionTokenExpiresAt);

    this.guestId = credentials.guestId;
    this.sessionToken = credentials.sessionToken;
    this.sessionTokenExpiresAt = new Date(credentials.sessionTokenExpiresAt).getTime();
    this.applySessionToken();

    logger.info('[Guest] Guest identity ready', { relinked: credentials.relinked });
    return credentials.guestId;
  }

  private isSessionExpired(now = Date.now()): boolean {
    if (!this.sessionTokenExpiresAt) return false;
    return now >= this.sessionTokenExpiresAt - SESSION_REFRESH_BUFFER_MS;
  }

  private applySessionToken(): void {
    apiClient.setAuthToken(this.sessionToken);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

export const guest = new GuestService();
