import { describe, expect, it } from 'vitest';

import {
  buildReplayPayload,
  computeReplaySignature,
  sanitizeMetadata,
  toNonNegativeInt,
} from './game-sync.model';

const REPLAY_SECRET = 'a'.repeat(64);

describe('game-sync.model', () => {
  it('computes replay signatures compatible with game-api HMAC contract', async () => {
    const params = {
      gameId: 'FRULOOP',
      guestId: '550e8400-e29b-41d4-a716-446655440000',
      clientResultId: 'result-001',
      score: 1500,
      playedAt: '2026-01-15T10:00:00.000Z',
      replaySecret: REPLAY_SECRET,
    };

    const payload = buildReplayPayload(params);
    expect(payload).toBe(
      'FRULOOP|550e8400-e29b-41d4-a716-446655440000|result-001|1500|2026-01-15T10:00:00.000Z'
    );

    const signature = await computeReplaySignature(params);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
    expect(await computeReplaySignature(params)).toBe(signature);
  });

  it('sanitizes metadata to backend flat JSON limits', () => {
    expect(
      sanitizeMetadata({
        duration: 12,
        nested: { ignored: true },
        label: 'valid',
        long: 'x'.repeat(300),
        ok: true,
      })
    ).toEqual({
      duration: 12,
      label: 'valid',
      ok: true,
    });
  });

  it('normalizes invalid scores to non-negative integers', () => {
    expect(toNonNegativeInt(12.9)).toBe(12);
    expect(toNonNegativeInt(-1)).toBe(0);
    expect(toNonNegativeInt(Number.NaN)).toBe(0);
  });
});
