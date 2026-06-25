# Architecture

## Overview

The Game Starter Kit is a **clone-per-game starter template**. Each game is a separate repository cloned from this kit. Source code is organized into **`platform/`** (shared systems, do not modify often) and **`game/`** (your gameplay).

```
┌─────────────────────────────────────────────┐
│            GAME LAYER (src/game/)            │
│  config / scenes / utils / systems           │
├─────────────────────────────────────────────┤
│         PLATFORM UI (src/platform/ui/)       │
│  screen / hud / toast / button / shop …    │
├─────────────────────────────────────────────┤
│      PLATFORM MODULES (src/platform/modules/)│
│  i18n / shop / missions / leaderboard / save │
├─────────────────────────────────────────────┤
│        PLATFORM CORE (src/platform/core/)    │
│  events / state / config / storage / api     │
│  analytics / advertising / iap / utils       │
├─────────────────────────────────────────────┤
│     BOOTSTRAP (src/platform/bootstrap/)      │
│  App / GameEngine / analytics / capacitor    │
└─────────────────────────────────────────────┘
```

## Directory Layout

```
src/
├── main.ts
├── game/                        # Customize per project
│   ├── config.ts                # id, name, version, screen size
│   ├── utils/
│   │   └── ObjectPool.ts        # Generic object pool for entities
│   └── scenes/
│       ├── index.ts             # Scene registry for Phaser
│       ├── BootScene.ts
│       ├── PreloadScene.ts
│       ├── HomeScene.ts
│       ├── GameplayScene.ts
│       ├── GameOverScene.ts
│       └── SettingsScene.ts
└── platform/
    ├── index.ts                 # Barrel re-export (optional)
    ├── core/
    ├── modules/
    ├── ui/
    │   ├── button/UIButton.ts   # createUIButton()
    │   ├── hud/HUD.ts
    │   ├── screen/ScreenManager.ts
    │   ├── shop/ShopScreen.ts
    │   ├── toast/ToastManager.ts
    │   ├── modal/ModalScreen.ts
    │   ├── settings/LanguageSettingsPanel.ts
    │   ├── typography.ts        # FREDOKA_FONT, NUNITO_FONT
    │   └── i18n.ts              # Re-export t/i18n for game & UI layers
    └── bootstrap/
        ├── App.ts               # Module wiring, event handlers
        ├── GameEngine.ts        # Phaser bootstrap, font preload, toast init
        ├── analytics.ts         # Analytics provider registration
        └── capacitor.ts         # Capacitor plugin init
```

## Path Aliases

| Alias                   | Resolves to                |
| ----------------------- | -------------------------- |
| `@platform/core/*`      | `src/platform/core/*`      |
| `@platform/modules/*`   | `src/platform/modules/*`   |
| `@platform/ui/*`        | `src/platform/ui/*`        |
| `@platform/bootstrap/*` | `src/platform/bootstrap/*` |
| `@game/*`               | `src/game/*`               |

## Design Principles

| Principle          | Implementation                                     |
| ------------------ | -------------------------------------------------- |
| Clone per game     | One repo = one game; clone this kit to start       |
| Modularity         | Each platform module is self-contained             |
| Reusability        | `src/platform/` ships with every cloned project    |
| Event Driven       | Typed EventBus decouples game from platform        |
| Data Driven        | Shop catalog, missions defined in JSON             |
| Offline First      | IndexedDB save + offline queue for leaderboard     |
| Mobile Performance | Object pooling, lazy load, 60 FPS target           |
| Single persistence | SaveService owns durable state; store is in-memory |

## Layer 1: Game Layer

**Location:** `src/game/`

Games communicate with the platform via the **Event Bus**:

```typescript
import { eventBus } from '@platform/core/events';
import { gameConfig } from '@game/config';

eventBus.emit('game:start', { gameId: gameConfig.id });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

### Game layer guidelines

| Preferred                                            | Avoid                                           |
| ---------------------------------------------------- | ----------------------------------------------- |
| `@platform/core/events` (emit)                       | `@platform/core/api`                            |
| `@game/*`                                            | `@platform/core/storage`                        |
| Phaser APIs                                          | Direct store mutations (`@platform/core/state`) |
| `@platform/ui/*` (HUD, toast, `createUIButton`, `t`) | `@platform/modules/*`                           |
| `@game/utils/*` (e.g. `ObjectPool`)                  | `@platform/core/utils`                          |

ESLint enforces these rules for `src/game/**/*.ts` via `no-restricted-imports` in `eslint.config.js`.

**i18n:** Import `t` from `@platform/ui/i18n`, not from `@platform/modules/i18n` directly.

## Layer 2: Platform Core

**Location:** `src/platform/core/`

| System           | Role                                                                              |
| ---------------- | --------------------------------------------------------------------------------- |
| **Event Bus**    | Typed pub/sub between game, UI, and bootstrap                                     |
| **Global Store** | Zustand vanilla store — **in-memory only** (no persist middleware)                |
| **SaveService**  | Durable persistence via IndexedDB + optional cloud sync (see modules)             |
| **Config**       | `dev` / `staging` / `production` runtime config                                   |
| **Storage**      | `StorageService` with localStorage, IndexedDB, memory providers (used by modules) |
| **API Client**   | REST client with retry, timeout, auth interceptors                                |
| **Providers**    | Analytics, advertising, IAP — swappable interfaces                                |

### Persistence model

```
Runtime state  →  usePlatformStore (Zustand, in-memory)
                        ↕ hydrate / extractSaveableState
