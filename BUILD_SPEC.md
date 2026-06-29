# BUILD SPEC — game-starter-kit

## 0. Tổng quan

**game-starter-kit** là starter kit production-grade cho hyper-casual / casual mobile games. Mô hình **clone-per-game**: mỗi game = một repo riêng, clone từ kit này.

| Layer | Công nghệ |
|-------|-----------|
| Game Engine | Phaser 3.87 |
| Mobile shell | Capacitor 6 |
| Language | TypeScript 5.7 (strict) |
| Bundler | Vite 6 |
| State | Zustand 5 (vanilla, in-memory) |
| Storage | IndexedDB (web) / Capacitor Preferences (native) |
| Networking | Fetch API + REST envelope (NestJS-compatible) |
| Analytics | Console (dev) + Firebase Analytics 12 |
| Ads | Mock (web/dev) + AdMob `@capacitor-community/admob` 6 |
| IAP | Mock + RevenueCat `@revenuecat/purchases-capacitor` 9 |

**Node.js:** `>= 20`

**Backend companion:** `game-api` — `gameId` và `replaySecret` trong `src/game/config.ts` phải khớp bảng `games` trên backend (mặc định: `puzzle-quest` / `puzzle-quest-dev-secret`).

---

## 1. Kiến trúc 5 lớp

```
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
│  advertising error services utils              │
├─────────────────────────────────────────────┤
│     BOOTSTRAP (src/platform/bootstrap/)      │
│  App GameEngine analytics ads iap capacitor  │
└─────────────────────────────────────────────┘
```

**Nguyên tắc thiết kế:**

| Nguyên tắc | Triển khai |
|------------|------------|
| Clone per game | Một repo = một game |
| Event-driven | Game chỉ `emit` qua EventBus; ESLint enforce boundary |
| Data-driven | Shop catalog, missions trong JSON |
| Offline-first | Local queue (game-sync), leaderboard cache |
| Single persistence | SaveService → durable storage; store in-memory only |
| Provider pattern | Ads/Analytics/IAP swappable (mock ↔ production) |
| Mobile performance | Object pooling, lazy locale chunks, 60 FPS target |

---

## 2. Cây thư mục đầy đủ

```
game-starter-kit/
├── .env.example
├── .gitignore
├── .prettierignore
├── .prettierrc
├── ARCHITECTURE.md
├── BUILD_SPEC.md                    # file này
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
│   │   ├── MainActivity.java
│   │   └── admob-manifest-snippet.xml
│   └── ios/
│       ├── FullscreenBridgeViewController.swift
│       ├── Main.storyboard
│       └── admob-info-snippet.plist
├── package.json
├── public/assets/ui/
│   ├── home-screen-background.jpeg
│   ├── play-button-background.webp
│   └── play-button-icon.webp
├── resources/
│   └── logo.webp                    # source cho capacitor-assets
├── scripts/
│   ├── apply-android-native.mjs
│   ├── apply-ios-native.mjs
│   ├── update-platform.mjs
│   └── verify-game-config.mjs
├── src/
│   ├── main.ts
│   ├── vite-env.d.ts
│   ├── game/
│   │   ├── config.ts
│   │   ├── utils/ObjectPool.ts
│   │   └── scenes/
│   │       ├── index.ts
│   │       ├── BootScene.ts
│   │       ├── PreloadScene.ts
│   │       ├── HomeScene.ts
│   │       ├── GameplayScene.ts
│   │       ├── GameOverScene.ts
│   │       ├── ShopScene.ts
│   │       ├── MissionsScene.ts
│   │       ├── LeaderboardScene.ts
│   │       ├── DailyRewardScene.ts
│   │       ├── SettingsScene.ts
│   │       ├── HowToPlayScene.ts
│   │       └── LegalScene.ts
│   └── platform/
│       ├── index.ts
│       ├── bootstrap/
│       │   ├── App.ts
│       │   ├── GameEngine.ts
│       │   ├── ads.ts
│       │   ├── analytics.ts
│       │   ├── capacitor.ts
│       │   ├── iap.ts
│       │   └── index.ts
│       ├── core/
│       │   ├── index.ts
│       │   ├── analytics/
│       │   │   ├── AnalyticsService.ts
│       │   │   ├── events.ts
│       │   │   ├── types.ts
│       │   │   ├── index.ts
│       │   │   └── providers/
│       │   │       ├── ConsoleAnalyticsProvider.ts
│       │   │       └── FirebaseAnalyticsProvider.ts
│       │   ├── advertising/
│       │   │   ├── AdsService.ts
│       │   │   ├── AdStateMachine.ts
│       │   │   ├── types.ts
│       │   │   ├── index.ts
│       │   │   └── providers/
│       │   │       ├── MockAdsProvider.ts
│       │   │       ├── AdMobAdsProvider.ts
│       │   │       └── index.ts
│       │   ├── api/
│       │   │   ├── ApiClient.ts
│       │   │   ├── envelope.ts
│       │   │   ├── types.ts
│       │   │   └── index.ts
│       │   ├── config/index.ts
│       │   ├── error/index.ts
│       │   ├── events/
│       │   │   ├── EventBus.ts
│       │   │   ├── types.ts
│       │   │   └── index.ts
│       │   ├── services/index.ts
│       │   ├── state/
│       │   │   ├── store.ts
│       │   │   ├── types.ts
│       │   │   └── index.ts
│       │   ├── storage/
│       │   │   ├── StorageService.ts
│       │   │   ├── IndexedDBStorage.ts
│       │   │   ├── PreferencesStorage.ts
│       │   │   ├── LocalStorage.ts
│       │   │   ├── MemoryStorage.ts
│       │   │   ├── types.ts
│       │   │   └── index.ts
│       │   └── utils/
│       │       ├── index.ts
│       │       └── time.ts
│       ├── modules/
│       │   ├── index.ts
│       │   ├── i18n/
│       │   │   ├── i18n.service.ts
│       │   │   └── locales/{en.json,vi.json}
│       │   ├── shop/
│       │   │   ├── shop.service.ts
│       │   │   └── catalog.json
│       │   ├── missions/
│       │   │   ├── mission.service.ts
│       │   │   ├── mission.model.ts
│       │   │   ├── mission.controller.ts
│       │   │   ├── mission.tracker.ts
│       │   │   ├── missions.json
│       │   │   └── index.ts
│       │   ├── leaderboard/
│       │   │   ├── leaderboard.service.ts
│       │   │   ├── leaderboard.repository.ts
│       │   │   ├── leaderboard.controller.ts
│       │   │   ├── leaderboard.model.ts
│       │   │   └── index.ts
│       │   ├── daily-rewards/
│       │   │   ├── daily-reward.service.ts
│       │   │   ├── daily-reward.model.ts
│       │   │   ├── daily-reward.repository.ts
│       │   │   ├── daily-reward.controller.ts
│       │   │   ├── reward-resolver.ts
│       │   │   └── index.ts
│       │   ├── save/save.service.ts
│       │   ├── settings/settings.service.ts
│       │   ├── guest/
│       │   │   ├── guest.service.ts
│       │   │   ├── guest.repository.ts
│       │   │   ├── guest.model.ts
│       │   │   └── index.ts
│       │   ├── game-sync/
│       │   │   ├── game-sync.service.ts
│       │   │   ├── game-sync.model.ts
│       │   │   ├── game-sync.repository.ts
│       │   │   ├── game-sync.controller.ts
│       │   │   ├── game-sync.model.test.ts
│       │   │   ├── game-sync.service.test.ts
│       │   │   └── index.ts
│       │   ├── ads/
│       │   │   ├── ads.service.ts
│       │   │   ├── ads.controller.ts
│       │   │   └── index.ts
│       │   └── iap/
│       │       ├── index.ts
│       │       ├── iap.controller.ts
│       │       ├── config/iap.config.ts
│       │       ├── types/iap.types.ts
│       │       ├── events/iap.events.ts
│       │       ├── services/iap.service.ts
│       │       ├── storage/purchase.storage.ts
│       │       ├── hooks/use-entitlement.ts
│       │       └── adapters/
│       │           ├── index.ts
│       │           ├── mock.adapter.ts
│       │           └── revenuecat.adapter.ts
│       └── ui/
│           ├── index.ts
│           ├── types.ts
│           ├── button/UIButton.ts
│           ├── screen/ScreenManager.ts
│           ├── modal/ModalScreen.ts
│           ├── toast/ToastManager.ts
│           ├── hud/HUD.ts
│           ├── shop/ShopPanel.ts
│           ├── missions/MissionsPanel.ts
│           ├── leaderboard/LeaderboardPanel.ts
│           ├── daily-reward/DailyRewardPopup.ts
│           ├── settings/LanguageSettingsPanel.ts
│           ├── how-to-play/HowToPlayPanel.ts
│           └── legal/LegalPanel.ts
├── tsconfig.json
└── vite.config.ts
```

