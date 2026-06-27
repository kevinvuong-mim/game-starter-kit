# Environment Variables

## Overview

Tài liệu này mô tả các biến môi trường runtime của `game-starter-kit`. Vì project dùng Vite, các biến đọc trong client phải có prefix `VITE_`.

Game identity (`gameId`, `maxScore`, `replaySecret`, size, version) nằm trong `src/game/config.ts`, không lấy từ `.env`.

---

## Core

```env
VITE_APP_ENV=dev
VITE_API_URL=http://localhost:3000/api
```

| Variable | Values | Default / Source | Description |
| -------- | ------ | ---------------- | ----------- |
| `VITE_APP_ENV` | `dev`, `staging`, `production` | `dev` khi chạy local | Chọn preset runtime trong `src/platform/core/config/index.ts` |
| `VITE_API_URL` | URL | Theo `VITE_APP_ENV` nếu bỏ trống | Override API base URL cho tất cả môi trường |

Preset API URL trong code:

| Env | API URL |
| --- | ------- |
| `dev` | `http://localhost:3000/api` |
| `staging` | `https://staging-api.studio.games/api` |
| `production` | `https://api.studio.games/api` |

Production/staging nên dùng HTTPS.

---

## IAP

```env
VITE_IAP_ENABLED=false
VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=
```

| Variable | Values | Description |
| -------- | ------ | ----------- |
| `VITE_IAP_ENABLED` | `true`, `false` | Bật/tắt IAP service ở runtime |
| `VITE_IAP_PROVIDER` | `mock`, `revenuecat` | Provider IAP; RevenueCat chỉ dùng khi chạy native và có API key |
| `VITE_REVENUECAT_ANDROID_API_KEY` | string | Public API key cho Android RevenueCat |
| `VITE_REVENUECAT_IOS_API_KEY` | string | Public API key cho iOS RevenueCat |

Nếu `VITE_IAP_ENABLED=true` nhưng không đủ điều kiện native + `revenuecat` + API key, app fallback sang mock provider.

---

## Ads

```env
VITE_ADS_PROVIDER=mock
VITE_ADMOB_TESTING=true
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=
```

| Variable | Values | Description |
| -------- | ------ | ----------- |
| `VITE_ADS_PROVIDER` | `mock`, `admob` | Web/dev dùng mock; native + `admob` dùng AdMob provider |
| `VITE_ADMOB_TESTING` | `true`, `false` | `true` dùng Google sample ad units |
| `VITE_ADMOB_ANDROID_APP_ID` | string | Android AdMob app id cho native build |
| `VITE_ADMOB_IOS_APP_ID` | string | iOS AdMob app id cho native build |

Production ad unit IDs chỉ cần khi `VITE_ADMOB_TESTING=false`:

```env
VITE_ADMOB_ANDROID_BANNER_ID=
VITE_ADMOB_ANDROID_INTERSTITIAL_ID=
VITE_ADMOB_ANDROID_REWARDED_ID=
VITE_ADMOB_ANDROID_APP_OPEN_ID=

VITE_ADMOB_IOS_BANNER_ID=
VITE_ADMOB_IOS_INTERSTITIAL_ID=
VITE_ADMOB_IOS_REWARDED_ID=
VITE_ADMOB_IOS_APP_OPEN_ID=
```

---

## Firebase Analytics

```env
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_MEASUREMENT_ID=
```

| Env | Analytics |
| --- | --------- |
| `dev` | `analyticsEnabled=false`; console provider only |
| `staging` | Firebase enabled nếu cấu hình đủ `VITE_FIREBASE_*` |
| `production` | Firebase enabled nếu cấu hình đủ `VITE_FIREBASE_*` |

---

## Example `.env`

```env
VITE_APP_ENV=dev
VITE_API_URL=http://localhost:3000/api

VITE_IAP_ENABLED=false
VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=

VITE_ADS_PROVIDER=mock
VITE_ADMOB_TESTING=true
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=
```

---

## Related Documentation

- [Game Configuration](./game-configuration.md)
- [Mobile Build](./mobile-build.md)
- [Ads and IAP](../integrations/ads-and-iap.md)
