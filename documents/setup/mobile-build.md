# Mobile Build

## Overview

`game-starter-kit` dùng Capacitor 6 để build native Android/iOS. Thư mục `android/` và `ios/` có thể được generate lại bằng scripts, còn native templates nằm trong `native/` và được apply sau `cap sync`.

---

## Scripts

| Command                   | Description                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| `npm run build`           | Typecheck bằng `tsc --noEmit` rồi Vite build vào `dist/`                                                 |
| `npm run cap:add:android` | Ensure Android platform tồn tại, qua `scripts/native-ops.mjs`                                            |
| `npm run cap:add:ios`     | Ensure iOS platform tồn tại, qua `scripts/native-ops.mjs`                                                |
| `npm run cap:sync`        | Chạy `cap sync`                                                                                          |
| `npm run cap:android`     | Mở Android Studio                                                                                        |
| `npm run cap:ios`         | Mở Xcode                                                                                                 |
| `npm run assets:generate` | Generate icon/splash bằng `capacitor-assets`                                                             |
| `npm run build:android`   | Full Android pipeline: build web, ensure platform, generate assets, sync Android, apply native templates |
| `npm run build:ios`       | Full iOS pipeline: build web, ensure platform, generate assets, sync iOS, apply native templates         |

---

## Capacitor Config

File chính: `capacitor.config.ts`.

Current config:

| Field                                           | Value                       |
| ----------------------------------------------- | --------------------------- |
| `appId`                                         | `com.studio.gamestarterkit` |
| `appName`                                       | `Game Starter Kit`          |
| `webDir`                                        | `dist`                      |
| `server.androidScheme`                          | `https`                     |
| `SplashScreen.launchAutoHide`                   | `false`                     |
| `SplashScreen.backgroundColor`                  | `#6b97b2`                   |
| `StatusBar.overlaysWebView`                     | `true`                      |
| `plugins.PushNotifications.presentationOptions` | `alert`, `badge`, `sound`   |

Khi tạo game mới, đổi ít nhất:

- `appId`
- `appName`
- Splash/icon assets trong `resources/` hoặc input của `capacitor-assets`

---

## Native Patch Flow

`build:android` và `build:ios` được triển khai bởi `scripts/native-ops.mjs`.

### Android (`build:android`)

```bash
npm run build
# cap add android (nếu chưa có android/)
npm run assets:generate
npx cap sync android
node scripts/apply-android-native.mjs
```

### iOS (`build:ios`)

```bash
npm run build
# cap add ios (nếu chưa có ios/)
npm run assets:generate
node scripts/apply-ios-native.mjs pre-sync   # pin UMP trước pod install
npx cap sync ios
node scripts/apply-ios-native.mjs            # post-sync: templates + AdMob plist
```

Các script trong `scripts/` merge template từ `native/` để giữ native changes repeatable sau mỗi lần regenerate platform.

**Firebase / FCM:** `apply-android-native.mjs` và `apply-ios-native.mjs` cũng copy `google-services.json` / `GoogleService-Info.plist`, permissions notification, và iOS `AppDelegate.swift` khi push enabled. Chi tiết: [Firebase Native Setup](./firebase-native.md).

Hướng dẫn chi tiết build + chạy emulator/simulator (CLI & IDE): [Emulator and Simulator](../build/emulator-and-simulator.md).

---

## Runtime Native Behavior

Bootstrap native nằm ở `src/platform/bootstrap/capacitor.ts`.

Các event/lifecycle chính:

- `app:ready` → hide splash screen.
- Native app state change → emit `app:pause` / `app:resume`.
- Back button native → emit `app:back`.
- `app:resume` cũng kích hoạt game sync flush, mission reset checks, daily reward checks, và **notification heartbeat / local schedule reconcile** qua controllers.

---

## Release Notes

- Bật AdMob thật bằng `VITE_ADS_PROVIDER=admob` và App ID theo platform.
- Bật RevenueCat bằng `VITE_IAP_PROVIDER=revenuecat`, và API key theo platform.
- Bật push: copy Firebase native config files + `VITE_FIREBASE_*` + backend `FIREBASE_*` (xem [firebase-native.md](./firebase-native.md)).
- Chọn API URL theo `VITE_APP_ENV` trong `src/platform/core/config/index.ts`.
- Đảm bảo `VITE_GAME_ID` / `src/game/config.ts` khớp `GameId` enum trên `game-api`.

---

## Related Documentation

- [Firebase Native Setup](./firebase-native.md)
- [Notifications](../modules/notifications.md)
- [Emulator and Simulator](../build/emulator-and-simulator.md)
- [Environment Variables](./environment-variables.md)
- [Runtime Architecture](../architecture/runtime-architecture.md)
