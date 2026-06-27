import { describe, expect, it } from 'vitest';

import {
  computeReplayHash,
  PERMANENT_SYNC_REJECTIONS,
  sanitizeMetadata,
  toNonNegativeInt,
} from './game-sync.model';

describe('game-sync.model', () => {
  it('computes replay hashes compatible with the backend HMAC contract', async () => {
    await expect(
      computeReplayHash({
        gameId: 'puzzle-quest',
        score: 1500,
        runSeed: 'e2e-run-1',
        replaySecret: 'puzzle-quest-dev-secret',
      })
    ).resolves.toBe('7f39f09c8ad5af3f6dec0d0633e895fa30d25aa001d4883235cc64343273f104');
  });

  it('sanitizes metadata to the backend flat JSON contract and injects runSeed', () => {
    expect(
      sanitizeMetadata(
        {
          duration: 12,
          nested: { ignored: true },
          label: 'valid',
          long: 'x'.repeat(300),
          ok: true,
        },
        'run-1'
      )
    ).toEqual({
      duration: 12,
      label: 'valid',
      ok: true,
      runSeed: 'run-1',
    });
  });

  it('treats missing replay hashes as permanent queue rejections', () => {
    expect(PERMANENT_SYNC_REJECTIONS.has('MISSING_REPLAY_HASH')).toBe(true);
  });

  it('normalizes invalid scores to non-negative integers', () => {
    expect(toNonNegativeInt(12.9)).toBe(12);
    expect(toNonNegativeInt(-1)).toBe(0);
    expect(toNonNegativeInt(Number.NaN)).toBe(0);
  });
});
