import { logger } from '@platform/core/error';
import { apiClient } from '@platform/core/api';
import { getConfig } from '@platform/core/config';
import { guestRepository, type GuestRepository } from './guest.repository';

export type GuestStatus = 'ready' | 'pending';

type GuestReadyListener = (guestId: string) => void;

/**
 * Manages the anonymous guest identity.
 *
 * `init()` loads stored credentials or creates a new guest once per install.
 */
export class GuestService {
  private guestStatus: GuestStatus = 'pending';
  private guestId: string | null = null;
  private networkListenerRegistered = false;
  private readonly readyListeners = new Set<GuestReadyListener>();

  constructor(private readonly repository: GuestRepository = guestRepository) {}

  async init(): Promise<void> {
    try {
      const stored = await this.repository.loadCredentials();
      if (stored) {
        apiClient.setAuthToken(stored.secretToken);
        this.markReady(stored.guestId);
        logger.info('[Guest] Loaded credentials from storage');
        return;
      }

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
      this.markReady(payload.guestId);
      logger.info('[Guest] Created new guest identity');
    } catch (error) {
      this.guestStatus = 'pending';
      this.guestId = null;
      apiClient.setAuthToken(null);
      logger.warn('[Guest] Failed to create guest identity (offline?)', error);
      void this.registerNetworkRetry();
    }
  }

  async recoverFromUnauthorized(): Promise<boolean> {
    await this.repository.clearCredentials();
    apiClient.setAuthToken(null);
    this.guestStatus = 'pending';
    this.guestId = null;
    await this.init();
    return this.getStatus() === 'ready';
  }

  getGuestId(): string | null {
    return this.guestId;
  }

  getStatus(): GuestStatus {
    return this.guestStatus;
  }

  onReady(listener: GuestReadyListener): () => void {
    if (this.guestStatus === 'ready' && this.guestId) {
      listener(this.guestId);
    }

    this.readyListeners.add(listener);
    return () => {
      this.readyListeners.delete(listener);
    };
  }

  async updateName(name: string): Promise<void> {
    if (!this.guestId) return;
    await this.repository.updateName(name);
  }

  private markReady(guestId: string): void {
    this.guestId = guestId;
    this.guestStatus = 'ready';

    for (const listener of this.readyListeners) {
      listener(guestId);
    }
  }

  private async registerNetworkRetry(): Promise<void> {
    if (this.networkListenerRegistered) return;
    this.networkListenerRegistered = true;

    try {
      const { Network } = await import('@capacitor/network');
      await Network.addListener('networkStatusChange', ({ connected }) => {
        if (!connected || this.guestStatus === 'ready') return;
        logger.info('[Guest] Network connected — retrying guest init');
        void this.init();
      });
    } catch {
      if (typeof window === 'undefined') return;

      const retry = () => {
        if (this.guestStatus === 'ready') return;
        logger.info('[Guest] Browser online — retrying guest init');
        void this.init();
      };

      window.addEventListener('online', retry);
    }
  }
}

export const guest = new GuestService();
