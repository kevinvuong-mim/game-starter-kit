# BUILD SPEC — game-starter-kit

## 0. Tổng quan

`game-starter-kit` là starter kit production-grade cho hyper-casual / casual mobile games. Mô hình clone-per-game: mỗi game = một repo riêng, clone từ kit này.

| Layer        | Công nghệ                                           |
| ------------ | --------------------------------------------------- |
| Game Engine  | Phaser 3.87                                         |
| Mobile shell | Capacitor 6                                         |
| Language     | TypeScript 5.7 (strict)                             |
| Bundler      | Vite 6                                              |
| State        | Zustand 5 (vanilla, in-memory)                      |
| Storage      | IndexedDB (web) / Capacitor Preferences (native)    |
| Networking   | Fetch API + REST envelope (NestJS-compatible)       |
| Analytics    | Console (dev) + Firebase Analytics 12               |
| Ads          | Mock (web/dev) + AdMob @capacitor-community/admob 6 |
| IAP          | Mock + RevenueCat @revenuecat/purchases-capacitor 9 |

Node.js: `>= 20`

Backend companion: `game-api` — `gameId` và `replaySecret` trong `src/game/config.ts` phải khớp với `GameId enum` và `GAME_CONFIG` trên backend (xem `BUILD_GAME_API_SPEC.md`).

---

## 1. Kiến trúc 5 lớp

```text
┌─────────────────────────────────────────────┐
│            GAME LAYER (src/game/)            │
│  config / scenes / utils — gameplay only     │
├─────────────────────────────────────────────┤
│         PLATFORM UI (src/platform/ui/)       │
│  panels / hud / toast / button / screen      │
├─────────────────────────────────────────────┤
│      PLATFORM MODULES (src/platform/modules/)│
│  i18n shop missions leaderboard daily-rewards│
│  save settings guest game-sync ads iap       │
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
├── BUILD_SPEC.md
├── CONTRIBUTING.md
├── README.md
├── capacitor.config.ts
├── contracts/
│   ├── game-platform.v1.json
│   ├── replay-hash-vectors.json
│   └── sync-rejection-reasons.json
├── documents/
│   ├── architecture/runtime-architecture.md
│   ├── modules/
│   │   ├── game-result-sync.md
│   │   ├── guest-identity.md
│   │   └── leaderboard.md
│   ├── platform-versioning.md
│   └── setup/
│       ├── environment-variables.md
│       ├── game-configuration.md
│       └── mobile-build.md
├── eslint.config.js
├── index.html
├── native/
│   ├── android/
│   └── ios/
├── package.json
├── public/assets/ui/
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
cap:add:android
cap:add:ios
cap:android
cap:ios
assets:generate
build:android
build:ios
lint
test
test:watch
game:verify-config
platform:update
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
vitest
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

### src/game/\*_/_.ts cấm import

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
test-results/
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
VITE_APP_ENV=dev
VITE_API_URL=http://localhost:3000/api
VITE_IAP_ENABLED=false
VITE_IAP_PROVIDER=mock
VITE_REVENUECAT_ANDROID_API_KEY=
VITE_REVENUECAT_IOS_API_KEY=
VITE_ADS_PROVIDER=mock
VITE_ADMOB_TESTING=true
```

(...giữ nguyên phần còn lại như spec)

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
  replaySecret: gameConfig.replaySecret
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

Promise.all([
  i18n.init(),
  ads.init(),
  guest.init(),
  analytics.init(),
  leaderboard.init()
])

analyticsUserId =
guest.getGuestId() ?? store.user.id

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

background guest.ensureGuestId()
→ update userId

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

bindLifecycle()
```

---

## 5.4 Scene flow

```text
Boot → Preload → Home
                  ├→ Gameplay → GameOver → Home / Gameplay
                  ├→ Shop / Missions / Leaderboard / DailyReward
                  └→ Settings → HowToPlay / Legal
