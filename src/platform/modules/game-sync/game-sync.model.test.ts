import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  computeReplayHash,
  PERMANENT_SYNC_REJECTIONS,
  sanitizeMetadata,
  toNonNegativeInt,
  type SyncRejectionReason,
} from './game-sync.model';

interface ReplayHashVector {
  name: string;
  gameId: string;
  score: number;
  runSeed: string;
  replayHash: string;
  replaySecret: string;
}

function readContractJson<T>(fileName: string): T {
  const repoLocalPath = resolve(process.cwd(), 'contracts', fileName);
  const workspacePath = resolve(process.cwd(), '..', 'contracts', fileName);
  const contractPath = existsSync(repoLocalPath) ? repoLocalPath : workspacePath;

  return JSON.parse(readFileSync(contractPath, 'utf8')) as T;
}

describe('game-sync.model', () => {
  it('computes replay hashes compatible with the backend HMAC contract', async () => {
    const vectors = readContractJson<ReplayHashVector[]>('replay-hash-vectors.json');

    for (const vector of vectors) {
      await expect(
        computeReplayHash({
          gameId: vector.gameId,
          score: vector.score,
          runSeed: vector.runSeed,
          replaySecret: vector.replaySecret,
        })
      ).resolves.toBe(vector.replayHash);
    }
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

  it('keeps permanent rejection reasons aligned with the shared contract', () => {
    const reasons = readContractJson<SyncRejectionReason[]>('sync-rejection-reasons.json');

    for (const reason of reasons) {
      expect(PERMANENT_SYNC_REJECTIONS.has(reason)).toBe(true);
    }
  });

  it('normalizes invalid scores to non-negative integers', () => {
    expect(toNonNegativeInt(12.9)).toBe(12);
    expect(toNonNegativeInt(-1)).toBe(0);
    expect(toNonNegativeInt(Number.NaN)).toBe(0);
  });
});
