# Deeplink setup

Dev là subdomain của prod (`dev.*` → `*`), nên **một bộ file** dùng chung cho cả hai — chỉ khác domain host.

| File (trong repo)            | Host trên mỗi domain                                      |
| ---------------------------- | --------------------------------------------------------- |
| `apple-app-site-association` | `https://<domain>/.well-known/apple-app-site-association` |
| `assetlinks.json`            | `https://<domain>/.well-known/assetlinks.json`            |

| Environment | Domain ví dụ                     |
| ----------- | -------------------------------- |
| Dev         | `dev.gamestarterkit.example.com` |
| Prod        | `gamestarterkit.example.com`     |

Upload **cùng nội dung** lên `.well-known/` của từng domain (HTTPS, không redirect).

## iOS (Universal Links)

1. Replace `TEAM_ID` trong `apple-app-site-association` bằng Apple Team ID.
2. Publish file giống nhau tại:
   - `https://dev.gamestarterkit.example.com/.well-known/apple-app-site-association`
   - `https://gamestarterkit.example.com/.well-known/apple-app-site-association`
3. Content-Type: `application/json` (không có extension `.json` trong URL).
4. Associated Domains entitlement được apply bởi `scripts/apply-ios-native.mjs` (cả hai host).

## Android (App Links)

1. Replace `sha256_cert_fingerprints` bằng SHA-256 của keystore (release và/hoặc debug nếu cần test).
2. Publish file giống nhau tại:
   - `https://dev.gamestarterkit.example.com/.well-known/assetlinks.json`
   - `https://gamestarterkit.example.com/.well-known/assetlinks.json`
3. Intent filters (cả hai host) được inject bởi `scripts/apply-android-native.mjs`.

## Custom URL Scheme

Default scheme: `gamestarterkit://`

Examples:

- `gamestarterkit://leaderboard`
- `https://dev.gamestarterkit.example.com/shop`
- `https://gamestarterkit.example.com/daily-reward`

## App flow

```
Deeplink URL
  → Capacitor App plugin (AppBridge)
  → DeepLinkService (pendingDeepLink on cold start)
  → EventBus (deeplink:received / deeplink:open)
  → navigationService.navigateToScene()
  → Phaser Scene
```

Cold start: `getLaunchUrl()` chạy trước Phaser boot; destination defer qua `navigationService` pending tới `PreloadScene`.

## Defaults (không cần `.env`)

| Setting       | Default                          | Override (khi clone game) |
| ------------- | -------------------------------- | ------------------------- |
| Custom scheme | `gamestarterkit`                 | `VITE_DEEPLINK_SCHEME`    |
| Dev host      | `dev.gamestarterkit.example.com` | `VITE_DEEPLINK_HOST_DEV`  |
| Prod host     | `gamestarterkit.example.com`     | `VITE_DEEPLINK_HOST_PROD` |

Defaults nằm trong `src/platform/modules/deep-link/deep-link.config.ts` và `scripts/deeplink-config.mjs`. Host active theo `VITE_APP_ENV` (production → prod host, còn lại → dev host).

AASA / `assetlinks.json`: sửa trực tiếp `documents/deeplink/` (`TEAM_ID`, package name, SHA-256 fingerprint) rồi upload lên server — không qua `.env`.
