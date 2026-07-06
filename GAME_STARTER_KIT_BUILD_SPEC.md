# BUILD SPEC — game-starter-kit

## 0. Tổng quan

`game-starter-kit` là starter kit production-grade cho hyper-casual / casual mobile games. Mô hình clone-per-game: mỗi game = một repo riêng, clone từ kit này.

| Layer        | Công nghệ                                               |
| ------------ | ------------------------------------------------------- |
| Game Engine  | Phaser 3.87                                             |
| Mobile shell | Capacitor 6                                             |
| Language     | TypeScript 5.7 (strict)                                 |
| Bundler      | Vite 6                                                  |
| State        | Zustand 5 (vanilla, in-memory)                          |
| Storage      | IndexedDB (web) / Capacitor Preferences (native)        |
| Networking   | Fetch API + REST envelope (NestJS-compatible)           |
| Analytics    | Console (dev) + Firebase Analytics 12                   |
| Push         | `@capacitor/push-notifications` 6 (staging/prod native) |
| Local notif  | `@capacitor/local-notifications` 6 (daily reward)       |
| Ads          | Mock (web/dev) + AdMob @capacitor-community/admob 6     |
| IAP          | Mock + RevenueCat @revenuecat/purchases-capacitor 9     |

Node.js: `>= 20`

Backend companion: `game-api` — `VITE_GAME_ID` (đọc qua `src/game/config.ts`) phải khớp với `GameId enum` trên backend, và `VITE_REPLAY_SECRET` phải khớp `GAME_CONFIG[gameId].replaySecret` trên backend.

---

## 1. Kiến trúc 5 lớp

```text
┌─────────────────────────────────────────────┐
│            GAME LAYER (src/game/)            │
│  config / scenes / utils — gameplay only     │
├─────────────────────────────────────────────┤
│         PLATFORM UI (src/platform/ui/)       │
│  panels / hud / toast / audio / button / screen │
├─────────────────────────────────────────────┤
│      PLATFORM MODULES (src/platform/modules/)│
│  i18n shop missions leaderboard daily-rewards│
│  notifications navigation save settings guest│
│  game-sync ads iap                           │
├─────────────────────────────────────────────┤
│        PLATFORM CORE (src/platform/core/)    │
│  events state config storage api analytics   │
│  advertising error services utils            │
├─────────────────────────────────────────────┤
│     BOOTSTRAP (src/platform/bootstrap/)      │
│  App GameEngine analytics ads iap capacitor  │
└─────────────────────────────────────────────┘
```

### Nguyên tắc thiết kế

| Nguyên tắc         | Triển khai                                          |
| ------------------ | --------------------------------------------------- |
| Clone per game     | Một repo = một game                                 |
| Event-driven       | Game chỉ emit qua EventBus; ESLint enforce boundary |
| Data-driven        | Shop catalog, missions trong JSON                   |
| Offline-first      | Local queue (game-sync), leaderboard cache          |
| Single persistence | SaveService → durable storage; store in-memory only |
| Provider pattern   | Ads/Analytics/IAP swappable (mock ↔ production)     |
| Mobile performance | Object pooling, lazy locale chunks, 60 FPS target   |

---

## 2. Cây thư mục đầy đủ

```text
game-starter-kit/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── ARCHITECTURE.md
├── GAME_STARTER_KIT_BUILD_SPEC.md
├── README.md
├── capacitor.config.ts
├── documents/
│   ├── architecture/runtime-architecture.md
│   ├── build/emulator-and-simulator.md
│   ├── modules/
│   │   ├── game-result-sync.md
│   │   ├── guest-identity.md
│   │   ├── leaderboard.md
│   │   └── notifications.md
│   └── setup/
│       ├── environment-variables.md
│       ├── firebase-native.md
│       ├── game-configuration.md
│       └── mobile-build.md
├── native/
│   ├── firebase/              # google-services.json, GoogleService-Info.plist (gitignored)
│   ├── android/
│   └── ios/                   # AppDelegate.swift, App.entitlements templates
├── eslint.config.js
├── index.html
├── package.json
├── public/assets/images/
├── public/assets/audio/
├── resources/
│   └── logo.webp
├── scripts/
├── src/
│   ├── main.ts
│   ├── vite-env.d.ts
│   ├── game/
│   └── platform/
├── tsconfig.json
└── vite.config.ts
```

Gitignored (không commit, tạo local):

```text
node_modules/
dist/
android/
ios/
.env
.vite/
coverage/
```

---

# 3. Root config files (tạo chính xác)

## 3.1 package.json

