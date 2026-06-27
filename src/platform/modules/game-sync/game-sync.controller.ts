import { logger } from '@platform/core/error';
import type { IEventBus } from '@platform/core/events';
import { gameSync, type GameSyncService } from './game-sync.service';
import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Bridges platform/lifecycle events to the sync service.
 *
 * - `game:over`  → persist the result locally, then flush in the background.
 * - `app:resume` → flush any pending results when the app foregrounds.
 * - network `online` → flush when connectivity is restored.
 */
export class GameSyncController {
  private onlineHandler?: () => void;
  private networkListener?: PluginListenerHandle;

  constructor(private readonly service: GameSyncService = gameSync) {}

  bind(events: IEventBus): () => void {
    const unsubs = [
      events.on('game:over', async ({ score, duration, jumps }) => {
        const metadata: Record<string, number> = {
          duration: Math.round(duration / 1000),
        };
        if (typeof jumps === 'number') metadata.jumps = jumps;

        await this.service.recordResult({ score, metadata });
        void this.service.flush().catch(() => undefined);
      }),

      events.on('app:resume', () => {
        void this.service.flush().catch(() => undefined);
      }),
    ];

    if (typeof window !== 'undefined') {
      this.onlineHandler = () => {
        logger.info('[GameSync] Network online — flushing queue');
        void this.service.flush().catch(() => undefined);
      };
      window.addEventListener('online', this.onlineHandler);
    }

    void this.bindNativeNetworkListener();

    // Attempt an initial flush in case results were queued in a previous session.
    void this.service.flush().catch(() => undefined);

    return () => {
      for (const unsub of unsubs) unsub();
      if (this.onlineHandler && typeof window !== 'undefined') {
        window.removeEventListener('online', this.onlineHandler);
        this.onlineHandler = undefined;
      }
      void this.networkListener?.remove();
      this.networkListener = undefined;
    };
  }

  private async bindNativeNetworkListener(): Promise<void> {
    try {
      const { Network } = await import('@capacitor/network');
      this.networkListener = await Network.addListener('networkStatusChange', ({ connected }) => {
        if (!connected) return;
        logger.info('[GameSync] Native network connected — flushing queue');
        void this.service.flush().catch(() => undefined);
      });
    } catch {
      // Web builds and older native shells keep using the window 'online' fallback.
    }
  }
}

export const gameSyncController = new GameSyncController();
