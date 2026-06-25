import type { IEventBus } from '@platform/core/events';

import { leaderboard, type LeaderboardService } from './leaderboard.service';

/**
 * Connects the leaderboard service to the event bus so the UI stays decoupled
 * from data fetching:
 *
 * - `leaderboard:request` → load (cache-aware).
 * - `leaderboard:refresh` → force a network refresh.
 * - `leaderboard:page`    → load a specific page.
 * - `game:synced`         → refresh so a newly synced score shows up without
 *                           manual interaction.
 */
export class LeaderboardController {
  constructor(private readonly service: LeaderboardService = leaderboard) {}

  bind(events: IEventBus): () => void {
    const unsubs = [
      events.on('leaderboard:request', (payload) => {
        void this.service.fetchLeaderboard({ page: payload?.page }).catch(() => undefined);
      }),

      events.on('leaderboard:refresh', (payload) => {
        void this.service.refreshLeaderboard(payload?.page).catch(() => undefined);
      }),

      events.on('leaderboard:page', ({ page }) => {
        void this.service.fetchLeaderboard({ page, force: true }).catch(() => undefined);
      }),

      events.on('game:synced', () => {
        void this.service.refreshLeaderboard().catch(() => undefined);
      }),
    ];

    return () => {
      for (const unsub of unsubs) unsub();
    };
  }
}

export const leaderboardController = new LeaderboardController();
