import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GameSyncRepository } from './game-sync.repository';
import { PENDING_RESULTS_KEY } from './game-sync.model';

vi.mock('@platform/core/storage', () => ({
  storage: {
    load: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
  },
}));

import { storage } from '@platform/core/storage';

describe('GameSyncRepository', () => {
  const repository = new GameSyncRepository();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps queued items without a signature until flush time', async () => {
    const pending = [
      {
        localId: 'local-1',
        clientResultId: 'res-1',
        gameId: 'FRULOOP',
        guestId: '',
        score: 42,
        playedAt: '2026-01-15T10:00:00.000Z',
        createdAt: '2026-01-15T10:00:00.000Z',
        synced: false,
        syncAttempts: 0,
      },
    ];

    vi.mocked(storage.load).mockResolvedValue(pending);

    await expect(repository.loadQueue()).resolves.toEqual(pending);
    expect(storage.save).not.toHaveBeenCalled();
  });

  it('persists queue updates', async () => {
    vi.mocked(storage.load).mockResolvedValue([]);
    const queue = [
      {
        localId: 'local-1',
        clientResultId: 'res-1',
        gameId: 'FRULOOP',
        guestId: '',
        score: 42,
        playedAt: '2026-01-15T10:00:00.000Z',
        createdAt: '2026-01-15T10:00:00.000Z',
        synced: false,
        syncAttempts: 0,
      },
    ];

    await repository.saveQueue(queue);
    expect(storage.save).toHaveBeenCalledWith(PENDING_RESULTS_KEY, queue);
  });
});
