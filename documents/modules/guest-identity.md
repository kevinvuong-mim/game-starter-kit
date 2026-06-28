# Guest Identity

## Overview

Guest identity quản lý anonymous player cho `api-starter-kit`. Client persist `installId`; backend trả cùng `guestId` cho cùng một cài đặt app.

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
| `game_install_id` | UUID install id, persist để lấy lại cùng guest |

`installId` được giữ lại khi clear guest id để lần init sau vẫn lấy lại cùng guest.

---

## Init Flow

`App.init()` gọi `guest.init()` trong boot sequence.

`guest.init()`:

1. Load `guestId` từ Preferences.
2. Không gọi network trong init.

---

## Lazy Guest Creation

Network chỉ xảy ra khi code gọi `guest.ensureGuestId()`.

Flow:

1. Nếu đã có valid `guestId` → return.
2. Nếu chưa có guest → `createGuest()`.
3. `GuestRepository.ensureInstallId()` tạo UUID install id nếu chưa có.
4. Call `POST /guest/init` với `{ installId }`.
5. Save `guestId`.

`ensureGuestId()` trả `null` nếu offline hoặc create guest thất bại, để game vẫn chạy offline.

---

## Re-init

`guest.reinit()` clear cached `guestId` nhưng giữ `installId`, rồi gọi lại `/guest/init` để nhận lại cùng guest cho cài đặt hiện tại.

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
  "installId": "550e8400-e29b-41d4-a716-446655440000"
}
```

Response payload inside envelope:

```json
{
  "guestId": "550e8400-e29b-41d4-a716-446655440000",
  "relinked": false
}
```

### Profile and Name

`GuestRepository` also supports:

- `GET /guest/me?guestId=...`
- `PATCH /guest/name` body `{ guestId, name }`

---

## Notes

- Guest APIs explicitly use `{ auth: false }`.
- Guest identity is independent from the local fallback `user.id` in Zustand.
- Analytics uses guest id when available; otherwise it falls back to local generated user id.

---

## Related Documentation

- [Game Result Sync](./game-result-sync.md)
- [Leaderboard](./leaderboard.md)
- [Environment Variables](../setup/environment-variables.md)