**Gitignored (không commit, tạo local):** `node_modules/`, `dist/`, `android/`, `ios/`, `.env`, `.vite/`, `coverage/`.

---

## 3. Root config files (tạo chính xác)

### 3.1 `package.json`

```json
{
  "name": "game-starter-kit",
  "version": "1.0.0",
  "description": "Production-grade starter kit for hyper-casual / casual mobile games",
  "type": "module",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "cap:sync": "cap sync",
    "cap:add:android": "[ -d android ] || cap add android",
    "cap:add:ios": "[ -d ios ] || cap add ios",
    "cap:android": "cap open android",
    "cap:ios": "cap open ios",
    "assets:generate": "capacitor-assets generate --android --ios",
    "build:android": "npm run build && npm run cap:add:android && npm run assets:generate && cap sync android && node scripts/apply-android-native.mjs",
    "build:ios": "npm run build && npm run cap:add:ios && npm run assets:generate && cap sync ios && node scripts/apply-ios-native.mjs",
    "lint": "tsc --noEmit && eslint src",
    "test": "vitest run",
    "test:watch": "vitest",
    "game:verify-config": "node scripts/verify-game-config.mjs",
    "platform:update": "node scripts/update-platform.mjs",
    "lint:fix": "eslint src --fix",
    "format": "prettier --write \"src/**/*.{ts,json}\" \"*.{ts,json,md}\"",
    "format:check": "prettier --check \"src/**/*.{ts,json}\" \"*.{ts,json,md}\""
  },
  "dependencies": {
    "@capacitor-community/admob": "^6.0.0",
    "@capacitor/app": "^6.0.2",
    "@capacitor/core": "^6.2.0",
    "@capacitor/haptics": "^6.0.2",
    "@capacitor/network": "^6.0.4",
    "@capacitor/preferences": "^6.0.3",
    "@capacitor/splash-screen": "^6.0.3",
    "@capacitor/status-bar": "^6.0.2",
    "@revenuecat/purchases-capacitor": "^9.2.2",
    "firebase": "^12.15.0",
    "phaser": "^3.87.0",
    "zustand": "^5.0.3"
  },
  "devDependencies": {
    "@capacitor/android": "^6.2.0",
    "@capacitor/assets": "^3.0.5",
    "@capacitor/cli": "^6.2.0",
    "@capacitor/ios": "^6.2.0",
    "@eslint/js": "^9.20.0",
    "@types/node": "^22.13.4",
    "eslint": "^9.20.0",
    "eslint-config-prettier": "^10.0.1",
    "prettier": "^3.5.1",
    "typescript": "^5.7.3",
    "typescript-eslint": "^8.24.0",
    "vite": "^6.1.0",
    "vitest": "^4.1.9"
  },
  "engines": { "node": ">=20.0.0" }
}
```

