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
      getStatus: vi.fn().mockReturnValue('pending'),
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
      }),
    ]);
  });

  it('emits game:sync:dropped when an item exceeds max attempts', async () => {
    setConfig(
      createConfig({
        gameId: 'FRULOOP',
        replaySecret: 'a'.repeat(64),
      })
    );

    const droppedHandler = vi.fn();
    eventBus.on('game:sync:dropped', droppedHandler);

    const repository = {
      loadQueue: vi
        .fn()
        .mockResolvedValueOnce([
          {
            localId: 'local-1',
            clientResultId: 'res-1',
            gameId: 'FRULOOP',
            guestId: '',
            score: 10,
            playedAt: '2026-01-15T10:00:00.000Z',
            createdAt: '2026-01-15T10:00:00.000Z',
            synced: false,
            syncAttempts: 9,
          },
        ])
        .mockResolvedValueOnce([]),
      saveQueue: vi.fn().mockResolvedValue(undefined),
      sync: vi.fn().mockRejectedValue(new Error('network')),
    } as unknown as GameSyncRepository;

    const guestService = {
      getGuestId: vi.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000'),
      getStatus: vi.fn().mockReturnValue('ready'),
    };

    const service = new GameSyncService(repository, guestService as never);
    await expect(service.flush()).rejects.toThrow('network');

    expect(droppedHandler).toHaveBeenCalledWith({
      clientResultId: 'res-1',
      attempts: 10,
    });
  });
});
