# Architecture

## Overview

The Game Starter Kit is a **clone-per-game starter template**. Each game is a separate repository cloned from this kit. Source code is organized into **`platform/`** (shared systems, do not modify often) and **`game/`** (your gameplay).

```
┌─────────────────────────────────────────────┐
│            GAME LAYER (src/game/)            │
│  config / scenes / utils                     │
├─────────────────────────────────────────────┤
│         PLATFORM UI (src/platform/ui/)       │
│  panels / hud / toast / audio / button / screen │
├─────────────────────────────────────────────┤
│      PLATFORM MODULES (src/platform/modules/)│
│  i18n / shop / missions / leaderboard / save │
│  settings / daily-reward / guest / game-sync│
│  notifications / navigation / ads (module) / iap (module)    │
├─────────────────────────────────────────────┤
│        PLATFORM CORE (src/platform/core/)    │
│  events / state / config / storage / api     │
│  analytics / advertising / error             │
│  services (locator)                          │
├─────────────────────────────────────────────┤
│     BOOTSTRAP (src/platform/bootstrap/)      │
│  App / GameEngine / analytics / ads / capacitor│
└─────────────────────────────────────────────┘
```

## Directory Layout

```
src/
├── main.ts
├── game/                        # Customize per project
│   ├── config.ts                # name, version, screen size; id/replaySecret from .env
│   ├── utils/
│   │   └── ObjectPool.ts
│   └── scenes/
│       ├── index.ts             # Scene registry for Phaser
│       ├── BootScene.ts
│       ├── PreloadScene.ts
│       ├── HomeScene.ts
│       ├── GameplayScene.ts
│       ├── GameOverScene.ts
│       ├── ShopScene.ts
│       ├── MissionsScene.ts
│       ├── LeaderboardScene.ts
│       ├── DailyRewardScene.ts
│       ├── SettingsScene.ts
│       ├── HowToPlayScene.ts
│       └── LegalScene.ts
└── platform/
    ├── index.ts
    ├── core/
    │   ├── analytics/           # AnalyticsService + Console/Firebase providers
    │   ├── advertising/         # AdsService, AdStateMachine, Mock/AdMob providers
    │   ├── api/                 # ApiClient, envelope types
    │   ├── config/              # ENV_CONFIGS, Firebase/AdMob resolution
    │   ├── error/               # Logger, error boundary, global handlers
    │   ├── events/              # Typed EventBus + PlatformEventMap
    │   ├── services/            # Service locator (`services.events`, etc.)
    │   ├── state/               # Zustand vanilla store (in-memory)
    │   ├── storage/             # StorageService + providers
    │   └── utils/
    ├── modules/
    │   ├── i18n/                # i18n.service.ts + locales/en.json, vi.json
    │   ├── shop/                # shop.service.ts + catalog.json
    │   ├── missions/            # mission.service.ts + missions.json
    │   ├── leaderboard/         # service + repository + controller + model
    │   ├── daily-reward/          # service + repository + controller + model
    │   ├── save/                # save.service.ts
    │   ├── settings/            # settings.service.ts
    │   ├── guest/               # guest.service.ts, guest.repository.ts, guest.controller.ts
    │   ├── game-sync/           # offline queue + controller
    │   ├── notifications/       # services/ (push, local, device-sync) + controller
    │   ├── navigation/          # navigation.service.ts — scene routing + pending queue
    │   ├── ads/                 # static placement config module + controller
    │   └── iap/                 # purchase flow, entitlements, ads integration
    ├── ui/
    │   ├── button/UIButton.ts   # createUIButton() — optional sound on pointerdown
    │   ├── hud/HUD.ts
    │   ├── screen/ScreenManager.ts
    │   ├── shop/ShopPanel.ts
    │   ├── toast/ToastManager.ts
    │   ├── audio/SoundManager.ts
    │   ├── modal/ModalScreen.ts
    │   ├── missions/MissionsPanel.ts
    │   ├── leaderboard/LeaderboardPanel.ts
    │   ├── daily-reward/DailyRewardPopup.ts
    │   ├── settings/LanguageSettingsPanel.ts
    │   ├── settings/SoundSettingsPanel.ts
    │   ├── how-to-play/HowToPlayPanel.ts
    │   ├── legal/LegalPanel.ts
    │   ├── modal/ModalScreen.ts
    │   └── index.ts             # FREDOKA_FONT, NUNITO_FONT + barrel exports
    └── bootstrap/
        ├── App.ts               # Module wiring, event handlers, lifecycle
        ├── GameEngine.ts        # Phaser bootstrap, fonts, toast + sound init
        ├── analytics.ts         # registerAnalyticsProviders()
        ├── ads.ts               # registerAdsProvider()
        ├── iap.ts               # registerIapProvider()
        └── capacitor.ts         # Native plugins, splash, appStateChange

native/                          # Templates applied on build:android / build:ios
                                 # (immersive UI, FCM, AdMob only — not RevenueCat/IAP/Preferences)
scripts/                         # apply-*-native.mjs, native-ops.mjs, capacitor-config.mjs
public/assets/                   # Static assets (per-game)
  images/                        # UI/game art
  audio/                         # SFX (pop-sound-effect, coin-drop, …)
```

