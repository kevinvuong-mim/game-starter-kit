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

  it('queues valid results locally before syncing', async () => {
    setConfig(
      createConfig({
        gameId: 'puzzle-quest',
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

    const service = new GameSyncService(repository, guestService as never);
    await service.recordResult({ score: 101, runSeed: 'run-1' });

    expect(repository.loadQueue).toHaveBeenCalledOnce();
    expect(repository.saveQueue).toHaveBeenCalledOnce();
    expect(repository.saveQueue).toHaveBeenCalledWith([
      expect.objectContaining({
        gameId: 'puzzle-quest',
        score: 101,
        runSeed: 'run-1',
        synced: false,
      }),
    ]);
  });
});
