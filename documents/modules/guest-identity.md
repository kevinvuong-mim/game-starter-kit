# Guest identity

Guest identity quản lý anonymous player cho `game-api`.

## Triết lý

- Mỗi lần cài app = một guest mới trên server.
- Không relink khi uninstall/clear data.
- `secretToken` vĩnh viễn — không TTL, không rotate.

## Storage

| Key         | Provider                                            | Nội dung                                            |
| ----------- | --------------------------------------------------- | --------------------------------------------------- |
| `gsk:guest` | Capacitor Preferences (native) / localStorage (web) | `{ guestId, secretToken, name?, nameSyncPending? }` |

## `guest.init()` flow

1. Đọc `gsk:guest` từ storage.
2. Nếu có → `apiClient.setAuthToken(secretToken)`, xong.
3. Nếu không → `POST /api/guest/init` body `{ gameId }`.
4. Lưu `{ guestId, secretToken }`, gọi `apiClient.setAuthToken`.

Nếu offline ở bước 3, guest ở trạng thái `pending` và tự retry khi network online (`@capacitor/network` trên native, `window.online` trên web).

Khi API trả 401, `guest.recoverFromUnauthorized()`:

- Xóa credentials cũ (`gsk:guest`) và reset notification state (`notification-state-v1`)
- **Giữ** queue `game-sync:pending` — lần flush sau sẽ gắn `guestId` mới và ký lại HMAC
- Tạo guest mới qua `init()`, rồi re-bind FCM device token cho guest mới
- `ApiClient` **không** replay request cũ sau recovery (tránh HMAC ký với guest cũ)

`init()` và `recoverFromUnauthorized()` dùng mutex để tránh race khi retry song song.

## IAP linking

Khi guest trở thành `ready` (kể cả sau offline retry), `App.ts` gọi `iap.linkGuestUser(guestId)` → RevenueCat adapter `Purchases.logIn({ appUserID })` và sync entitlements từ server.

## Offline name sync

Đổi tên qua `guest.updateName()`:

1. Cập nhật local ngay (`displayName` trong store + `name` trong `gsk:guest`).
2. Set `nameSyncPending: true`.
3. Gọi `PATCH /api/guest/name` khi online.

`guest.controller.ts` gọi `flushPendingName()` khi:

- Sau `saveService.loadLocal()` trong `App.init` (tránh wipe progress)
- `app:resume`
- `guest.onReady` (sau hydrate)
- `window.online` (web)
- `@capacitor/network` reconnect (native)

`saveLocal()` bị bỏ qua nếu gọi trước `loadLocal()` (boot race guard).

Sau sync thành công: `nameSyncPending: false`.

## Endpoints

### `POST /api/guest/init`

Body:

```json
{ "gameId": "FRULOOP" }
```

Response (`data`):

```json
{
  "guestId": "uuid",
  "gameId": "FRULOOP",
  "secretToken": "raw-token"
}
```

### `PATCH /api/guest/name`

Header: `Authorization: Bearer <secretToken>`

Body:

```json
{ "name": "PlayerOne" }
```

Client trim tên và từ chối chuỗi rỗng trước khi gửi. Backend giới hạn tên ở 1–32 ký tự.

Backend contract đầy đủ: [Guest API](../../../game-api/documents/apis/guest.md).
