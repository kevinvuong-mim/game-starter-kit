# Environment Variables

## Overview

Tài liệu này mô tả các biến môi trường runtime của `game-starter-kit`. Vì project dùng Vite, các biến đọc trong client phải có prefix `VITE_`.

`src/game/config.ts` là nơi khai báo game identity: `id` và `replaySecret` đọc từ `.env` (`VITE_GAME_ID`, `VITE_REPLAY_SECRET`); `name`, `width`, `height`, `version` chỉnh trực tiếp trong file.

---

## Core

```env
VITE_APP_ENV=dev
VITE_GAME_ID=TUTUTHOI
VITE_REPLAY_SECRET=<64-char-sha256-hex>
```

| Variable             | Values                         | Default / Source     | Description                                                   |
| -------------------- | ------------------------------ | -------------------- | ------------------------------------------------------------- |
| `VITE_APP_ENV`       | `dev`, `staging`, `production` | `dev` khi chạy local | Chọn preset runtime trong `src/platform/core/config/index.ts` |
| `VITE_GAME_ID`       | string                         | Bắt buộc             | Game id dùng ở frontend và backend                            |
| `VITE_REPLAY_SECRET` | string                         | Bắt buộc             | Secret replay dùng để xác thực với backend                    |

Preset API URL trong code:

| Env          | API URL                                |
| ------------ | -------------------------------------- |
| `dev`        | `http://localhost:3000/api`            |
| `staging`    | `https://staging-api.studio.games/api` |
| `production` | `https://api.studio.games/api`         |

Production/staging nên dùng HTTPS.

---

## IAP

```env
VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=
```

| Variable                          | Values               | Description                                   |
| --------------------------------- | -------------------- | --------------------------------------------- |
| `VITE_IAP_PROVIDER`               | `mock`, `revenuecat` | Bật IAP service theo `ENV_CONFIGS.iapEnabled` |
| `VITE_REVENUECAT_ANDROID_API_KEY` | string               | Public API key cho Android RevenueCat         |
| `VITE_REVENUECAT_IOS_API_KEY`     | string               | Public API key cho iOS RevenueCat             |

Nếu `VITE_IAP_PROVIDER=revenuecat` nhưng không đủ điều kiện native + API key, app fallback sang mock provider. IAP service vẫn chỉ chạy khi `ENV_CONFIGS[env].iapEnabled` là `true`.

---

## Ads

```env
VITE_ADS_PROVIDER=mock
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=
```

| Variable                    | Values          | Description                                             |
| --------------------------- | --------------- | ------------------------------------------------------- |
| `VITE_ADS_PROVIDER`         | `mock`, `admob` | Web/dev dùng mock; native + `admob` dùng AdMob provider |
| `VITE_ADMOB_ANDROID_APP_ID` | string          | Android AdMob app id cho native build                   |
| `VITE_ADMOB_IOS_APP_ID`     | string          | iOS AdMob app id cho native build                       |

Nếu app id của platform hiện tại không có giá trị, code sẽ coi platform đó là testing và dùng Google sample ad units.

Production ad unit IDs chỉ cần khi muốn dùng ad unit thật:

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
VITE_ANALYTICS_PROVIDER=firebase
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_MEASUREMENT_ID=
```

| Env                                | Analytics                                                 |
| ---------------------------------- | --------------------------------------------------------- |
| `VITE_ANALYTICS_PROVIDER=console`  | Ghi event ra console                                      |
| `VITE_ANALYTICS_PROVIDER=firebase` | Dùng Firebase Analytics nếu cấu hình đủ `VITE_FIREBASE_*` |

Analytics service chỉ được enable khi `ENV_CONFIGS[env].analyticsEnabled` là `true`.

---

## Example `.env`

```env
VITE_APP_ENV=dev
VITE_GAME_ID=TUTUTHOI
VITE_REPLAY_SECRET=<64-char-sha256-hex>

VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=

VITE_ADS_PROVIDER=mock
VITE_ANALYTICS_PROVIDER=console
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=
```

---

## Related Documentation

- [Game Configuration](./game-configuration.md)
- [Mobile Build](./mobile-build.md)
- [Mobile Build](./mobile-build.md)