```json
{
  "name": "game-starter-kit",
  "version": "1.0.0",
  "description": "Production-grade starter kit for hyper-casual / casual mobile games",
  "type": "module",
  "private": true
}
```

Scripts:

```text
dev
build
preview
cap:sync
cap:add:android  # via scripts/native-ops.mjs ensure android
cap:add:ios      # via scripts/native-ops.mjs ensure ios
cap:android
cap:ios
assets:generate
build:android    # via scripts/native-ops.mjs build android
build:ios        # via scripts/native-ops.mjs build ios
run:android      # build + emulator install + launch
run:ios          # build + simulator install + launch
lint
game:verify-config
lint:fix
format
format:check
```

Dependencies:

```text
@capacitor-community/admob
@capacitor/app
@capacitor/core
@capacitor/haptics
@capacitor/network
@capacitor/preferences
@capacitor/local-notifications
@capacitor/push-notifications
@capacitor/splash-screen
@capacitor/status-bar
@revenuecat/purchases-capacitor
firebase
phaser
zustand
```

DevDependencies:

```text
@capacitor/android
@capacitor/assets
@capacitor/cli
@capacitor/ios
@eslint/js
@types/node
eslint
eslint-config-prettier
prettier
typescript
typescript-eslint
vite
```

Engine:

```json
{
  "node": ">=20.0.0"
}
```

---

## 3.2 tsconfig.json

### include

```text
["src", "vite.config.ts"]
```

### exclude

```text
["dist", "node_modules"]
```

### compilerOptions

```text
strict: true
noEmit: true
target: ES2022
module: ESNext
moduleResolution: bundler
allowImportingTsExtensions: true
resolveJsonModule: true
noUnusedLocals: true
noUnusedParameters: true
isolatedModules: true
skipLibCheck: true
esModuleInterop: true
forceConsistentCasingInFileNames: true
lib: ["DOM","ES2022","DOM.Iterable"]
```

### paths

```text
@game/* → src/game/*
@platform/ui/* → src/platform/ui/*
@platform/core/* → src/platform/core/*
@platform/modules/* → src/platform/modules/*
@platform/bootstrap/* → src/platform/bootstrap/*
```

---

## 3.3 vite.config.ts

### Server

```text
host: true
port: 5173
```

### Aliases (bare)

```text
@game
@platform/ui
@platform/core
@platform/modules
@platform/bootstrap
```

### Build

```text
outDir: dist
sourcemap: true
target: es2022
chunkSizeWarningLimit: 1600
# Lý do: Phaser 3 minified ~1MB+, giới hạn mặc định 500kb sẽ false-positive
```

### manualChunks

```text
phaser → phaser
zustand → vendor
i18n locales → locales
```

---

## 3.4 capacitor.config.ts

```ts
const config: CapacitorConfig = {
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  appName: 'Game Starter Kit',
  appId: 'com.studio.gamestarterkit',
  plugins: {
    StatusBar: {
      overlaysWebView: true,
    },
    SplashScreen: {
      showSpinner: false,
      launchAutoHide: false,
      backgroundColor: '#6b97b2',
    },
    PushNotifications: {
      presentationOptions: ['alert', 'badge', 'sound'],
    },
  },
};
```

---

## 3.5 eslint.config.js

Flat config với `typescript-eslint`

### Extends

```text
eslint.configs.recommended
tseslint.configs.recommended
eslintConfigPrettier
```

### Ignores

```text
ios/**
dist/**
android/**
node_modules/**
```

### Rule

```text
@typescript-eslint/no-unused-vars
argsIgnorePattern: '^_'
varsIgnorePattern: '^_'
```

### src/game/\*\*/\*.ts cấm import

```text
@platform/modules/*
@platform/core/advertising
@platform/core/config
@platform/core/utils
@platform/core/error
@platform/core/state
@platform/core/storage
@platform/core/api
@platform/core/analytics
```

Message hướng dẫn dùng `eventBus`.

---

## 3.6 .prettierrc

```json
{
  "semi": true,
  "tabWidth": 2,
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "es5"
}
```

---

## 3.7 .prettierignore

```text
ios
dist
*.lock
android
node_modules
```

---

## 3.8 .gitignore

```text
.env
ios/
dist/
*.log
.env.*
.vite/
*.local
android/
.DS_Store
coverage/
node_modules/
!.env.example
playwright-report/
```

---

## 3.9 index.html

- `lang="en"`
- viewport `viewport-fit=cover`
- `user-scalable=no`
- `theme-color=#1a1a2e`

Fonts:

```text
Fredoka (400,500,600,700)
Nunito Sans (400,500,600,700)
```

