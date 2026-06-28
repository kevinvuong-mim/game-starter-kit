# Game Result Sync

## Overview

Game result sync là hệ thống offline-first để lưu kết quả game local rồi batch upload lên `api-starter-kit`.

**Key files:**

- `src/platform/modules/game-sync/game-sync.service.ts`
- `src/platform/modules/game-sync/game-sync.repository.ts`
- `src/platform/modules/game-sync/game-sync.model.ts`
- `src/platform/modules/game-sync/game-sync.controller.ts`

---

## Event Flow

`GameSyncController` bind các trigger:

| Trigger | Behavior |
| ------- | -------- |
| `game:over` | Record result vào local queue, rồi flush background |
| `app:resume` | Flush pending queue |
| browser `online` | Flush pending queue |
| initial bind | Flush queue từ session trước |

Game scene chỉ cần emit:

```typescript
eventBus.emit('game:over', {
  score,
  duration,
  jumps,
});
```

Controller sẽ convert metadata:

```typescript
{
  duration: Math.round(duration / 1000),
  jumps
}
```

---

## Local Queue

Queue key:

```text
game_pending_results
```

Stored in Capacitor Preferences.

Mỗi item:

| Field | Description |
| ----- | ----------- |
| `localId` | Local generated id |
| `gameId` | Runtime `getConfig().gameId` |
| `guestId` | Guest id hiện tại nếu đã có, có thể rỗng lúc record offline |
| `score` | Non-negative integer |
| `runSeed` | UUID per run |
| `playedAt` | ISO timestamp |
| `replayHash` | HMAC SHA-256 |
| `metadata` | Raw metadata trước khi sanitize |
| `synced` | Sync status |
| `syncAttempts` | Retry counter |
| `createdAt` | Same as `playedAt` |

Legacy queue items thiếu `runSeed` hoặc `playedAt` bị drop khi load queue.

---

## Replay Hash

Client tính hash bằng Web Crypto:

```text
HMAC-SHA256(replaySecret, "{gameId}|{score}|{runSeed}")
```

Inputs:

| Input | Source |
| ----- | ------ |
| `gameId` | `src/game/config.ts` via runtime config |
| `score` | `toNonNegativeInt(params.score)` |
| `runSeed` | Provided param hoặc `crypto.randomUUID()` |
| `replaySecret` | `src/game/config.ts` |

Hash phải match backend `api-starter-kit` implementation.

---

## Local Validation and Metadata

Before queueing:

- Score được normalize về non-negative integer.
- `playedAt` default là `new Date().toISOString()`.

Before upload, metadata được sanitize để khớp backend:

| Rule | Value |
| ---- | ----- |
| Max keys | `10` |
| Max JSON bytes | `2048` |
| Max key length | `64` |
| Max string length | `256` |
| Allowed values | string, finite number, boolean, null |
| Nested object/array | dropped |

`runSeed` luôn được merge vào `metadata.runSeed` khi upload.

---

## Flush Flow

`gameSync.flush()`:

1. Skip nếu đang flush.
2. Skip nếu browser reports offline.
3. Ensure guest id via `guest.ensureGuestId()`.
4. Load queue.
5. Filter unsynced items của current `gameId` với `syncAttempts < 10`.
6. Upload theo batch size tối đa 50.
7. Apply per-item response bằng `replayHash`.
8. Accepted item → mark `synced=true`.
9. Permanent rejected item → mark synced và emit `game:sync:rejected`.
10. Prune synced/exhausted items khỏi queue.
11. Update local high score từ `response.bestScore` nếu > 0.
12. Emit `game:synced`.

---

## API Contract

Endpoint:

```http
POST /games/:gameId/results
Content-Type: application/json
```

Body:

```json
{
  "guestId": "550e8400-e29b-41d4-a716-446655440000",
  "results": [
    {
      "score": 1500,
      "replayHash": "a3f2c1b9d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0",
      "playedAt": "2026-06-27T10:00:00.000Z",
      "metadata": {
        "runSeed": "550e8400-e29b-41d4-a716-446655440000",
        "duration": 30,
        "jumps": 12
      }
    }
  ]
}
```

Response payload:

```json
{
  "results": [
    {
      "replayHash": "a3f2c1b9...",
      "status": "accepted"
    }
  ],
  "accepted": 1,
  "rejected": 0,
  "bestScore": 1500
}
```

---

## Rejection Handling

Permanent rejection reasons:

- `MISSING_REPLAY_HASH`
- `DUPLICATE_REPLAY`
- `INVALID_REPLAY_HASH_FORMAT`
- `INVALID_REPLAY_SIGNATURE`
- `MISSING_RUN_SEED`
- `SCORE_MISMATCH`
- `INVALID_PLAYED_AT`

Permanent rejected results are pruned from queue after emitting `game:sync:rejected`.

Transient request failures increment `syncAttempts`; item is retried until `MAX_SYNC_ATTEMPTS = 10`.

---

## Auth Recovery

If sync receives `401`:

1. `GameSyncService` calls `guest.reinit()`.
2. Guest credentials are refreshed via install recovery.
3. Sync retries once with the new token.

If backend returns `404`, check `src/game/config.ts` `id` against backend `games.id`.

---

## Related Documentation

- [Guest Identity](./guest-identity.md)
- [Leaderboard](./leaderboard.md)
- [Game Configuration](../setup/game-configuration.md)
