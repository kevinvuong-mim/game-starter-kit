# Leaderboard

Đọc all-time leaderboard từ `game-api`, cache theo page (TTL 60s, limit 20/page), expose view qua event bus.

## Events

| Event                 | Mô tả                              |
| --------------------- | ---------------------------------- |
| `leaderboard:request` | Load cache-aware (mặc định page 1) |
| `leaderboard:refresh` | Bỏ cache, fetch lại từ network     |
| `leaderboard:page`    | Load page cụ thể                   |
| `leaderboard:update`  | UI nhận view model sau khi load    |

## Endpoint

`GET /api/leaderboards?gameId=FRULOOP&page=1&limit=20&guestId=<optional>`

## Response (`data`)

```json
{
  "gameId": "FRULOOP",
  "total": 150,
  "page": 1,
  "limit": 20,
  "items": [{ "rank": 1, "guestId": "uuid", "name": "PlayerOne", "bestScore": 9999 }],
  "self": { "rank": 12, "bestScore": 5000 }
}
```

## View model

UI nhận `leaderboard:update` với `entries[].bestScore`, `myRank`, `myBestScore`.