## Path Aliases

| Alias                   | Resolves to                              |
| ----------------------- | ---------------------------------------- |
| `@platform/core/*`      | `src/platform/core/*`                    |
| `@platform/modules`     | `src/platform/modules/index.ts` (barrel) |
| `@platform/modules/*`   | `src/platform/modules/*`                 |
| `@platform/ui/*`        | `src/platform/ui/*`                      |
| `@platform/bootstrap/*` | `src/platform/bootstrap/*`               |
| `@game/*`               | `src/game/*`                             |

Vite also exposes bare aliases (`@game`, `@platform/ui`, …) for directory imports.

## Design Principles

| Principle          | Implementation                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------- |
| Clone per game     | One repo = one game; clone this kit to start                                                  |
| Modularity         | Each platform module is self-contained; network modules use service + repository + controller |
| Reusability        | `src/platform/` ships with every cloned project                                               |
| Event driven       | Typed EventBus decouples game from platform                                                   |
| Data driven        | Shop catalog, missions defined in JSON                                                        |
| Offline first      | Local save + offline queues (game-sync, leaderboard cache)                                    |
| Mobile performance | Object pooling, lazy locale chunks, 60 FPS target                                             |
| Single persistence | SaveService owns durable state; store is in-memory                                            |

## Layer 1: Game Layer

**Location:** `src/game/`

Games communicate with the platform via the **Event Bus**:

```typescript
import { eventBus, AnalyticsEvents } from '@platform/core/events';
import { gameConfig } from '@game/config';

eventBus.emit('game:start', { gameId: gameConfig.id });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
eventBus.emit('analytics', { event: AnalyticsEvents.GAME_START });
```

### Game layer guidelines

| Preferred                                  | Avoid                                              |
| ------------------------------------------ | -------------------------------------------------- |
| `@platform/core/events` (emit)             | `@platform/core/api`                               |
| `@game/*`                                  | `@platform/core/storage`                           |
| Phaser APIs                                | Direct store mutations (`@platform/core/state`)    |
| `@platform/ui/*` (HUD, toast, panels, `t`) | `@platform/modules/*`                              |
| `@game/utils/*` (e.g. `ObjectPool`)        | `@platform/core/utils`                             |
|                                            | `@platform/core/advertising`                       |
|                                            | `@platform/core/analytics` (use `analytics` event) |
|                                            | `@platform/core/config`, `@platform/core/error`    |

ESLint enforces these rules for `src/game/**/*.ts` via `no-restricted-imports` in `eslint.config.js`.

**i18n:** Import `t` from `@platform/ui` — it re-exports from `@platform/modules/i18n`.

## Layer 2: Platform Core

**Location:** `src/platform/core/`

| System           | Role                                                                                   |
| ---------------- | -------------------------------------------------------------------------------------- |
| **Event Bus**    | Typed pub/sub between game, UI, modules, and bootstrap                                 |
| **Global Store** | Zustand vanilla store — **in-memory only** (no persist middleware)                     |
| **SaveService**  | Durable local persistence via StorageService (Preferences on native, IndexedDB on web) |
| **Config**       | `dev` / `staging` / `production` runtime config + env resolution                       |
| **Storage**      | `StorageService` with localStorage, IndexedDB, Preferences, memory providers           |
| **API Client**   | REST client with retry, timeout, auth token, interceptors                              |
| **Services**     | `services` locator — single access point for ads, iap, api, events, analytics, storage |
| **Error**        | Logger, `errorBoundary`, global unhandled-rejection handlers                           |
| **Providers**    | Analytics, advertising (Mock/AdMob), IAP — swappable interfaces                        |

