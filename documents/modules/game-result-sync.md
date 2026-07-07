# Game result sync

Offline-first queue → batch upload `POST /api/results`.

## Storage

| Key                 | Provider                           | Nội dung                |
| ------------------- | ---------------------------------- | ----------------------- |
| `game-sync:pending` | Durable storage (`StorageService`) | Queue kết quả chưa sync |

Trên native Preferences, key được lưu với prefix `gsk:` (vật lý: `gsk:game-sync:pending`).

## Limits

| Constant              | Value |
| --------------------- | ----: |
| `MAX_BATCH_SIZE`      |    50 |
| `MAX_SYNC_ATTEMPTS`   |    10 |
| `MAX_PENDING_RESULTS` |   500 |

## HMAC signature

```text
HMAC-SHA256(
  replaySecret,
  `${gameId}|${guestId}|${clientResultId}|${score}|${playedAt || ''}`
)
```

- `playedAt`: ISO8601 string (dùng đúng chuỗi gốc khi ký).
- Field gửi lên API: `signature` (hex).

## Request

Header: `Authorization: Bearer <secretToken>`

```json
{
  "gameId": "FRULOOP",
  "items": [
    {
      "clientResultId": "result-001",
      "score": 1500,
      "playedAt": "2026-01-15T10:00:00.000Z",
      "metadata": { "duration": 12 },
      "signature": "<hmac-hex>"
    }
  ]
}
```

## Response

```json
{
  "success": true,
  "insertedCount": 1,
  "rejectedCount": 0,
  "rejected": [],
  "message": "Results submitted"
}
```

Item trong `rejected[]` (signature invalid, v.v.) **không** được đánh dấu synced — vẫn ở queue để retry hoặc drop theo policy.

## Metadata

- Tối đa 10 keys, 2048 bytes JSON.
- Chỉ flat primitives (string / number / boolean / null).

## Flow

1. `game:over` → queue local.
2. `flush()` khi online / `app:resume` / guest ready / native network reconnect.
3. Batch tối đa 50 items, Bearer auth.
4. Chỉ đánh dấu synced các item có trong `insertedCount` (loại trừ `rejected`).