CSS reset:

```text
html, body full bleed
overflow: hidden
touch-action: none
background: #1a1a2e
-webkit-tap-highlight-color: transparent
```

Container:

```text
#game-container → 100% × 100%
```

Entry:

```html
<script type="module" src="/src/main.ts"></script>
```

---

## 3.10 .env.example

```bash
# App
VITE_APP_ENV=dev
VITE_GAME_ID=FRULOOP

# Game — phải khớp với GameId enum và GAME_CONFIG trên backend
# VITE_GAME_ID được đọc trong src/game/config.ts
# VITE_REPLAY_SECRET KHÔNG được commit; lấy từ backend team
VITE_REPLAY_SECRET=

# IAP
VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=

# Ads
VITE_ADS_PROVIDER=mock

# Analytics
VITE_ANALYTICS_PROVIDER=console

# Firebase
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

---

## 4. Path aliases

| Alias (tsconfig /\*)   | Vite bare alias     | Path                      |
| ---------------------- | ------------------- | ------------------------- |
| @game/\*               | @game               | src/game/\*               |
| @platform/ui/\*        | @platform/ui        | src/platform/ui/\*        |
| @platform/core/\*      | @platform/core      | src/platform/core/\*      |
| @platform/modules/\*   | @platform/modules   | src/platform/modules/\*   |
| @platform/bootstrap/\* | @platform/bootstrap | src/platform/bootstrap/\* |

---

# 5. Entry point & bootstrap flow

## 5.1 src/main.ts

```ts
import { gameEngine } from '@platform/bootstrap/GameEngine';

async function main(): Promise<void> {
  try {
    await gameEngine.bootstrap();
    window.addEventListener('beforeunload', () => {
      gameEngine.destroy();
    });
  } catch (error) {
    console.error('Failed to start game platform:', error);
  }
}

main();
```

---

## 5.2 GameEngine.bootstrap() sequence

```text
setupGlobalErrorHandlers()

setConfig(createConfig({
  gameId: gameConfig.id,
  replaySecret: gameConfig.replaySecret   // inject từ env, không hardcode
}))

refreshServicesFromConfig()

await app.init()

await initCapacitorPlugins()

Load fonts:
- 16px "Fredoka"
- 16px "Nunito Sans"

await document.fonts.ready

Create Phaser game với gameScenes từ @game/scenes

toast.init(game)
soundManager.init(game)
navigationService.setGame(game)

Phaser config:
type: AUTO
parent: game-container
width/height từ gameConfig
backgroundColor: #1a1a2e
fps.target: 60
scale.mode: ENVELOP
scale.autoCenter: CENTER_BOTH
render:
  antialias: true
  pixelArt: false
  roundPixels: true
banner: config.debug
```

---

## 5.3 App.init() sequence

```text
Ensure user.id in store
→ generateId('user')
→ displayName = Player

registerAnalyticsProviders()

registerAdsProvider()

apiClient.setAuthRecoveryHandler(() => guest.recoverFromUnauthorized())

Promise.allSettled([
  i18n.init(),
  ads.init(),
  guest.init(),     // đọc token từ storage hoặc gọi API tạo mới (chỉ 1 lần duy nhất)
  analytics.init(),
  leaderboard.init()
])
// Dùng allSettled thay vì all: 1 service lỗi (đặc biệt guest.init() khi
// offline lúc mở app lần đầu) không được phép chặn các service độc lập
// khác (i18n, ads, analytics, leaderboard) — giữ đúng nguyên tắc Offline-first.
// Log riêng từng promise bị reject ra error/logger, không throw tiếp.

guest.onReady((guestId) => {
  analytics.setUserId(guestId);
});

analyticsUserId =
guest.getGuestId() ?? store.user.id

registerIapProvider(analyticsUserId)
...
```

### Xử lý lỗi `guest.init()` — degraded mode + auto-retry khi có mạng

`guest.init()` **không bao giờ throw ra ngoài** — tự bắt lỗi bên trong và luôn
resolve, để không chặn `App.init()`:

```text
guest.init():
  try:
    (đọc storage hoặc gọi POST /guest/init như mô tả ở Section 8)
    → thành công: set guestStatus = 'ready'
  catch (network/API lỗi):
    → set guestStatus = 'pending' (không có guestId/secretToken)
    → KHÔNG throw — resolve bình thường
    → log error qua logger, KHÔNG hiện lỗi chặn màn hình chơi
    → đăng ký lắng nghe @capacitor/network 'networkStatusChange'
       → khi connected = true lần đầu tiên sau đó: tự gọi lại
         guest.init() 1 lần trong nền (không chặn UI)
       → nếu vẫn lỗi: giữ nguyên guestStatus = 'pending', chờ lần
         networkStatusChange kế tiếp
