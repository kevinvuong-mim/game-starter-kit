# Leaderboard

Hybrid offline-first: đọc all-time leaderboard từ `game-api`, cache theo page (TTL 60s, `LEADERBOARD_LIMIT` = 10/page), stale-while-revalidate khi offline.

## Events

| Event                 | Mô tả                                           |
| --------------------- | ----------------------------------------------- |
| `leaderboard:refresh` | Load cache-aware; UI emit khi mở panel (page 1) |
| `leaderboard:page`    | Load page cụ thể (force network)                |
| `leaderboard:update`  | UI nhận view model sau khi load                 |

`LeaderboardController` cũng gọi `refreshLeaderboard()` trên `app:resume`.

## Offline behavior

- `init()`: hydrate từ cache local nếu có; đánh dấu `isStale` khi cache hết TTL.
- `fetchLeaderboard()`: serve cache trước, revalidate nền khi online.
- `myBestScore`: enrich từ `progress.highScore` local khi API không trả `self`.
- UI hiển thị banner khi `status === 'offline'` hoặc `isStale === true`.

## Endpoint

`GET /api/leaderboards?gameId=FRULOOP&page=1&limit=10&guestId=<optional>`

## Response (`data`)

```json
{
  "gameId": "FRULOOP",
  "total": 150,
  "page": 1,
  "limit": 10,
  "items": [{ "rank": 1, "guestId": "uuid", "name": "PlayerOne", "bestScore": 9999 }],
  "self": { "rank": 12, "bestScore": 5000 }
}
```

## View model

UI nhận `leaderboard:update` với `entries[].bestScore`, `myRank`, `myBestScore`, `isStale`, `fromCache`, `status`.
