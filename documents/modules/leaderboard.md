# Leaderboard

Đọc all-time leaderboard từ `game-api`, cache theo page, expose view qua event bus.

## Endpoint

`GET /api/leaderboards?gameId=FRULOOP&page=1&limit=20&guestId=<optional>`

## Response (`data`)

```json
{
  "gameId": "FRULOOP",
  "total": 150,
  "page": 1,
  "limit": 20,
  "items": [
    { "rank": 1, "guestId": "uuid", "name": "PlayerOne", "bestScore": 9999 }
  ],
  "self": { "rank": 12, "bestScore": 5000 }
}
```

## View model

UI nhận `leaderboard:update` với `entries[].bestScore`, `myRank`, `myBestScore`.