```

Hệ quả khi `guestStatus = 'pending'`:

```text
- Gameplay, HUD, shop (currency local), missions, daily-rewards vẫn chạy
  bình thường 100% offline (không phụ thuộc guestId).
- game-sync: kết quả trận đấu vẫn được ghi vào local queue (game-sync)
  như bình thường — CHỈ hoãn gọi POST /results tới khi
  guestStatus chuyển sang 'ready' (không mất dữ liệu, không lỗi giả).
- leaderboard: hiển thị cache cục bộ (nếu có) hoặc trạng thái "chưa kết nối",
  không crash UI.
- analyticsUserId tạm dùng store.user.id; khi guest.init() thành công
  muộn hơn (qua auto-retry), gọi lại analytics.setUserId(guestId mới)
  để đồng bộ — chấp nhận đánh đổi: các event analytics phát trong lúc
  'pending' được gắn với store.user.id, không hồi tố gán lại guestId.
```

```text
registerIapProvider(analyticsUserId)

iap.initialize()
(catch errors)

Dynamic import ads module
→ adsModule.init()

analytics.setUserId(...)
analytics.setUserProperty(
  'game_id',
  config().gameId
)

saveService.loadLocal()

dailyRewards.init()
settings.init()
missions.init()

bindPlatformEvents()

dailyRewardController.bind(events)

Push unsubscribers:
leaderboardController.bind
gameSyncController.bind
bindAdsController
bindIapController
missionController.bind
notificationController.bind

bindLifecycle()
```

`guest.onReady` → `notificationService.initialize()` (native only, khi push/local enabled).

---

## 5.4 Scene flow

```text
Boot → Preload → Home (hoặc scene từ notification tap nếu pending)
                  ├→ Gameplay → GameOver → Home / Gameplay
                  ├→ Shop / Missions / Leaderboard / DailyReward
                  └→ Settings → HowToPlay / Legal
```

`PreloadScene.create()` emit `boot:preload-complete` → `navigationService` consume pending notification destination (cold start).

BootScene:

```text
emit analytics(SESSION_START)
emit app:ready
hide splash
request APP_START/HOME ads
```

gameScenes:

```ts
[
  BootScene,
  HomeScene,
  ShopScene,
  LegalScene,
  PreloadScene,
  GameplayScene,
  GameOverScene,
  MissionsScene,
  SettingsScene,
  HowToPlayScene,
  DailyRewardScene,
  LeaderboardScene,
];
```

---

# 6. Game layer (src/game/)

## 6.1 config.ts

`replaySecret` KHÔNG được hardcode trong source. Phải đọc từ `import.meta.env.VITE_REPLAY_SECRET`.

```ts
export interface GameConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  version: string;
  replaySecret: string;
}

export const gameConfig: GameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  name: 'Game Starter Kit',
  id: import.meta.env.VITE_GAME_ID ?? '',
  replaySecret: import.meta.env.VITE_REPLAY_SECRET ?? '',
};
```

> **Lưu ý quan trọng khi clone cho game mới:**
>
> 1. Đặt `VITE_GAME_ID` trong `.env` khớp `GameId` trên backend (ví dụ: `FRULOOP`).
> 2. Lấy `VITE_REPLAY_SECRET` từ backend team, điền vào file `.env` local và CI/CD secrets.
> 3. Không bao giờ commit giá trị thật của `VITE_REPLAY_SECRET`.
> 4. Chỉnh `name`, `width`, `height`, `version` trực tiếp trong `src/game/config.ts`.

---

## 6.2 utils/ObjectPool.ts

```text
Generic pool

constructor(
  factory,
  reset,
  initialSize = 10
)

Methods:
- warm()
- acquire()
- release(item)
- releaseAll()