### 3.2 `tsconfig.json`

- `include`: `["src", "vite.config.ts"]`
- `exclude`: `["dist", "node_modules"]`
- `compilerOptions`: `strict: true`, `noEmit: true`, `target: "ES2022"`, `module: "ESNext"`, `moduleResolution: "bundler"`, `allowImportingTsExtensions: true`, `resolveJsonModule: true`, `noUnusedLocals: true`, `noUnusedParameters: true`, `isolatedModules: true`, `skipLibCheck: true`, `esModuleInterop: true`, `forceConsistentCasingInFileNames: true`, `lib: ["DOM","ES2022","DOM.Iterable"]`
- `paths`:
  - `@game/*` → `src/game/*`
  - `@platform/ui/*` → `src/platform/ui/*`
  - `@platform/core/*` → `src/platform/core/*`
  - `@platform/modules/*` → `src/platform/modules/*`
  - `@platform/bootstrap/*` → `src/platform/bootstrap/*`

### 3.3 `vite.config.ts`

- Server: `host: true`, `port: 5173`
- Aliases (bare, không có `/*`): `@game`, `@platform/ui`, `@platform/core`, `@platform/modules`, `@platform/bootstrap` → tương ứng `src/...`
- Build: `outDir: 'dist'`, `sourcemap: true`, `target: 'es2022'`, `chunkSizeWarningLimit: 1600`
- `manualChunks`: phaser → `'phaser'`; zustand → `'vendor'`; i18n locales → `'locales'`

### 3.4 `capacitor.config.ts`

```typescript
const config: CapacitorConfig = {
  webDir: 'dist',
  server: { androidScheme: 'https' },
  appName: 'Game Starter Kit',
  appId: 'com.studio.gamestarterkit',
  plugins: {
    StatusBar: { overlaysWebView: true },
    SplashScreen: { showSpinner: false, launchAutoHide: false, backgroundColor: '#6b97b2' },
  },
};
```

### 3.5 `eslint.config.js`

Flat config với `typescript-eslint`:
- Extends: `eslint.configs.recommended`, `tseslint.configs.recommended`, `eslintConfigPrettier`
- Ignores: `ios/**`, `dist/**`, `android/**`, `node_modules/**`
- `src/**/*.ts`: `@typescript-eslint/no-unused-vars` error, `argsIgnorePattern: '^_'`, `varsIgnorePattern: '^_'`
- `src/game/**/*.ts`: `no-restricted-imports` cấm:
  - Pattern `@platform/modules/*`
  - Paths: `@platform/core/advertising`, `config`, `utils`, `error`, `state`, `storage`, `api`, `analytics` (với message hướng dẫn dùng eventBus)

### 3.6 `.prettierrc`

```json
{ "semi": true, "tabWidth": 2, "printWidth": 100, "singleQuote": true, "trailingComma": "es5" }
```

### 3.7 `.prettierignore`

```
ios
dist
*.lock
android
node_modules
```

### 3.8 `.gitignore`

```
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

### 3.9 `index.html`

- `lang="en"`, viewport `viewport-fit=cover`, `user-scalable=no`, `theme-color #1a1a2e`
- Google Fonts: **Fredoka** (400;500;600;700) + **Nunito Sans** (400;500;600;700)
- CSS reset: `html,body` full bleed, `overflow:hidden`, `touch-action:none`, `background:#1a1a2e`, `-webkit-tap-highlight-color:transparent`
- `#game-container` 100%×100%
- Entry: `<script type="module" src="/src/main.ts"></script>`

### 3.10 `.env.example`

```bash
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
# Ad unit IDs (production only, VITE_ADMOB_TESTING=false):
# VITE_ADMOB_ANDROID_BANNER_ID= ...
# VITE_ADMOB_ANDROID_INTERSTITIAL_ID= ...
# VITE_ADMOB_ANDROID_REWARDED_ID= ...
# VITE_ADMOB_ANDROID_APP_OPEN_ID= ...
# VITE_ADMOB_IOS_BANNER_ID= ...
# VITE_ADMOB_IOS_INTERSTITIAL_ID= ...
# VITE_ADMOB_IOS_REWARDED_ID= ...
# VITE_ADMOB_IOS_APP_OPEN_ID= ...
# Firebase (staging/production):
# VITE_FIREBASE_APP_ID= ...
# VITE_FIREBASE_API_KEY= ...
# VITE_FIREBASE_PROJECT_ID= ...
# VITE_FIREBASE_AUTH_DOMAIN= ...
# VITE_FIREBASE_MEASUREMENT_ID= ...
```

---

## 4. Path aliases

| Alias (tsconfig `/*`) | Vite bare alias | Path |
|-----------------------|-----------------|------|
| `@game/*` | `@game` | `src/game/*` |
| `@platform/ui/*` | `@platform/ui` | `src/platform/ui/*` |
| `@platform/core/*` | `@platform/core` | `src/platform/core/*` |
| `@platform/modules/*` | `@platform/modules` | `src/platform/modules/*` |
| `@platform/bootstrap/*` | `@platform/bootstrap` | `src/platform/bootstrap/*` |

---

## 5. Entry point & bootstrap flow

### 5.1 `src/main.ts`

```typescript
import { gameEngine } from '@platform/bootstrap/GameEngine';

async function main(): Promise<void> {
  try {
    await gameEngine.bootstrap();
    window.addEventListener('beforeunload', () => { gameEngine.destroy(); });
  } catch (error) {
    console.error('Failed to start game platform:', error);
  }
}
main();
```

