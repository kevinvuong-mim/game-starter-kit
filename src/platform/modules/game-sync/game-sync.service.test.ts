import { afterEach, describe, expect, it, vi } from 'vitest';

import { createConfig, setConfig } from '@platform/core/config';
import { eventBus } from '@platform/core/events';

import { GameSyncService } from './game-sync.service';
import type { GameSyncRepository } from './game-sync.repository';

describe('GameSyncService', () => {
  afterEach(() => {
    eventBus.clear();
    vi.restoreAllMocks();
    setConfig(createConfig());
  });

  it('rejects scores above runtime maxScore before writing to the offline queue', async () => {
    setConfig(
      createConfig({
        gameId: 'puzzle-quest',
        maxScore: 100,
        replaySecret: 'puzzle-quest-dev-secret',
      })
    );

    const repository = {
      loadQueue: vi.fn().mockResolvedValue([]),
      saveQueue: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn(),
    } as unknown as GameSyncRepository;
    const guestService = {
      getGuestId: vi.fn().mockReturnValue('guest-1'),
      ensureGuestId: vi.fn(),
      reinit: vi.fn(),
    };
    const rejected = vi.fn();
    eventBus.on('game:sync:rejected', rejected);

    const service = new GameSyncService(repository, guestService as never);
    await service.recordResult({ score: 101, runSeed: 'run-1' });

    expect(repository.loadQueue).not.toHaveBeenCalled();
    expect(repository.saveQueue).not.toHaveBeenCalled();
    expect(rejected).toHaveBeenCalledWith({
      gameId: 'puzzle-quest',
      items: [
        expect.objectContaining({
          score: 101,
          reason: 'SCORE_EXCEEDS_MAX',
        }),
      ],
    });
  });
});
