# Notifications

Module quản lý **push notification** (FCM) và **local notification** (daily reward reminder) trên native. Web platform bỏ qua toàn bộ flow.

## Phạm vi

| Loại                          | Nguồn              | Khi nào                                                           |
| ----------------------------- | ------------------ | ----------------------------------------------------------------- |
| Push — Top 100 entered/exited | Backend FCM        | User vào/ra Top 100 sau submit score                              |
| Push — Saturday rank          | Backend FCM (cron) | 9:00 Thứ 7 (Asia/Ho_Chi_Minh), chỉ guest có rank trên leaderboard |
| Local — Daily reward          | Client schedule    | 07:00 ngày hôm sau sau khi claim; hủy nếu có thể claim            |

Push cần Firebase native + backend `FIREBASE_*`. Local chỉ cần `@capacitor/local-notifications`.

## Feature flags

Preset trong `src/platform/core/config/notification-env.json`, merge vào `ENV_CONFIGS` tại `src/platform/core/config/index.ts`:

| Env          | Push | Local |
| ------------ | ---- | ----- |
| `dev`        | off  | on    |
| `staging`    | on\* | on    |
| `production` | on\* | on    |

\* Push chỉ bật khi native + đủ `VITE_FIREBASE_*` (xem [Firebase Native Setup](../setup/firebase-native.md)).

## File chính

| File                               | Vai trò                                                                |
| ---------------------------------- | ---------------------------------------------------------------------- |
| `notification.service.ts`          | Orchestrator: init, tap handler, daily reward reconcile                |
| `push-notification.service.ts`     | Capacitor PushNotifications, đăng ký token lên API                     |
| `local-notification.service.ts`    | Schedule/cancel daily reward reminder                                  |
| `notification.repository.ts`       | `POST/PATCH/DELETE /devices`, heartbeat                                |
| `notification.controller.ts`       | Bind lifecycle: `guest.onReady`, `app:resume`, `daily:claim`, settings |
| `notification.model.ts`            | Types, routes, `resolveNotificationRoute()`                            |
| `navigation/navigation.service.ts` | In-app navigation + pending queue (cold start)                         |

## Init flow

1. `App.init()` → `notificationController.bind(events)`.
2. `guest.onReady` → `notificationService.initialize()`.
3. Push: xin quyền → `PushNotifications.register()` → listener `registration` → `POST /api/devices`.
4. Local: `LocalNotifications.requestPermissions()`.

`initialize()` chỉ chạy trên `Capacitor.isNativePlatform()`.

## Device token lifecycle (client)

```
Permission granted → FCM token
  → POST /api/devices (lần đầu)
  → PATCH /api/devices (token refresh hoặc đổi locale)
  → PATCH /api/devices/heartbeat (app resume)
  → DELETE /api/devices (unregister — API có sẵn, chưa gọi từ UI)
```

State local: key `notification-state-v1` (`lastRegisteredToken`, `permissionGranted`).

## Tap notification → màn trong app

**Không dùng deeplink URL.** Backend gửi FCM `data: { type, route }`; local notification gắn `extra: { type, route }`.

| `type`                                                 | Scene mở      |
| ------------------------------------------------------ | ------------- |
| `top_100_entered` / `top_100_exited` / `saturday_rank` | `Leaderboard` |
| `daily_reward`                                         | `DailyReward` |
| (mặc định)                                             | `Home`        |

Luồng:

1. Push: `pushNotificationActionPerformed` → `notificationService.handleNotificationTap()`.
2. Local: `localNotificationActionPerformed` → `navigationService.navigateToScene()`.
3. `resolveNotificationRoute(type, route)` → scene key Phaser.
4. Navigate với `{ returnTo: 'Home' }`.

### Cold start (pending navigation)

Khi app bị kill, tap notification có thể tới **trước** khi Phaser sẵn sàng. `navigationService` **defer** payload cho đến `boot:preload-complete`:

1. Tap sớm → lưu `pending` (không navigate).
2. `PreloadScene.create()` emit `boot:preload-complete`.
3. `navigationService` consume pending → mở scene đích (hoặc `Home`).

Capacitor giữ event tap (`retainUntilConsumed`) cho đến khi JS listener bind — không mất event, chỉ cần defer navigate.

## Events liên quan

| Event                          | Handler                                                          |
| ------------------------------ | ---------------------------------------------------------------- |
| `app:resume`                   | Push: refresh token + heartbeat; local: reconcile daily schedule |
| `daily:claim`                  | Schedule local reminder ngày hôm sau                             |
| `settings:change` (`language`) | Push: `PATCH /api/devices` với locale mới                        |
| `boot:preload-complete`        | Resolve pending navigation sau preload assets                    |

## API backend

Xem `game-api/documents/apis/devices.md`.

## Related Documentation

- [Firebase Native Setup](../setup/firebase-native.md)
- [Environment Variables](../setup/environment-variables.md)
- [Runtime Architecture](../architecture/runtime-architecture.md)