```

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
  id: 'puzzle-quest',
  name: 'Game Starter Kit',
  replaySecret: 'puzzle-quest-dev-secret',
};
```

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
| PreloadScene      | Preload  | Progress → assets → Home           |
| HomeScene         | Home     | Background + navigation            |
| GameplayScene     | Gameplay | Tap-to-jump + HUD + events         |
| GameOverScene     | GameOver | Score + Retry/Home                 |
| Shop/Missions/... | wrapper  | Panel + Close                      |
| SettingsScene     | Settings | Language + navigation              |

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
```

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

Envelope:

```ts
{
  (success, statusCode, message, data, path, timestamp);
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
guest
game-sync
ads
iap
```

### Shop catalog

```text
skin_blue
skin_gold
boost_double
remove_ads
```

### Guest

```text
POST /guest/init

PATCH /guest/name
```

### Game sync

Replay:

```text
HMAC-SHA256(
  replaySecret,
  ${gameId}|${guestId}|${clientResultId}|${score}|${playedAt || ''}
)
```

Limits:

```text
MAX_BATCH_SIZE = 50
MAX_SYNC_ATTEMPTS = 10
MAX_PENDING_RESULTS = 500
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
UIButton
ScreenManager
ModalScreen
ToastManager
HUD
ShopPanel
MissionsPanel
LeaderboardPanel
DailyRewardPopup
LanguageSettingsPanel
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

# 10. API Contracts

Files:

```text
contracts/game-platform.v1.json
contracts/replay-hash-vectors.json
contracts/sync-rejection-reasons.json
```

Contracts:

```text
guest
sync
leaderboard
```

---

# 11. Scripts

```text
apply-android-native.mjs
apply-ios-native.mjs
verify-game-config.mjs
update-platform.mjs
```

---

# 12. Native templates

```text
android/
ios/
```

---

# 13. Static assets

```text
public/assets/ui/

home-screen-background.jpeg
play-button-background.webp
play-button-icon.webp

resources/logo.webp
```

---

# 14. i18n locale keys

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

# 15. src/vite-env.d.ts

```text
ImportMetaEnv
VITE_*
VITE_API_URL?
```

---

# 16. Conventions & patterns

| Pattern            | Quy tắc                             |
| ------------------ | ----------------------------------- |
| Singleton services | export const ...                    |
| Module structure   | service/repository/controller/model |
| Controller         | bind() trả unsub                    |
| Barrel exports     | index.ts                            |
| Game↔Platform      | eventBus                            |
| Persistence        | SaveService                         |
| i18n import        | @platform/ui                        |
| Tests              | Vitest                              |

---

# 17. Documentation files

```text
README.md
ARCHITECTURE.md
CONTRIBUTING.md

documents/setup/*
documents/modules/*
documents/architecture/*
documents/platform-versioning.md
```

---

# 18. Verification checklist

```bash
npm install
cp .env.example .env
npm run lint
npm run test
npm run build
SKIP_API_CHECK=true npm run game:verify-config
npm run dev
```

Smoke test:

```text
Home
Gameplay
GameOver
Shop
Missions
Leaderboard
DailyReward
Settings
Language
Android
iOS
```

---

# 19. Thứ tự build cho AI agent

```text
Scaffold root

Contracts & scripts

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

# 20. Backend integration summary

| Feature      | Endpoint                    | Auth   |
| ------------ | --------------------------- | ------ |
| Guest init   | POST /guest/init            | Không  |
| Guest rename | PATCH /guest/name           | Bearer |
| Game sync    | POST /games/:gameId/results | Bearer |
| Leaderboard  | GET /leaderboards           | Không  |

Lưu ý:

```text
gameId + replaySecret
phải khớp backend

secretToken
→ Authorization: Bearer

signature
→ HMAC-SHA256(...)

playedAt
→ ISO8601

metadata
→ max 10 keys
→ 2048 bytes
```