### Persistence model

```
Runtime state  →  usePlatformStore (Zustand, in-memory)
                        ↕ hydrate / extractSaveableState
Durable save   →  saveService (key: game-save)
                        ↕ StorageService durable provider
                        (Capacitor Preferences on native, IndexedDB on web)
```

- On boot: `saveService.loadLocal()` hydrates the store before `dailyRewards.init()`, `settings.init()`, and `missions.init()`. Legacy IndexedDB saves on native are migrated to Preferences automatically.
- On `game:over`, `settings:change`, `shop:purchase`, `game:destroy`, and app background: `saveService.saveLocal()`. Native background uses Capacitor `appStateChange`; web uses `document.visibilitychange`.
- Settings and daily-reward progress live in store state — persisted through SaveService, not separate keys.

## Layer 3: Platform Modules

**Location:** `src/platform/modules/`

| Module        | Key files                                                                                                      |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| i18n          | `i18n/i18n.service.ts` + `i18n/locales/*.json`                                                                 |
| shop          | `shop/shop.service.ts` + `shop/catalog.json`                                                                   |
| missions      | `missions/mission.service.ts` + `missions/missions.json`                                                       |
| leaderboard   | `leaderboard.service.ts`, `.repository.ts`, `.controller.ts`, `.model.ts`                                      |
| settings      | `settings/settings.service.ts`                                                                                 |
| daily-reward  | `daily-reward.service.ts`, `.repository.ts`, `.controller.ts`, `.model.ts`                                     |
| save          | `save/save.service.ts`                                                                                         |
| guest         | `guest.service.ts`, `guest.repository.ts`, `guest.controller.ts` — lazy `POST /guest/init`, offline name queue |
| game-sync     | Offline match queue → `POST /results`; controller on `game:over`                                               |
| notifications | Push (FCM) + local daily reward; `notification.controller.ts` on lifecycle                                     |
| navigation    | `navigation.service.ts` — tap notification → Phaser scene; pending on cold start                               |
| ads (module)  | Remote ad config, reward handling; `bindAdsController(events)`                                                 |

**Controller pattern:** `guestController`, `leaderboardController`, `gameSyncController`, `dailyRewardController`, `notificationController`, and `bindAdsController` subscribe to the event bus in `App.init()` and bridge UI/lifecycle events to services. UI panels emit/request events; they do not call the API directly.

Modules are initialized in `bootstrap/App.ts`. Mission progress is **merged** with saved state on init (not reset).

## Layer 4: Platform UI

**Location:** `src/platform/ui/`

Phaser-native UI building blocks. Most features are **full scenes** in `src/game/scenes/` that embed **panels**:

| Component                       | Purpose                                                                                                 |
| ------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `ScreenManager` / `BaseScreen`  | Overlay stack; `register()`, `open()`, `close()`, `unregisterForScene()`                                |
| `createUIButton`                | Shared button factory; plays SFX on `pointerdown` (`sound`: `'pop'` default, `'coin-drop'`, or `false`) |
| `HUD`                           | Score, coins — subscribes to store                                                                      |
| `ToastManager`                  | Queued toasts; bound to `Phaser.Game` in `GameEngine`                                                   |
| `SoundManager`                  | SFX singleton (`playPop`, `playCoinDrop`); respects `settings.soundEnabled`                             |
| `ShopPanel`                     | Shop UI embedded in `ShopScene`                                                                         |
| `MissionsPanel`                 | Mission list UI                                                                                         |
| `LeaderboardPanel`              | Paginated leaderboard UI                                                                                |
| `DailyRewardPopup`              | Daily reward claim UI                                                                                   |
| `LanguageSettingsPanel`         | Language picker                                                                                         |
| `SoundSettingsPanel`            | Sound on/off toggle in `SettingsScene`                                                                  |
| `HowToPlayPanel` / `LegalPanel` | Help and legal copy                                                                                     |
| `ModalScreen`                   | Reusable overlay (registered on `HomeScene`)                                                            |

Import from `@platform/ui` or `@platform/ui/<component>`.

## Layer 5: Bootstrap

