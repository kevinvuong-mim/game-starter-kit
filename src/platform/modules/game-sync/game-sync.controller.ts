import { logger } from '@platform/core/error';
import type { IEventBus } from '@platform/core/events';

import { gameSync, type GameSyncService } from './game-sync.service';

/**
 * Bridges platform/lifecycle events to the sync service.
 *
 * - `game:over`  → persist the result locally, then flush in the background.
 * - `app:resume` → flush any pending results when the app foregrounds.
 * - network `online` → flush when connectivity is restored.
 */
export class GameSyncController {
  private onlineHandler?: () => void;

  constructor(private readonly service: GameSyncService = gameSync) {}

  bind(events: IEventBus): () => void {
    const unsubs = [
      events.on('game:over', async ({ score, duration, jumps }) => {
        await this.service.recordResult({
          score,
          duration: Math.round(duration / 1000),
          metadata: typeof jumps === 'number' ? { jumps } : undefined,
        });
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

    // Attempt an initial flush in case results were queued in a previous session.
    void this.service.flush().catch(() => undefined);

    return () => {
      for (const unsub of unsubs) unsub();
      if (this.onlineHandler && typeof window !== 'undefined') {
        window.removeEventListener('online', this.onlineHandler);
        this.onlineHandler = undefined;
      }
    };
  }
}

export const gameSyncController = new GameSyncController();
