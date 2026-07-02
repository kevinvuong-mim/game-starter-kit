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
        gameId: 'FRULOOP',
        replaySecret: 'a'.repeat(64),
      })
    );

    const repository = {
      loadQueue: vi.fn().mockResolvedValue([]),
      saveQueue: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn(),
    } as unknown as GameSyncRepository;
    const guestService = {
      getGuestId: vi.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
    };

    const service = new GameSyncService(repository, guestService as never);
    await service.recordResult({
      score: 101,
      playedAt: '2026-01-15T10:00:00.000Z',
    });

    expect(repository.loadQueue).toHaveBeenCalledOnce();
    expect(repository.saveQueue).toHaveBeenCalledOnce();
    expect(repository.saveQueue).toHaveBeenCalledWith([
      expect.objectContaining({
        gameId: 'FRULOOP',
        score: 101,
        playedAt: '2026-01-15T10:00:00.000Z',
        synced: false,
        signature: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    ]);
  });
});