**Location:** `src/platform/bootstrap/`

| File            | Role                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------- |
| `App.ts`        | Initializes modules, binds event bus handlers, lifecycle                                             |
| `GameEngine.ts` | Sets config from `gameConfig`, runs `app.init()`, creates Phaser game, `navigationService.setGame()` |
| `analytics.ts`  | Registers Console + Firebase analytics providers                                                     |
| `ads.ts`        | Registers Mock or AdMob provider based on platform + env                                             |
| `capacitor.ts`  | Status bar, back button, `appStateChange` → `app:pause` / `app:resume`                               |

**Entry point:** `src/main.ts` → `gameEngine.bootstrap()`

### App initialization order

```
1. Ensure user id in store (generateId if missing)
2. registerAnalyticsProviders()
3. registerAdsProvider()
4. apiClient.setAuthRecoveryHandler(() => guest.recoverFromUnauthorized())
5. Parallel (Promise.allSettled): i18n, ads, guest, analytics, leaderboard init
6. guest.onReady → analytics.setUserId when guest becomes ready
7. registerIapProvider(analyticsUserId) + iap.initialize()
8. adsModule.init() (static ad placement config)
9. analytics.setUserId() + setUserProperty('game_id')
10. saveService.loadLocal()        ← hydrate store
11. syncGuestToStore()             ← hydrate display name from guest credentials
12. dailyRewards.init()
13. settings.init()
14. missions.init()
15. bindPlatformEvents()
16. Bind controllers: guest, dailyReward, leaderboard, gameSync, ads, IAP, missions, **notifications**
17. bindLifecycle() (web visibility)
```

`GameEngine.bootstrap()` calls `setConfig(createConfig({ gameId: gameConfig.id, replaySecret: gameConfig.replaySecret }))`, `refreshServicesFromConfig()`, then `app.init()` **before** creating the Phaser game. After `new Phaser.Game()`, `navigationService.setGame(game)` runs so notification tap can navigate. `toast.init(game)` and `soundManager.init(game)` run next. Audio files are preloaded in `PreloadScene`. When assets finish loading, `PreloadScene.create()` reads the pending boot destination via `getBootNavigationTarget()`, emits `boot:preload-complete` (which calls `navigationService.markBootComplete()`), then starts the target scene. `SoundManager` reads `settings.soundEnabled` from the store before playing.

`BootScene` emits `app:ready` → `App.ts` hides native splash and requests APP_START/HOME ads.

## Data Flow

### Gameplay → UI

```
Player action in GameplayScene
    ↓
eventBus.emit('coin:add', { amount: 5 })
    ↓
App.ts handler → usePlatformStore.addCoins()
    ↓
HUD subscribes to store → UI updates
```

### Game over → sync + save

```
eventBus.emit('game:over', { score, duration })
    ↓
App.ts → trackGameOver + saveLocal + GAME_OVER ad placement
gameSyncController → recordResult (local queue) → flush when online/guest ready
gameSyncService → emit game:synced on successful batch upload
```

### Settings → persistence

```
settings.setLanguage('vi')
    ↓
store.updateSettings() + i18n.setLanguage()
    ↓
eventBus.emit('settings:change', …)
    ↓
App.ts → saveService.saveLocal()
```

## Scene Flow

```
Boot → Preload → Home (hoặc scene từ notification tap nếu có pending)
                  ├→ Gameplay → GameOver → Home / Gameplay
                  ├→ Shop
                  ├→ Missions
                  ├→ Leaderboard   ← push: Top 100, Saturday rank
                  ├→ DailyReward   ← local: daily reward reminder
                  ├→ Settings → HowToPlay / Legal
                  └→ (modal overlay via screenManager on Home)
```

Notification tap dùng **in-app navigation** (`type` + `route` trong FCM `data` / local `extra`), không dùng deeplink URL. Cold start: `navigationService` defer cho đến `boot:preload-complete` (listener trong `navigation.service.ts` gọi `markBootComplete()`).

`HomeScene` registers `ModalScreen` with `screenManager` and calls `screenManager.unregisterForScene(this)` on shutdown.

## Analytics

- **Dev:** Console provider only (`analyticsEnabled: false` in `ENV_CONFIGS.dev`).
- **Staging / production:** Console + `FirebaseAnalyticsProvider` when `VITE_FIREBASE_*` env vars are set.
- **Game layer:** `eventBus.emit('analytics', { event: AnalyticsEvents.… })` or helpers in `@platform/core/analytics/events` from bootstrap/App handlers.