### 5.2 `GameEngine.bootstrap()` sequence

1. `setupGlobalErrorHandlers()`
2. `setConfig(createConfig({ gameId: gameConfig.id, replaySecret: gameConfig.replaySecret }))`
3. `refreshServicesFromConfig()`
4. `await app.init()`
5. `await initCapacitorPlugins()`
6. Load fonts `16px "Fredoka"` + `16px "Nunito Sans"`, await `document.fonts.ready`
7. Create Phaser game với `gameScenes` từ `@game/scenes`
8. `toast.init(game)`

**Phaser config:** `type: AUTO`, `parent: 'game-container'`, `width/height` từ `gameConfig`, `backgroundColor: '#1a1a2e'`, `fps.target: 60`, `scale.mode: ENVELOP`, `scale.autoCenter: CENTER_BOTH`, `render: { antialias: true, pixelArt: false, roundPixels: true }`, `banner: config.debug`.

### 5.3 `App.init()` sequence

1. Ensure `user.id` in store (`generateId('user')`, displayName `'Player'`)
2. `registerAnalyticsProviders()`
3. `registerAdsProvider()`
4. `Promise.all([i18n.init(), ads.init(), guest.init(), analytics.init(), leaderboard.init()])`
5. `analyticsUserId = guest.getGuestId() ?? store.user.id`; `registerIapProvider(analyticsUserId)`; `iap.initialize()` (catch errors)
6. Dynamic import ads module → `adsModule.init()`
7. `analytics.setUserId(analyticsUserId)`; `analytics.setUserProperty('game_id', config().gameId)`; background `guest.ensureGuestId()` → update userId
8. `saveService.loadLocal()` — hydrate store
9. `dailyRewards.init()`, `settings.init()`, `missions.init()`
10. `bindPlatformEvents()`
11. `dailyRewardController.bind(events)`
12. Push unsubscribers: `leaderboardController.bind`, `gameSyncController.bind`, `bindAdsController`, `bindIapController`, `missionController.bind`
13. `bindLifecycle()` — web `visibilitychange`; native dùng Capacitor `appStateChange`

### 5.4 Scene flow

```
Boot → Preload → Home
                  ├→ Gameplay → GameOver → Home / Gameplay
                  ├→ Shop / Missions / Leaderboard / DailyReward
                  └→ Settings → HowToPlay / Legal
```

`BootScene` emit `analytics`(SESSION_START) + `app:ready` → hide splash + request APP_START/HOME ads.

`gameScenes` array (Phaser auto-starts first = BootScene):
`[BootScene, HomeScene, ShopScene, LegalScene, PreloadScene, GameplayScene, GameOverScene, MissionsScene, SettingsScene, HowToPlayScene, DailyRewardScene, LeaderboardScene]`

---

## 6. Game layer (`src/game/`)

### 6.1 `config.ts`