Durable save   →  saveService (IndexedDB key: game-save)
                        ↕ optional cloud sync via API
```

- On boot: `saveService.loadLocal()` hydrates the store before `settings.init()` and `missions.init()`.
- On `game:over`, `settings:change`, and app background: `saveService.saveLocal()`.
- Settings are part of store state — **not** persisted separately.

## Layer 3: Platform Modules

**Location:** `src/platform/modules/`

| Module        | Files                                                    |
| ------------- | -------------------------------------------------------- |
| i18n          | `i18n/i18n.service.ts` + `i18n/locales/*.json`           |
| shop          | `shop/shop.service.ts` + `shop/catalog.json`             |
| missions      | `missions/mission.service.ts` + `missions/missions.json` |
| leaderboard   | `leaderboard/leaderboard.service.ts`                     |
| settings      | `settings/settings.service.ts`                           |
| daily-rewards | `daily-rewards/daily-reward.service.ts`                  |
| save          | `save/save.service.ts`                                   |

Modules are initialized and wired in `bootstrap/App.ts`. Mission progress is **merged** with saved state on init (not reset). Settings changes emit `settings:change`, which triggers a local save.

## Layer 4: Platform UI

**Location:** `src/platform/ui/`

Phaser-native UI components:

| Component                      | Purpose                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `ScreenManager` / `BaseScreen` | Screen stack; `register()`, `open()`, `close()`, `unregisterForScene()` |
| `createUIButton`               | Shared button factory (`primary` / `rounded` variants)                  |
| `HUD`                          | Score, coins — subscribes to store                                      |
| `ToastManager`                 | Queued toasts; bound to `Phaser.Game` in `GameEngine`                   |
| `ShopScreen`                   | In-game shop UI                                                         |
| `LanguageSettingsPanel`        | Language picker for Settings scene                                      |
| `ModalScreen`                  | Reusable overlay screen                                                 |

Import from `@platform/ui` or `@platform/ui/<component>`.

## Layer 5: Bootstrap

**Location:** `src/platform/bootstrap/`

| File            | Role                                                     |
| --------------- | -------------------------------------------------------- |
| `App.ts`        | Initializes modules, binds event bus handlers, lifecycle |
| `GameEngine.ts` | Creates Phaser instance, preloads fonts, inits toast     |
| `analytics.ts`  | Registers Console + Firebase analytics providers         |
| `capacitor.ts`  | Capacitor plugin initialization                          |

**Entry point:** `src/main.ts` → `gameEngine.bootstrap()`

### App initialization order

```
1. Ensure user id in store (generateId if missing)
2. registerAnalyticsProviders()
3. Parallel: i18n, analytics, ads, iap, leaderboard, dailyRewards init
4. analytics.setUserId() + setUserProperty('game_id')
5. saveService.loadLocal()        ← hydrate store from IndexedDB
6. settings.init()                ← apply language from store
7. missions.init()                ← merge mission progress with saved state
8. bindPlatformEvents() + bindLifecycle()
```

`GameEngine.bootstrap()` runs `app.init()` **before** creating the Phaser game, then calls `toast.init(game)` once the game instance exists.

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
Boot → Preload → Home ⇄ Settings
                  ↓
              Gameplay → GameOver → Home / Gameplay
```

`HomeScene` registers `ShopScreen` (and optionally `ModalScreen`) with `screenManager` and calls `screenManager.unregisterForScene(this)` on shutdown.

## Starting a New Game

1. Clone this repo: `git clone <url> my-new-game`
2. Update `src/game/config.ts` (id, name, version)
3. Update `capacitor.config.ts` (appId, appName)
4. Implement gameplay in `src/game/scenes/GameplayScene.ts`
5. Add assets in `src/game/scenes/PreloadScene.ts` and `public/`

## Adding a New Platform Module

1. Create `src/platform/modules/<name>/<name>.service.ts`
2. Add JSON data if applicable
3. Call `init()` in `bootstrap/App.ts`
4. Wire event bus subscriptions
5. Add i18n keys to `src/platform/modules/i18n/locales/en.json` and `vi.json`

## Technical Decisions

| Decision                       | Rationale                                        |
| ------------------------------ | ------------------------------------------------ |
| Clone-per-game                 | Each game is independent; no multi-game monorepo |
| `platform/` root folder        | Single home for all shared code                  |
| `game/` not `games/`           | Singular — one game per repo                     |
| i18n colocated                 | Service + locale JSON in `modules/i18n/`         |
| `@platform/ui/i18n` facade     | Game/UI import `t` without touching modules      |
| `advertising/` not `ads/`      | Avoids browser ad-blocker URL filtering in dev   |
| Zustand vanilla                | No React dependency with Phaser                  |
| SaveService over store persist | One persistence path; cloud sync ready           |
| Provider pattern               | Swap AdMob/Firebase/RevenueCat per game          |
| Event Bus                      | Enforces game/platform boundary                  |

## Related docs

- [docs/analytics.md](./docs/analytics.md) — analytics providers, events, Firebase setup
- [README.md](./README.md) — quick start, env vars, deployment