Firebase DebugView: run a staging build with analytics enabled and use the Firebase console.

## Advertising

- **Web / dev:** `MockAdsProvider` (or AdMob mock path via `VITE_ADS_PROVIDER=mock`).
- **Native + `VITE_ADS_PROVIDER=admob`:** `AdMobAdsProvider` via `@capacitor-community/admob`.
- **Missing `VITE_ADMOB_*_APP_ID` on a platform:** that platform uses Google's official test ad unit IDs (no real account needed).
- **Placements:** `ad:show:request`, `ad:reward:request` — handled by `AdsService` + `ads` module controller.
- **Ad placement config:** `adsModule` applies the bundled placement and reward rules. Add a backend config endpoint before treating ad rules as remotely managed.

Native AdMob app IDs and manifest snippets are applied by `scripts/apply-android-native.mjs` / `apply-ios-native.mjs` from `native/`.

## Notifications

- **Push (FCM):** `@capacitor/push-notifications` — staging/production native when `pushNotificationsEnabled` + đủ `VITE_FIREBASE_*`. Token sync qua `POST/PATCH /api/devices`.
- **Local:** `@capacitor/local-notifications` — daily reward reminder 07:00 ngày hôm sau (`localNotificationsEnabled`; bật cả trên `dev`).
- **Backend triggers:** Top 100 entered/exited, Saturday rank broadcast (xem `game-api` Devices API).
- **Tap handling:** FCM `data` / local `extra` → `resolveNotificationRoute()` → `navigationService.navigateToScene()`. Không dùng deeplink URL.
- **Cold start:** Pending navigation queue cho đến `boot:preload-complete`. `PreloadScene` emit event sau khi assets load; `navigationService` subscribe event để `markBootComplete()` và clear pending.
- **Setup:** [documents/setup/firebase-native.md](./documents/setup/firebase-native.md), [documents/modules/notifications.md](./documents/modules/notifications.md).

## Starting a New Game

1. Clone this repo: `git clone <url> my-new-game`
2. Copy `.env.example` → `.env`; set `VITE_GAME_ID` and `VITE_REPLAY_SECRET`
3. Update `src/game/config.ts` (`name`, `version`, `width`, `height`)
4. Update `capacitor.config.ts` (appId, appName)
5. Implement gameplay in `src/game/scenes/GameplayScene.ts`
6. Load assets in `PreloadScene.ts`; place images under `public/assets/images/` and audio under `public/assets/audio/`
7. Configure AdMob/Firebase env vars and native FCM files for push on release builds (see `documents/setup/firebase-native.md`)

## Adding a New Platform Module

1. Create `src/platform/modules/<name>/<name>.service.ts`
2. Add repository/controller if the module talks to the API or event bus
3. Add JSON data if applicable
4. Call `init()` in `bootstrap/App.ts`
5. Wire event bus subscriptions (service or controller)
6. Add i18n keys to `src/platform/modules/i18n/locales/en.json` and `vi.json`
7. Export from `src/platform/modules/index.ts`

## Technical Decisions

| Decision                          | Rationale                                                     |
| --------------------------------- | ------------------------------------------------------------- |
| Clone-per-game                    | Each game is independent; no multi-game monorepo              |
| `platform/` root folder           | Single home for all shared code                               |
| `game/` not `games/`              | Singular — one game per repo                                  |
| Controller + repository           | Keeps API/offline logic out of UI and game scenes             |
| `@platform/ui` i18n re-export     | Game/UI import `t` without touching modules                   |
| `advertising/` not `ads/`         | Avoids browser ad-blocker URL filtering in dev                |
| `ads/` module vs core advertising | Core = provider SDK; module = placement config + event wiring |
| Zustand vanilla                   | No React dependency with Phaser                               |
| SaveService over store persist    | One local persistence path; native-durable via Preferences    |
| Provider pattern                  | Swap AdMob/Firebase/RevenueCat per game                       |
| Event Bus                         | Enforces game/platform boundary                               |
| `native/` + apply scripts         | Repeatable Capacitor native customizations per build          |

## Related docs

- [README.md](./README.md) — quick start, env vars, deployment, scripts