```typescript
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

### 6.2 `utils/ObjectPool.ts`

Generic pool: `constructor(factory, reset, initialSize=10)`. Methods: `warm()`, `acquire()`, `release(item)`, `releaseAll()`. Getters: `activeCount`, `poolSize`.

### 6.3 Scenes — hành vi mẫu

| Scene | Key | Hành vi |
|-------|-----|---------|
| BootScene | `Boot` | Tạo texture `particle`; emit SESSION_START + `app:ready`; → Preload |
| PreloadScene | `Preload` | Progress bar; load `/assets/ui/*`; fallback textures; → Home |
| HomeScene | `Home` | Background image; register ModalScreen; play → Gameplay; buttons → feature scenes; `shutdown` → unregister screenManager |
| GameplayScene | `Gameplay` | Tap-to-jump demo: gravity 1500, jumpVelocity -600, maxJumps 5; ObjectPool falling arcs (coin +10 score, obstacle = game over); HUD; emit `game:start`, `jump`, `score:update`, `coin:add`, `collect`, `game:over`; bind `app:back` |
| GameOverScene | `GameOver` | Score display; Retry/Leaderboard/Home buttons |
| Shop/Missions/Leaderboard/DailyReward/HowToPlay/Legal | wrapper | Title + panel + Close; `init({returnTo, returnData})`; bind `app:back` |
| SettingsScene | `Settings` | LanguageSettingsPanel + nav HowToPlay/Legal/Back |

**Game layer rules (ESLint enforced):**
- ✅ `@platform/core/events`, `@game/*`, `@platform/ui/*`, Phaser APIs
- ❌ `@platform/modules/*`, `@platform/core/{api,storage,state,config,utils,error,advertising,analytics}`

**i18n:** import `t` từ `@platform/ui`, không từ `@platform/modules`.

---

## 7. Platform Core (`src/platform/core/`)

### 7.1 EventBus (`core/events/`)

Singleton `eventBus`. Typed `PlatformEventMap`. Methods: `emit`, `on` (returns unsub), `off`, `once` (returns unsub), `clear`. `emit` wraps handlers in `Promise.resolve().catch(console.error)`; removes once-listeners after fire.

**PlatformEventMap (đầy đủ):**

| Event | Payload |
|-------|---------|
| `jump` | `{ count?: number }` |
| `score:update` | `{ score: number }` |
| `collect` | `{ itemId: string; count?: number }` |
| `coin:add` | `{ amount: number; source?: string }` |
| `coin:spend` | `{ amount: number; reason?: string }` |
| `level:complete` | `{ level: number; stars?: number }` |
| `app:back` | `void` |
| `app:ready` | `void` |
| `app:pause` / `game:pause` / `app:resume` / `game:resume` | `void` |
| `game:destroy` | `void` |
| `game:init` | `{ gameId: string }` |
| `game:start` | `{ gameId: string }` |
| `game:over` | `{ score: number; jumps?: number; duration: number }` |
| `shop:restore` | `void` |
| `shop:purchase` | `{ itemId: string; price: number }` |
| `ad:show:request` | `{ placement: string }` |
| `ad:show:result` | `{ placement: string; shown: boolean; error?: string }` |
| `ad:reward:request` | `{ placement: string }` |
| `ad:reward:result` | `{ success: boolean; placement: string; message?: string; reward?: { type: string; amount: number } }` |
| `ad:reward` | `{ placement: string; reward: unknown }` |
| `ad:banner:hide` | `void` |
| `ad:context:change` | `{ context: string }` |
| `analytics` | `{ event: AnalyticsEvent; params?: AnalyticsParams }` |
| `analytics:track` | (legacy, same shape) |
| `error:report` | `{ error: Error; context?: string }` |
| `settings:change` | `{ key: string; value: unknown }` |
| `mission:update` | `{ missionId: string; progress: number }` |
| `mission:complete` | `{ missionId: string }` |
| `leaderboard:request` | `{ page?: number } \| undefined` |
| `leaderboard:refresh` | `{ page?: number } \| undefined` |
| `leaderboard:page` | `{ page: number }` |
| `leaderboard:update` | `LeaderboardView` |
| `daily:status:request` / `daily:progress:request` / `daily:claim:request` | `void` |
| `daily:status` | `{ canClaim: boolean; timeManipulated: boolean }` |
| `daily:progress` | `RewardProgress` |
| `daily:claim:result` | `{ success: boolean; day?: number; coins?: number; itemId?: string; message?: string; rewardType?: 'coins' \| 'chest' }` |
| `daily:claim` | `{ day: number; streak: number }` |
| `game:synced` | `SyncResponse` |
| `game:sync:rejected` | `{ gameId: string; items: Array<{ score; replayHash; reason }> }` |
| `iap:purchase:success` / `iap:purchase:failed` / `iap:restore:success` / `iap:entitlement:changed` | IAP payloads |
| `auth:sign-in:request` | `{ provider: 'google' \| 'apple' }` |

`AnalyticsEvents` constants: `session_start`, `session_end`, `game_start`, `game_over`, `level_start`, `level_complete`, `purchase`, `ad_reward`, `shop_open`, `daily_claim`, `mission_complete`.

### 7.2 State (`core/state/`) — Zustand vanilla, in-memory

`PlatformState` slices:
- `user`: `{ id, createdAt, avatarUrl?, displayName, lastLoginAt }`
- `currency`: `{ coins }`
- `inventory`: `{ items: Record<id, { id, quantity, equipped? }> }`
- `progress`: `{ highScore, currentLevel, totalGamesPlayed, unlockedFeatures[] }`
- `settings`: `{ language, soundEnabled, musicEnabled, vibrationEnabled, graphicsQuality: 'low'|'medium'|'high' }`
- `missions`: `{ missions: Record<id, MissionProgress> }`
- `dailyRewards`: version 2 fields + deprecated legacy fields

Actions: `setUser`, `addCoins`, `spendCoins`, `addItem`, `removeItem`, `equipItem`, `setHighScore`, `incrementGamesPlayed`, `setCurrentLevel`, `updateSettings`, `updateMissionProgress`, `completeMission`, `claimMission`, `setMissions`, `updateMissionsState`, `setDailyRewardState`, `hydrate`, `reset`.

Export: `usePlatformStore`, `getStoreState()`.

### 7.3 Config (`core/config/index.ts`)

`RuntimeConfig`: `{ ads, iap, apiUrl, debug, gameId, replaySecret, adsEnabled, iapEnabled, firebase, analyticsEnabled }`.

`ENV_CONFIGS`:
- `dev`: debug true, adsEnabled true, analyticsEnabled false, apiUrl `http://localhost:3000/api`
- `staging`: debug true, analyticsEnabled true, apiUrl `https://staging-api.studio.games/api`
- `production`: debug false, analyticsEnabled true, apiUrl `https://api.studio.games/api`

`resolveEnvironment()`: `VITE_APP_ENV` hoặc `import.meta.env.PROD ? 'production' : 'dev'`.

`createConfig(overrides?)`: merge env + overrides. `iapEnabled = VITE_IAP_ENABLED === 'true'`. `VITE_ADMOB_TESTING === 'true'` → Google test ad units. Module cache: `getConfig()`, `setConfig()`, `getEnvironment()`.

### 7.4 API (`core/api/`)

`ApiClient` singleton `apiClient`:
- Fetch-based, timeout 15s (AbortController), retries default 2, delay `1000 * (attempt+1)`, retryable `[429,500,502,503,504]`
- Methods: `get/post/put/patch/delete`, interceptors, `setBaseUrl`, `setAuthToken` (Bearer, skip when `auth: false`)
- Throws `ApiError { message, status, body?, headers? }`

`ApiEnvelope<T>`: `{ success, statusCode, message, data, path, timestamp }`. Helpers: `unwrapEnvelope`, `isApiErrorEnvelope`.

### 7.5 Storage (`core/storage/`)

`StorageService` singleton `storage`. Providers: `memory`, `indexedDB`, `preferences`, `localStorage`. Durable: native → `preferences`, web → `indexedDB`. Prefix `gsk:`. IndexedDB: DB `game-starter-kit`, store `kv`, version 1.

### 7.6 Analytics (`core/analytics/`)

`AnalyticsService` singleton `analytics`. Multi-provider. Console always allowed. `FirebaseAnalyticsProvider` lazy-loads firebase/app + firebase/analytics.

### 7.7 Advertising (`core/advertising/`)

`AdsService` singleton `ads`. State machines per format. `DEFAULT_REMOTE_CONFIG`:
- Cooldowns: app_open 0, rewarded 30, interstitial 90
- Placements: HOME/SHOP/LEADERBOARD→banner, APP_START→app_open, EXTRA_LIFE/DOUBLE_COIN→rewarded, GAME_OVER→interstitial
- Rewards: DOUBLE_COIN `{coins:100}`, EXTRA_LIFE `{extra_life:1}`
- `appOpenEnabled: false` by default

Providers: `MockAdsProvider`, `AdMobAdsProvider` (dynamic import `@capacitor-community/admob`). Factory `createAdsProvider(name)`.

### 7.8 Error (`core/error/`)

`Logger` singleton `logger` (minLevel production='warn', dev='debug'). `ErrorBoundary` singleton `errorBoundary`. `setupGlobalErrorHandlers()` for window error + unhandledrejection.

### 7.9 Services locator (`core/services/`)

```typescript
services = { ads, iap, storage, analytics, api: apiClient, events: eventBus, config: getConfig }
refreshServicesFromConfig() // analytics/ads/iap enabled flags + api base URL
```

### 7.10 Utils (`core/utils/`)

`generateId(prefix='id')` → `${prefix}_${Date.now()}_${random}`. `formatNumber` (K/M). `time.ts`: `now()`, `getLocalDateKey(at)` → `YYYY-MM-DD`.

---

## 8. Platform Modules (`src/platform/modules/`)

**Convention:** mỗi module = service singleton + optional repository/controller/model + `index.ts` barrel.

### 8.1 i18n

- `SUPPORTED_LANGUAGES = ['en', 'vi']`, fallback `'en'`
- Lazy load locale JSON (separate Vite chunk `locales`)
- `t(key, params?)` — dot-path + `{{param}}` interpolation
- Persist language via storage key `settings:language`

### 8.2 shop

`catalog.json`:
```json
{
  "items": [
    { "id": "skin_blue", "type": "skin", "currency": "coins", "price": 100, "name": "Blue Skin", "icon": "skin_blue", "description": "A cool blue character skin" },
    { "id": "skin_gold", "type": "skin", "currency": "coins", "price": 300, "name": "Gold Skin", "icon": "skin_gold", "description": "Premium gold character skin" },
    { "id": "boost_double", "type": "boost", "currency": "coins", "price": 200, "duration": 3600, "name": "Double Coins", "icon": "boost_double", "description": "2x coins for 1 hour" },
    { "id": "remove_ads", "type": "entitlement", "currency": "iap", "price": 4.99, "productKey": "REMOVE_ADS", "name": "Remove Ads", "icon": "remove_ads", "description": "Remove banner and interstitial ads permanently" }
  ]
}
```

### 8.3 missions

`missions.json`:
```json
[{ "id": "watch_ad_3", "type": "WATCH_AD", "target": 3, "titleKey": "missions.watchAd3", "resetPolicy": "daily", "reward": { "type": "coins", "amount": 100 } }]
```

Tracker binds `ad:reward` → increment WATCH_AD. Controller binds tracker + `app:resume` → daily resets.

### 8.4 leaderboard

- `GET /leaderboards?page&limit&gameId&guestId` (auth: false, timeout 10s)
- Cache TTL 60s, limit 100, key `leaderboard:cache:{gameId}:p{page}`
- Controller: `leaderboard:request/refresh/page`, `game:synced` → refresh

### 8.5 daily-rewards

7-day cycle rewards: days 1–3 (100,150,200 coins), day 4 random 150–350, day 5–6 (300,500), day 7 chest `rare_chest×1`. Version 2 model in Capacitor Preferences. Time manipulation detection (60s tolerance).

### 8.6 save

Key `game-save`. `SaveData { version: 1, timestamp, state }`. Extracts: user, currency, inventory, progress, settings, missions, dailyRewards. Migrates IndexedDB → Preferences on native.

### 8.7 guest

Preferences keys: `game_guest_id`, `game_install_id`. `POST /guest/init` `{installId}` (auth: false). `PATCH /guest/name`. Lazy init — no network on boot.

### 8.8 game-sync

**Replay hash:** `HMAC-SHA256(replaySecret, "{gameId}|{score}|{runSeed}")` → lowercase hex via Web Crypto.

Constants: `MAX_BATCH_SIZE=50`, `MAX_SYNC_ATTEMPTS=10`, `MAX_PENDING_RESULTS=500`, `RUN_SEED_METADATA_KEY='runSeed'`.

`POST /games/:gameId/results` `{ guestId, results[] }`.

Metadata sanitize: max 10 keys, 2048 bytes, key≤64, string≤256, flat values only, injects runSeed.

Backoff: base 30s, max 30min. Controller binds `game:over`, `app:resume`, `online`, Capacitor networkStatusChange.

**Tests:** `game-sync.model.test.ts` (replay vectors, sanitize, rejections), `game-sync.service.test.ts` (queue before sync).

### 8.9 ads (module)

`AdsModuleService`: applies `DEFAULT_REMOTE_CONFIG`. `bindAdsController(events)`: `ad:reward:request`, `ad:show:request`, `ad:banner:hide`, `ad:context:change`.

### 8.10 iap

`PRODUCTS.REMOVE_ADS`: `{ id: 'remove_ads', type: 'non_consumable', entitlement: 'remove_ads' }`. Client-authoritative entitlements. Storage key `iap-entitlements`. Purchase timeout 60s. Adapters: `mock`, `revenuecat`. `bindIapController` syncs `ads.setAdsRemoved` on entitlement change.

---

## 9. Platform UI (`src/platform/ui/`)

Export constants: `FREDOKA_FONT = '"Fredoka", sans-serif'`, `NUNITO_FONT = '"Nunito Sans", sans-serif'`.

| Component | Mô tả |
|-----------|-------|
| `createUIButton` | Factory: variants `Primary`/`Rounded`, press scale 0.95, badge, 200×50 default |
| `ScreenManager` / `BaseScreen` | Overlay stack depth 1000 |
| `ModalScreen` | id `'modal'`, panel `0x2a2a4a` |
| `ToastManager` | Queue, depth 2000, duration 2500ms default |
| `HUD` | Score text, depth 500, scrollFactor 0 |
| `ShopPanel` | Catalog rows, buy/owned, restore |
| `MissionsPanel` | Progress bars, claim buttons |
| `LeaderboardPanel` | Event-driven, pagination, auto-refresh 30s, MAX_ROWS 7 |
| `DailyRewardPopup` | 7-cell calendar, claim animation |
| `LanguageSettingsPanel` | en/vi toggle → `settings.setLanguage` + scene restart |
| `HowToPlayPanel` / `LegalPanel` | Scrollable masked text; Legal has Terms/Privacy tabs |

**UI palette:** panel `0x2a2a4a`, accent `0x4a90d9`, secondary `0x6c5ce7`, bg `0x1a1a2e`/`0x16213e`, success `0x4caf50`, danger `0xf44336`, gold `0xffd700`.

---

## 10. API Contracts (`contracts/`)

### `game-platform.v1.json`
```json
{
  "version": 1,
  "successEnvelope": { "required": ["success", "statusCode", "message", "data", "path", "timestamp"] },
  "errorEnvelope": { "required": ["success", "statusCode", "error", "message", "path", "timestamp"] },
  "sync": {
    "endpoint": "POST /games/:gameId/results",
    "maxBatchSize": 50,
    "replayHashPayload": "{gameId}|{score}|{runSeed}",
    "metadata": { "maxKeys": 10, "maxBytes": 2048, "runSeedKey": "runSeed" }
  },
  "leaderboard": { "endpoint": "GET /leaderboards", "maxLimit": 100 }
}
```

### `replay-hash-vectors.json`
```json
[
  { "name": "puzzle quest sample run", "gameId": "puzzle-quest", "score": 1500, "runSeed": "e2e-run-1", "replaySecret": "puzzle-quest-dev-secret", "replayHash": "7f39f09c8ad5af3f6dec0d0633e895fa30d25aa001d4883235cc64343273f104" },
  { "name": "zero score sample run", "gameId": "puzzle-quest", "score": 0, "runSeed": "zero-score-run", "replaySecret": "puzzle-quest-dev-secret", "replayHash": "1247ca43661516fa77cb05d4f2030774efb036be6a1bf61b95f7f5a390a5da42" }
]
```

### `sync-rejection-reasons.json`
```json
["DUPLICATE_REPLAY","MISSING_REPLAY_HASH","INVALID_REPLAY_HASH_FORMAT","INVALID_REPLAY_SIGNATURE","MISSING_RUN_SEED","SCORE_MISMATCH","INVALID_PLAYED_AT","MIN_DURATION","SCORE_RATE"]
```

---

## 11. Scripts (`scripts/`)

| Script | Chức năng |
|--------|-----------|
| `apply-android-native.mjs` | Load `.env`; copy `native/android/MainActivity.java` → `android/app/src/main/java/com/studio/gamestarterkit/MainActivity.java`; inject AdMob APPLICATION_ID vào AndroidManifest |
| `apply-ios-native.mjs` | Copy Swift + storyboard; patch Info.plist (status bar, AdMob, SKAdNetwork, ATT); patch pbxproj; Podfile `GoogleUserMessagingPlatform ~> 2.3`; `pod install` |
| `verify-game-config.mjs` | Regex extract id/replaySecret từ `src/game/config.ts`; `GET /leaderboards?gameId&page=1&limit=1`; skip khi `SKIP_API_CHECK=true` |
| `update-platform.mjs` | Dry-run/`--apply` copy `src/platform` từ `PLATFORM_SOURCE` (default `../game-starter-kit`) |

---

## 12. Native templates (`native/`)

### `android/MainActivity.java`
- Package `com.studio.gamestarterkit`
- Extends `BridgeActivity`
- Immersive fullscreen (hide status + nav bars; API R+ WindowInsetsController, else SYSTEM_UI flags)

### `android/admob-manifest-snippet.xml`
```xml
<meta-data android:name="com.google.android.gms.ads.APPLICATION_ID" android:value="${ADMOB_ANDROID_APP_ID}"/>
```

### `ios/FullscreenBridgeViewController.swift`
- `CAPBridgeViewController` subclass
- `prefersStatusBarHidden = true`, `prefersHomeIndicatorAutoHidden = true`

### `ios/Main.storyboard`
- Initial VC: `FullscreenBridgeViewController`, module `App`

### `ios/admob-info-snippet.plist`
- `GADApplicationIdentifier`, `NSUserTrackingUsageDescription`, `SKAdNetworkItems` (`cstr6suwn9.skadnetwork`)

---

## 13. Static assets

### `public/assets/ui/` (load trong PreloadScene)
- `home-screen-background.jpeg`
- `play-button-background.webp`
- `play-button-icon.webp`

### `resources/logo.webp`
Source cho `capacitor-assets generate`.

---

## 14. i18n locale keys (structure)

Cả `en.json` và `vi.json` phải có cùng key structure:

```
common.{ok,cancel,close,loading,error}
home.{play,playBadge,shop,settings,leaderboard,dailyReward,missions,modal,modalMessage}
game.{score,gameOver,retry,home,leaderboard}
shop.{title,buy,owned,restore,purchaseSuccess,purchaseFailed,restoreSuccess,restoreEmpty,currency.{coins,iap},items.{skin_blue,skin_gold,boost_double,remove_ads}.{name,description}}
settings.{title,language,languageEn,languageVi,sound,music,vibration,graphics,signIn,signInGoogle,signInApple,termsPrivacy,howToPlay,back}
missions.{title,claim,claimed,progress,reward,claimSuccess,claimFailed,dailyMission,watchAd3}
dailyReward.{title,claim,day,coins,random,chest,claimed,comeBack,claimSuccess,chestSuccess,timeManipulated}
leaderboard.{title,global,weekly,refresh,retry,rank,empty,you,anonymous,rankUnavailable,error,offline,cached,updatedAgo,pageInfo,prevPage,nextPage}
legal.{title,tabTerms,tabPrivacy,termsContent,privacyContent}
howToPlay.{title,content}
```

`vi.json` = bản dịch đầy đủ. `legal` và `howToPlay` content là multi-paragraph strings.

---

## 15. `src/vite-env.d.ts`

Khai báo `ImportMetaEnv` với tất cả `VITE_*` vars (required + optional) như trong `.env.example`. Thêm `VITE_API_URL?: string`.

---

## 16. Conventions & patterns

| Pattern | Quy tắc |
|---------|---------|
| Singleton services | `export const shop = new ShopService()` |
| Module structure | `*.service.ts`, `*.repository.ts`, `*.controller.ts`, `*.model.ts`, `index.ts` |
| Controller | `bind(events): () => void` returns unsub; App tracks for destroy |
| Barrel exports | Mỗi subsystem có `index.ts` re-export types + singletons |
| Game↔Platform | Chỉ qua eventBus emit (game) / subscribe (platform) |
| Persistence | SaveService cho store state; module-specific keys trong Preferences |
| i18n import | Game/UI: `@platform/ui` (re-export `t`) |
| Tests | Vitest, co-located `*.test.ts`; no separate vitest.config (defaults) |
| Comments | File-level doc comments; một số Vietnamese comments trong ads/docs |

---

## 17. Documentation files

Tạo các file sau (nội dung tham chiếu từ repo gốc hoặc tóm tắt từ spec này):

- `README.md` — quick start, tech stack, env vars, scripts, mobile deployment
- `ARCHITECTURE.md` — 5-layer architecture, data flow, scene flow, module table
- `CONTRIBUTING.md` — dev setup, game layer rules, module checklist, provider swapping
- `documents/setup/{environment-variables,game-configuration,mobile-build}.md`
- `documents/modules/{game-result-sync,guest-identity,leaderboard}.md`
- `documents/architecture/runtime-architecture.md`
- `documents/platform-versioning.md`

---

## 18. Verification checklist

Sau khi tái tạo repo, chạy tuần tự:

```bash
npm install
cp .env.example .env
npm run lint          # tsc + eslint — phải pass
npm run test          # vitest — replay hash vectors + game-sync service tests pass
npm run build         # tsc + vite build → dist/
SKIP_API_CHECK=true npm run game:verify-config
npm run dev           # http://localhost:5173 — Boot → Preload → Home
```

**Functional smoke test:**
- [ ] Home screen hiển thị với background + play button
- [ ] Gameplay tap-to-jump hoạt động, score cập nhật
- [ ] Game over → retry/home
- [ ] Shop/Missions/Leaderboard/DailyReward/Settings scenes mở được
- [ ] Language switch en↔vi restart scene
- [ ] `npm run build:android` / `build:ios` không lỗi (cần Android SDK / Xcode)

---

## 19. Thứ tự build cho AI agent

1. **Scaffold root:** `package.json`, `tsconfig.json`, `vite.config.ts`, `capacitor.config.ts`, `eslint.config.js`, `.prettierrc`, `.prettierignore`, `.gitignore`, `index.html`, `.env.example`, `.github/workflows/ci.yml`
2. **Contracts & scripts:** `contracts/*.json`, `scripts/*.mjs`, `native/**`
3. **Platform core:** `src/platform/core/**` (events → state → config → storage → api → analytics → advertising → error → services → utils)
4. **Platform modules:** i18n (+ locales) → save → settings → shop → missions → guest → leaderboard → daily-rewards → game-sync (+ tests) → ads → iap
5. **Platform UI:** button → screen → modal → toast → hud → panels
6. **Bootstrap:** capacitor → analytics → ads → iap → App → GameEngine
7. **Game layer:** config → ObjectPool → scenes (Boot → Preload → Home → Gameplay → GameOver → wrappers)
8. **Entry:** `src/main.ts`, `src/vite-env.d.ts`, `src/platform/index.ts`
9. **Assets:** `public/assets/ui/*`, `resources/logo.webp`
10. **Docs:** README, ARCHITECTURE, CONTRIBUTING, documents/**
11. **Verify:** `npm install && npm run lint && npm run test && npm run build`

> **Lưu ý:** Toàn bộ implementation chi tiết của từng file `.ts` nằm trong source repo gốc. Spec này định nghĩa **cấu trúc, interface, hành vi, và config** chính xác. Khi tái tạo, implement từng file theo mô tả ở các section 6–10; nếu có ambiguity, ưu tiên khớp với contracts (`contracts/*.json`) và tests (`game-sync.*.test.ts`).

---

## 20. Backend integration summary

| Feature | Endpoint | Auth |
|---------|----------|------|
| Guest init | `POST /guest/init` `{installId}` | false |
| Guest rename | `PATCH /guest/name` | false |
| Game sync | `POST /games/:gameId/results` `{guestId, results[]}` | false |
| Leaderboard | `GET /leaderboards?gameId&page&limit&guestId` | false |

`gameId` + `replaySecret` từ `src/game/config.ts` phải tồn tại trong backend `games` table.

Response envelope: `{ success, statusCode, message, data, path, timestamp }`.
