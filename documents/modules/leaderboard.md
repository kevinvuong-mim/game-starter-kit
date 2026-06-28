# Leaderboard

## Overview

Leaderboard module đọc all-time leaderboard từ `api-starter-kit`, cache theo page để hỗ trợ offline/poor network, và expose view model cho Phaser UI qua event bus.

**Key files:**

- `src/platform/modules/leaderboard/leaderboard.service.ts`
- `src/platform/modules/leaderboard/leaderboard.repository.ts`
- `src/platform/modules/leaderboard/leaderboard.model.ts`
- `src/platform/modules/leaderboard/leaderboard.controller.ts`
- `src/platform/ui/leaderboard/LeaderboardPanel.ts`

---

## API Contract

Endpoint:

```http
GET /leaderboards?gameId={gameId}&page={page}&limit=100&guestId={guestId}
```

`gameId` comes from runtime config, which is set from `src/game/config.ts`.

Response payload:

```json
{
  "top": [
    {
      "rank": 1,
      "guestId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "PlayerOne",
      "score": 5000
    }
  ],
  "myRank": 123,
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 250,
    "totalPages": 3
  }
}
```

---

## Cache

Cache constants:

| Constant | Value |
| -------- | ----- |
| `LEADERBOARD_CACHE_TTL_MS` | `60000` |
| `LEADERBOARD_LIMIT` | `100` |
| `LEADERBOARD_CACHE_PREFIX` | `leaderboard:cache:` |

Cache key:

```text
leaderboard:cache:{gameId}:p{page}
```

Cache entry:

```typescript
{
  page,
  data,
  updatedAt
}
```

`leaderboard.init()` warms in-memory view from persisted cache for current page.

---

## Fetch Flow

`LeaderboardService.fetchLeaderboard()`:

1. Update current page if provided.
2. If current in-memory view is ready, not from cache, and fresh within TTL → emit current view and skip network.
3. Lock concurrent request via `inflight`.
4. Transition view to `loading` or `refreshing`.
5. Ensure guest id so backend can return `myRank`.
6. Fetch page from API.
7. Normalize response.
8. Save cache.
9. Build `LeaderboardView`.
10. Emit `leaderboard:update`.

On failure:

- If status `401`, reinit guest and retry once.
- If current view has entries, keep showing cached data with `fromCache=true`.
- If no data, set `status='error'`.
- If status `404`, log "Game not found" so `gameConfig.id` can be checked.

---

## Event Flow

`LeaderboardController` binds:

| Event | Behavior |
| ----- | -------- |
| `leaderboard:request` | Load cache-aware page |
| `leaderboard:refresh` | Force network refresh |
| `leaderboard:page` | Force load specific page |
| `game:synced` | Refresh leaderboard so new score appears |

`LeaderboardPanel`:

- Emits `leaderboard:request` on construction.
- Emits `leaderboard:refresh` on refresh button.
- Emits `leaderboard:page` on pagination.
- Subscribes to `leaderboard:update`.
- Auto refreshes every 30 seconds when online.
- Shows only up to 7 rows in panel (`MAX_ROWS = 7`), while backend page limit is 100.

---

## View Model

`LeaderboardView`:

| Field | Description |
| ----- | ----------- |
| `status` | `idle`, `loading`, `refreshing`, `ready`, `error` |
| `entries` | Normalized leaderboard entries |
| `myRank` | Current guest rank, or null |
| `myGuestId` | Guest id used to highlight current player |
| `pagination` | Page/limit/total/totalPages |
| `isEmpty` | True when no entries |
| `fromCache` | True when view is cache fallback |
| `lastUpdated` | Timestamp ms |
| `error` | i18n key like `leaderboard.offline` or `leaderboard.error` |

Display helper:

- Uses `name` if present.
- Falls back to anonymous label.
- Masks full guest id; do not display full UUID in UI.

---

## Related Documentation

- [Guest Identity](./guest-identity.md)
- [Game Result Sync](./game-result-sync.md)
- [Platform Events](./platform-events.md)
