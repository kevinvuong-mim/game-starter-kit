# Mobile Build

## Overview

`game-starter-kit` dùng Capacitor 6 để build native Android/iOS. Thư mục `android/` và `ios/` có thể được generate lại bằng scripts, còn native templates nằm trong `native/` và được apply sau `cap sync`.

---

## Scripts

| Command | Description |
| ------- | ----------- |
| `npm run build` | Typecheck bằng `tsc --noEmit` rồi Vite build vào `dist/` |
| `npm run cap:add:android` | Add Android platform nếu chưa có `android/` |
| `npm run cap:add:ios` | Add iOS platform nếu chưa có `ios/` |
| `npm run cap:sync` | Chạy `cap sync` |
| `npm run cap:android` | Mở Android Studio |
| `npm run cap:ios` | Mở Xcode |
| `npm run assets:generate` | Generate icon/splash bằng `capacitor-assets` |
| `npm run build:android` | Build web, add platform nếu thiếu, generate assets, sync Android, apply Android native templates |
| `npm run build:ios` | Build web, add platform nếu thiếu, generate assets, sync iOS, apply iOS native templates |

---

## Capacitor Config

File chính: `capacitor.config.ts`.

Current config:

| Field | Value |
| ----- | ----- |
| `appId` | `com.studio.gamestarterkit` |
| `appName` | `Game Starter Kit` |
| `webDir` | `dist` |
| `server.androidScheme` | `https` |
| `SplashScreen.launchAutoHide` | `false` |
| `SplashScreen.backgroundColor` | `#6b97b2` |
| `StatusBar.overlaysWebView` | `true` |

Khi tạo game mới, đổi ít nhất:

- `appId`
- `appName`
- Splash/icon assets trong `resources/` hoặc input của `capacitor-assets`

---

## Native Patch Flow

`build:android` chạy:

```bash
npm run build
npm run cap:add:android
npm run assets:generate
cap sync android
node scripts/apply-android-native.mjs
```

`build:ios` chạy tương tự với `apply-ios-native.mjs`.

Các script trong `scripts/` merge template từ `native/` để giữ native changes repeatable sau mỗi lần regenerate platform.

---

## Runtime Native Behavior

Bootstrap native nằm ở `src/platform/bootstrap/capacitor.ts`.

Các event/lifecycle chính:

- `app:ready` → hide splash screen.
- Native app state change → emit `app:pause` / `app:resume`.
- Back button native → emit `app:back`.
- `app:resume` cũng kích hoạt game sync flush và mission reset checks qua controllers.

---

## Release Notes

- Bật AdMob thật bằng `VITE_ADS_PROVIDER=admob` và `VITE_ADMOB_TESTING=false`.
- Bật RevenueCat bằng `VITE_IAP_ENABLED=true`, `VITE_IAP_PROVIDER=revenuecat`, và API key theo platform.
- Kiểm tra `VITE_API_URL` trỏ về HTTPS API production/staging.
- Đảm bảo backend có row `games` khớp `src/game/config.ts`.

---

## Related Documentation

- [Environment Variables](./environment-variables.md)
- [Ads and IAP](../integrations/ads-and-iap.md)
- [Runtime Architecture](../architecture/runtime-architecture.md)