Getters:
- activeCount
- poolSize
```

---

## 6.3 Scenes — hành vi mẫu

| Scene             | Key      | Hành vi                            |
| ----------------- | -------- | ---------------------------------- |
| BootScene         | Boot     | Particle → SESSION_START → Preload |
| PreloadScene      | Preload  | Progress → images + audio → Home   |
| HomeScene         | Home     | Background + navigation            |
| GameplayScene     | Gameplay | Tap-to-jump + HUD + events         |
| GameOverScene     | GameOver | Score + Retry/Home                 |
| Shop/Missions/... | wrapper  | Panel + Close                      |
| SettingsScene     | Settings | Language + sound + navigation      |

### Rules

✅ Allowed

```text
@platform/core/events
@game/*
@platform/ui/*
Phaser APIs
```

❌ Forbidden

```text
@platform/modules/*
@platform/core/api
@platform/core/storage
@platform/core/state
@platform/core/config
@platform/core/utils
@platform/core/error
@platform/core/advertising
@platform/core/analytics
```

---

# 7. Platform Core

## 7.1 EventBus

Singleton.

Methods:

```text
emit
on
off
once
clear
```

`emit()`:

```text
Promise.resolve()
.catch(console.error)
```

> **Lưu ý:** EventBus dùng fire-and-forget async. Subscriber throw lỗi sẽ bị catch và log ra console nhưng không làm crash emitter. Subscriber có side-effect quan trọng cần tự xử lý lỗi bên trong.

Event categories:

```text
jump
score:update
collect
coin:add
coin:spend
level:complete

app:*
game:*

shop:*

ad:*

analytics:*

error:report

settings:change

mission:*

leaderboard:*

daily:*

game:sync:*

game:synced
game:sync:dropped

iap:*

auth:*
```

AnalyticsEvents:

```text
session_start
session_end
game_start
game_over
level_start
level_complete
purchase
ad_reward
shop_open
daily_claim
mission_complete
```

---

## 7.2 State

Zustand vanilla.

Slices:

```text
user
currency
inventory
progress
settings
missions
dailyRewards
```

Actions:

```text
setUser
addCoins
spendCoins
addItem
removeItem
equipItem
setHighScore
incrementGamesPlayed
setCurrentLevel
updateSettings
updateMissionProgress
completeMission
claimMission
hydrate
reset
```

Exports:

```text
usePlatformStore
getStoreState
```

---

## 7.3 Config

RuntimeConfig:

```text
ads
iap
apiUrl
debug
gameId
replaySecret
adsEnabled
iapEnabled
firebase
analyticsEnabled
pushNotificationsEnabled
localNotificationsEnabled
```

`notification-env.json` merge per-env push/local flags. Push requires native + full `VITE_FIREBASE_*`.

ENV_CONFIGS:

```text
dev
staging
production
```

---

## 7.4 API

ApiClient:

```text
timeout: 15s

retries: 2

retryable:
429
500
502
503
504
```

> **Ngoại lệ — `POST /api/guest/init` KHÔNG được auto-retry:**
> Endpoint này không idempotent (mỗi lần gọi thành công = tạo 1 guest mới trên
> server, không có idempotency key). Nếu response bị mất giữa đường (timeout,
> 502/503/504) trong khi server đã tạo guest thành công, auto-retry sẽ tạo
> thêm 1 guest thứ hai độc lập — guest đầu tiên trở thành zombie row vĩnh viễn.
> `ApiClient` cần hỗ trợ cấu hình `retry: false` theo từng request, và
> `guest.init()` phải luôn gọi với cờ này tắt retry tự động:
>
> ```ts
> api.post('/guest/init', { gameId }, { auth: false, retries: 0 });
> ```
>
> Việc thử lại `guest.init()` sau khi thất bại được `guest` module tự quản lý
> theo chiến lược riêng (xem Section 8 → Guest → "Xử lý lỗi `guest.init()`"),
> không phải qua cơ chế retry chung của `ApiClient`.

### Interceptor — phục hồi khi token hết hiệu lực (401)

```text
Response interceptor bắt lỗi 401 (áp dụng cho mọi request có Bearer token,
trừ chính request POST /guest/init):

1. Xoá gsk:guest khỏi storage (guestId + secretToken cũ không còn hợp lệ)
2. Gọi lại guest.init() để tạo guest mới (không có "relink" — guest cũ mất luôn,
   đúng triết lý "mỗi lần cài app = một guest mới" đã định nghĩa ở Section 8)
3. Nếu guest.init() thành công → setAuthToken(token mới) → retry lại
   đúng 1 lần request gốc đã bị 401 với token mới
4. Nếu guest.init() cũng thất bại → propagate lỗi gốc lên caller,
   không retry thêm (tránh vòng lặp vô hạn 401 → init → 401 → init...)

Giới hạn: cơ chế này chỉ chạy tối đa 1 lần cho mỗi request gốc,
đánh dấu bằng flag nội bộ trên request (`_retried401: true`)
để không lặp lại nếu guest mới vẫn tiếp tục bị 401.

`ApiClient.setAuthRecoveryHandler()` đăng ký handler (gọi từ `App.init()`):
handler gọi `guest.recoverFromUnauthorized()` → clear `gsk:guest` → `guest.init()` lại.
```

Methods:

```text
get
post
put
patch
delete
interceptors
setBaseUrl
setAuthToken
```

Envelope (match backend response format):

```ts
{
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  path: string;
  timestamp: string;
}
```

---

## 7.5 Storage

```text
Providers:
memory
indexedDB
preferences
localStorage

Prefix:
gsk:

IndexedDB:
DB game-starter-kit
store kv
version 1
```

---

## 7.6 Analytics

```text
AnalyticsService
Multi-provider
Console
Firebase lazy-load
```

---

## 7.7 Advertising

DEFAULT_REMOTE_CONFIG:

```text
Cooldown:
app_open = 0
rewarded = 30
interstitial = 90
```

Placements:

```text
HOME
SHOP
LEADERBOARD
APP_START
EXTRA_LIFE
DOUBLE_COIN
GAME_OVER
```

Rewards:

```text
DOUBLE_COIN
EXTRA_LIFE
```

Providers:

```text
MockAdsProvider
AdMobAdsProvider
```

---

## 7.8 Error

```text
logger
errorBoundary
setupGlobalErrorHandlers
```

---

## 7.9 Services locator

```ts
services = {
  ads,
  iap,
  storage,
  analytics,
  api,
  events,
  config,
};
```

---

## 7.10 Utils

```text
generateId()
formatNumber()
time.ts
```

---

# 8. Platform Modules

Modules:

```text
i18n
shop
missions
leaderboard
daily-rewards
save
settings
guest
game-sync
notifications
navigation
ads
iap
```

### Notifications (native)

Feature flags: `src/platform/core/config/notification-env.json` (`pushNotificationsEnabled`, `localNotificationsEnabled`).

| Loại                    | Trigger client                             | API                                                       |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------- |
| Push Top 100 / Saturday | Backend FCM                                | `POST/PATCH /api/devices`, `PATCH /api/devices/heartbeat` |
| Local daily reward      | Sau `daily:claim`, schedule 07:00 ngày sau | —                                                         |

Tap notification → `resolveNotificationRoute(type, route)` → Phaser scene. **Không deeplink URL.** Cold start: defer tới `boot:preload-complete`.

Storage: `notification-state-v1` (`lastRegisteredToken`, `permissionGranted`).

Chi tiết: `documents/modules/notifications.md`, `documents/setup/firebase-native.md`.

### Shop catalog

```text
skin_blue
skin_gold
boost_double
remove_ads
```

### Guest

**Triết lý:** Mỗi lần cài app = một guest mới. Không relink khi uninstall/clear data. Behavior đồng nhất trên iOS và Android.

**`guest.init()` flow (gọi một lần trong `App.init()`):**

```text
Đọc { guestId, secretToken } từ Capacitor Preferences (key: gsk:guest)

→ Có rồi:
    Gọi api.setAuthToken(secretToken)
    Xong — KHÔNG gọi API

→ Không có:
    Gọi POST /api/guest/init
    Nhận { guestId, secretToken }
    Lưu vào Capacitor Preferences (key: gsk:guest)
    Gọi api.setAuthToken(secretToken)
```

> `secretToken` vĩnh viễn — không có TTL, không rotate. Mất khi uninstall/clear data app.

**`guestStatus`:** `'ready' | 'pending'`

- `'ready'`: có `guestId` + `secretToken` hợp lệ trong memory/storage
- `'pending'`: chưa có guest (offline lúc mở app lần đầu hoặc init thất bại)

**`guest.onReady(listener)`:** đăng ký callback khi `guestStatus` chuyển sang `'ready'` (dùng cho analytics userId và game-sync flush).

Endpoints:

```text
POST /api/guest/init
  Body: { gameId }
  # deviceId KHÔNG được gửi
  # Mỗi lần gọi là tạo guest mới trên server
  Response: { guestId, gameId, secretToken }

PATCH /api/guest/name
  Header: Authorization: Bearer <secretToken>
  Body: { name }
```

Storage key:

```text
gsk:guest → JSON { guestId: string, secretToken: string }
Provider: Capacitor Preferences (native) / localStorage (web)
```

### Game sync

Replay signature — phải khớp chính xác với backend:

```text
HMAC-SHA256(
  replaySecret,
  `${gameId}|${guestId}|${clientResultId}|${score}|${playedAt || ''}`
)
```

Endpoint:

```text
POST /api/results
  Header: Authorization: Bearer <secretToken>
  Body: { gameId, items: [{ clientResultId, score, playedAt, metadata, signature }] }
  Response: { success, insertedCount, message }
```

Limits:

```text
MAX_BATCH_SIZE = 50
MAX_SYNC_ATTEMPTS = 10
MAX_PENDING_RESULTS = 500
```

Chính sách khi vượt giới hạn:

```text
Vượt MAX_PENDING_RESULTS (500):
→ Drop item CŨ NHẤT trong queue theo thứ tự tạo (FIFO eviction)
  trước khi thêm item mới vào, để queue không bao giờ vượt 500.

Item retry đủ MAX_SYNC_ATTEMPTS (10) lần vẫn fail:
→ Bỏ hẳn item đó khỏi queue (không giữ lại chờ vô thời hạn).
→ Emit event `game:sync:dropped` kèm { clientResultId, attempts }
  để analytics/logger ghi nhận, tránh mất dấu hoàn toàn khi debug.

Signature được tính tại flush time (khi guest ready), không tính lúc queue
nếu chưa có guestId — tránh signature invalid với guestId rỗng.

Retry backoff (bổ sung): exponential backoff giữa các lần retry
(`BASE_SYNC_BACKOFF_MS` = 30s, `MAX_SYNC_BACKOFF_MS` = 30 phút),
lưu `nextAttemptAt` trên từng item.

Lưu ý: mỗi lần retry gửi lại NGUYÊN VẸN cùng `clientResultId` đã tạo
từ lần đầu (không tạo id mới mỗi lần retry) — nhờ backend dedup atomic
theo (gameId, guestId, clientResultId), retry an toàn, không tạo duplicate
result kể cả khi request trước đó thật ra đã thành công phía server.
```

### Leaderboard

Endpoint:

```text
GET /api/leaderboards?gameId=&page=&limit=&guestId=
  Response: { gameId, total, page, limit, items, self: { rank, bestScore } }

POST /api/devices
  Body: { token, platform: IOS|ANDROID, locale: EN|VI }

PATCH /api/devices
  Body: { token, locale }

PATCH /api/devices/heartbeat
  (app resume)

DELETE /api/devices
  (unregister)
```

---

# 9. Platform UI

Fonts:

```text
FREDOKA_FONT
NUNITO_FONT
```

Components:

```text
UIButton              # createUIButton(); sound: 'pop' | 'coin-drop' | false (default 'pop')
ScreenManager
ModalScreen
ToastManager
SoundManager          # SFX singleton; init in GameEngine; respects settings.soundEnabled
HUD
ShopPanel
MissionsPanel
LeaderboardPanel
DailyRewardPopup
LanguageSettingsPanel
SoundSettingsPanel    # On/Off toggle in SettingsScene
HowToPlayPanel
LegalPanel
```

Palette:

```text
panel
accent
secondary
bg
success
danger
gold
```

---

# 10. Scripts

```text
apply-android-native.mjs
apply-ios-native.mjs
native-ops.mjs
run-android-emulator.sh
run-ios-simulator.sh
verify-game-config.mjs
  — kiểm tra VITE_GAME_ID không rỗng (đọc từ .env)
  — kiểm tra VITE_REPLAY_SECRET không rỗng
  — kiểm tra VITE_REPLAY_SECRET đúng định dạng SHA256 hex
    (64 ký tự, lowercase a-f0-9) — khớp với validation
    replaySecret ở backend Startup Guard (game-api Section 3/11)
  — live API probe: GET /leaderboards?gameId=...&page=1&limit=1
    (bỏ qua khi SKIP_API_CHECK=true)
  — sai định dạng hoặc rỗng → exit code khác 0, chặn build production
```

---

# 11. Static assets

```text
public/assets/images/

home-screen-background.jpeg
play-button-background.webp
play-button-icon.webp

public/assets/audio/

pop-sound-effect.mp3    # default UIButton press SFX (key: pop-sound-effect)
coin-drop.mp3           # reward/coin actions (key: coin-drop)

resources/logo.webp
```

---

# 12. i18n locale keys

```text
common.*
home.*
game.*
shop.*
settings.*
missions.*
dailyReward.*
leaderboard.*
legal.*
howToPlay.*
```

---

# 13. src/vite-env.d.ts

```ts
interface ImportMetaEnv {
  readonly VITE_APP_ENV: 'dev' | 'staging' | 'production';
  readonly VITE_GAME_ID: string;
  readonly VITE_REPLAY_SECRET: string;
  readonly VITE_IAP_PROVIDER: 'mock' | 'revenuecat';
  readonly VITE_REVENUECAT_ANDROID_API_KEY?: string;
  readonly VITE_REVENUECAT_IOS_API_KEY?: string;
  readonly VITE_ADS_PROVIDER: 'mock' | 'admob';
  readonly VITE_ADMOB_IOS_APP_ID?: string;
  readonly VITE_ADMOB_IOS_BANNER_ID?: string;
  readonly VITE_ADMOB_IOS_APP_OPEN_ID?: string;
  readonly VITE_ADMOB_IOS_REWARDED_ID?: string;
  readonly VITE_ADMOB_IOS_INTERSTITIAL_ID?: string;
  readonly VITE_ADMOB_ANDROID_APP_ID?: string;
  readonly VITE_ADMOB_ANDROID_BANNER_ID?: string;
  readonly VITE_ADMOB_ANDROID_APP_OPEN_ID?: string;
  readonly VITE_ADMOB_ANDROID_REWARDED_ID?: string;
  readonly VITE_ADMOB_ANDROID_INTERSTITIAL_ID?: string;
  readonly VITE_ANALYTICS_PROVIDER: 'console' | 'firebase';
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

# 14. Conventions & patterns

| Pattern            | Quy tắc                             |
| ------------------ | ----------------------------------- |
| Singleton services | export const ...                    |
| Module structure   | service/repository/controller/model |
| Controller         | bind() trả unsub                    |
| Barrel exports     | index.ts                            |
| Game↔Platform      | eventBus                            |
| Persistence        | SaveService                         |
| i18n import        | @platform/ui                        |

---

# 15. Documentation files

```text
README.md
ARCHITECTURE.md

documents/setup/*
documents/modules/*
documents/architecture/*
documents/build/*
```

---

# 16. Verification checklist

```bash
npm install
cp .env.example .env
# Điền VITE_REPLAY_SECRET vào .env trước khi chạy
npm run lint
npm run build
npm run game:verify-config
npm run dev
```

---

# 17. Thứ tự build cho AI agent

```text
Scaffold root

Scripts

Platform core

Platform modules

Platform UI

Bootstrap

Game layer

Entry

Assets

Docs

Verify
```

---

# 18. Backend integration summary

| Feature      | Endpoint                                                     | Auth   |
| ------------ | ------------------------------------------------------------ | ------ |
| Guest init   | POST /api/guest/init                                         | Không  |
| Guest rename | PATCH /api/guest/name                                        | Bearer |
| Game sync    | POST /api/results                                            | Bearer |
| Leaderboard  | GET /api/leaderboards                                        | Không  |
| FCM device   | POST/PATCH/DELETE /api/devices, PATCH /api/devices/heartbeat | Bearer |

Lưu ý:

```text
gameId
→ đọc từ VITE_GAME_ID trong .env (inject vào gameConfig.id)
→ phải khớp GameId enum trên backend
→ ví dụ: 'FRULOOP'

replaySecret
→ inject qua VITE_REPLAY_SECRET (env var)
→ KHÔNG hardcode trong source
→ phải khớp GAME_CONFIG[gameId].replaySecret trên backend

secretToken
→ nhận từ POST /api/guest/init (chỉ lần đầu cài app)
→ lưu vĩnh viễn trong Capacitor Preferences (key: gsk:guest)
→ dùng làm: Authorization: Bearer <secretToken>
→ không có TTL, không rotate
→ mất khi uninstall/clear data → tạo guest mới

deviceId
→ KHÔNG gửi lên server
→ mỗi lần install = guest mới, behavior đồng nhất iOS/Android

FCM token
→ đăng ký qua POST /api/devices sau guest.onReady + permission granted
→ locale EN|VI sync khi đổi ngôn ngữ (PATCH /api/devices)
→ push tap: in-app scene navigation (không deeplink URL)

signature
→ HMAC-SHA256(replaySecret, `${gameId}|${guestId}|${clientResultId}|${score}|${playedAt || ''}`)

playedAt
→ ISO8601

metadata
→ max 10 keys
→ 2048 bytes
```

---

# 19. Security checklist

```text
✅ VITE_REPLAY_SECRET đọc từ env, không hardcode
✅ .env không commit (có trong .gitignore)
✅ .env.example có VITE_REPLAY_SECRET= (rỗng, chỉ là placeholder)
✅ verify-game-config.mjs kiểm tra VITE_REPLAY_SECRET không rỗng VÀ đúng định dạng SHA256 hex khi build production
✅ secretToken lưu trong Capacitor Preferences (key: gsk:guest), không log ra console
✅ deviceId KHÔNG gửi lên server — behavior đồng nhất iOS/Android
✅ Không log replaySecret ở bất kỳ đâu
```
