# Guest Identity

## Overview

Guest identity quản lý anonymous player và Bearer session token để gọi API protected của `api-starter-kit`.

**Key files:**

- `src/platform/modules/guest/guest.service.ts`
- `src/platform/modules/guest/guest.repository.ts`
- `src/platform/modules/guest/guest.model.ts`

---

## Storage Keys

Guest credentials được lưu bằng Capacitor Preferences:

| Key | Description |
| --- | ----------- |
| `game_guest_id` | UUID guest id |
| `game_session_token` | Session token dùng cho `Authorization: Bearer <token>` |
| `game_session_token_expires_at` | ISO expiry string của session token |
| `game_install_id` | UUID install id, persist để re-link |
| `game_install_secret` | Secret server trả về một lần khi tạo guest với `installId` |

`installId` và `installSecret` được giữ lại khi clear session credentials để có thể re-link và rotate token.

---

## Init Flow

`App.init()` gọi `guest.init()` trong boot sequence.

`guest.init()`:

1. Load `guestId`, `sessionToken`, `sessionTokenExpiresAt` từ Preferences.
2. Nếu có legacy `guestId` nhưng thiếu token → clear session credentials.
3. Nếu token expired hoặc sắp hết hạn → clear session credentials.
4. Apply token vào `apiClient.setAuthToken()`.
5. Không gọi network trong init.

Session được xem là cần refresh khi còn dưới 5 phút:

```text
SESSION_REFRESH_BUFFER_MS = 5 * 60 * 1000
```

---

## Lazy Guest Creation

Network chỉ xảy ra khi code gọi `guest.ensureGuestId()`.

Flow:

1. Nếu đã có valid `guestId` + `sessionToken` → apply token và return.
2. Nếu token expired/near expiry → `reinit()`.
3. Nếu chưa có guest → `createGuest()`.
4. `GuestRepository.ensureInstallId()` tạo UUID install id nếu chưa có.
5. Call `POST /guest/init` với `{ installId, installSecret? }`.
6. Save credentials và apply session token vào API client.

`ensureGuestId()` trả `null` nếu offline hoặc create guest thất bại, để game vẫn chạy offline.

---

## Re-link Recovery

Khi backend trả `401` do `installId` cũ đã tồn tại nhưng client thiếu `installSecret`:

1. Log warning.
2. Clear `game_install_id` và `game_install_secret`.
3. Generate install id mới.
4. Gọi lại `POST /guest/init`.

Khi API protected trả `401`, `LeaderboardService` và `GameSyncService` sẽ gọi `guest.reinit()` một lần rồi retry.

---

## API Contract

### Init Guest

```http
POST /guest/init
Content-Type: application/json
```

Body:

```json
{
  "installId": "550e8400-e29b-41d4-a716-446655440000",
  "installSecret": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

Response payload inside envelope:

```json
{
  "guestId": "550e8400-e29b-41d4-a716-446655440000",
  "sessionToken": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "sessionTokenExpiresAt": "2026-09-25T12:00:00.000Z",
  "relinked": false,
  "installSecret": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

### Profile and Name

`GuestRepository` also supports:

- `GET /guest/me`
- `PATCH /guest/name`

Both use Bearer auth from `apiClient`.

---

## Notes

- `apiClient` automatically includes `Authorization` unless request config sets `auth: false`.
- `POST /guest/init` explicitly uses `{ auth: false }`.
- Guest identity is independent from the local fallback `user.id` in Zustand.
- Analytics uses guest id when available; otherwise it falls back to local generated user id.

---

## Related Documentation

- [Game Result Sync](./game-result-sync.md)
- [Leaderboard](./leaderboard.md)
- [Environment Variables](../setup/environment-variables.md)
