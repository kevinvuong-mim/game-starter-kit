# Architecture

## Overview

The Game Starter Kit is a **clone-per-game starter template**. Each game is a separate repository cloned from this kit. Source code is organized into **`platform/`** (shared systems, do not modify often) and **`game/`** (your gameplay).

```
┌─────────────────────────────────────────────┐
│            GAME LAYER (src/game/)            │
│  config / scenes / entities / systems        │
├─────────────────────────────────────────────┤
│         PLATFORM UI (src/platform/ui/)     │
│  modal / toast / dialog / hud / screen       │
├─────────────────────────────────────────────┤
│      PLATFORM MODULES (src/platform/modules/)│
│  i18n / shop / missions / leaderboard / save │
├─────────────────────────────────────────────┤
│        PLATFORM CORE (src/platform/core/)    │
│  events / state / config / storage / api     │
│  analytics / advertising / iap / utils       │
├─────────────────────────────────────────────┤
│     BOOTSTRAP (src/platform/bootstrap/)      │
│  App / GameEngine / API contracts            │
└─────────────────────────────────────────────┘
```

## Directory Layout

```
src/
├── main.ts
├── game/                        # Customize per project
│   ├── config.ts                # id, name, version, screen size
│   └── scenes/
│       ├── index.ts             # Scene registry for Phaser
│       ├── BootScene.ts
│       ├── PreloadScene.ts
│       ├── HomeScene.ts
│       ├── GameplayScene.ts
│       ├── GameOverScene.ts
│       └── SettingsScene.ts
├── platform/
│   ├── index.ts
│   ├── core/
│   ├── modules/
│   ├── ui/
│   └── bootstrap/
│       ├── App.ts
│       ├── GameEngine.ts
│       └── api-contracts.ts
```

## Path Aliases

| Alias | Resolves to |
|-------|-------------|
| `@platform/core/*` | `src/platform/core/*` |
| `@platform/modules/*` | `src/platform/modules/*` |
| `@platform/ui/*` | `src/platform/ui/*` |
| `@platform/bootstrap/*` | `src/platform/bootstrap/*` |
| `@game/*` | `src/game/*` |

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| Clone per game | One repo = one game; clone this kit to start |
| Modularity | Each platform module is self-contained |
| Reusability | `src/platform/` ships with every cloned project |
| Event Driven | Typed EventBus decouples game from platform |
| Data Driven | Shop catalog, missions defined in JSON |
| Offline First | Local save, offline queue for leaderboard |
| Mobile Performance | Object pooling, lazy load, 60 FPS target |

## Layer 1: Game Layer

**Location:** `src/game/`

Games communicate via the Event Bus:

```typescript
import { eventBus } from '@platform/core/events';
import { gameConfig } from '@game/config';

eventBus.emit('game:start', { gameId: gameConfig.id });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

### Game layer guidelines

- **Primary:** Emit events via `@platform/core/events`
- **Allowed:** Phaser APIs, `@game/*`, `@platform/ui/*` (HUD, toast)
- **Avoid:** Direct `@platform/core/api`, `@platform/core/storage`, store mutations

## Layer 2: Platform Core

**Location:** `src/platform/core/`

- **Event Bus** — typed pub/sub
- **Global Store** — Zustand vanilla store
- **Config** — `dev` / `staging` / `production` runtime config
- **Storage** — localStorage, IndexedDB, memory providers
- **API Client** — REST client with retry, timeout, auth interceptors
- **Providers** — analytics, advertising, IAP (swappable interfaces)

## Layer 3: Platform Modules

**Location:** `src/platform/modules/`

| Module | Files |
|--------|-------|
| i18n | `i18n/i18n.service.ts` + `i18n/locales/*.json` |
| shop | `shop/shop.service.ts` + `shop/catalog.json` |
| missions | `missions/mission.service.ts` + `missions/missions.json` |
| leaderboard | `leaderboard/leaderboard.service.ts` |
| settings | `settings/settings.service.ts` |
| daily-rewards | `daily-rewards/daily-reward.service.ts` |
| save | `save/save.service.ts` |

Modules subscribe to events from the game layer and update platform state. Wired in `bootstrap/App.ts`.

## Layer 4: Platform UI

**Location:** `src/platform/ui/`

Phaser-native UI: `ScreenManager`, `ModalScreen`, `ToastManager`, `DialogScreen`, `HUD`, `PopupScreen`.

## Layer 5: Bootstrap

**Location:** `src/platform/bootstrap/`

- **`App.ts`** — initializes modules, binds event bus handlers
- **`GameEngine.ts`** — creates Phaser instance from `src/game/`
- **`api-contracts.ts`** — NestJS-compatible REST DTO definitions

Entry point: `src/main.ts` → `GameEngine.bootstrap()`

## Data Flow

```
Player action in GameplayScene
    ↓
eventBus.emit('coin:add', { amount: 5 })
    ↓
App.ts handler → usePlatformStore.addCoins()
    ↓
HUD subscribes to store → UI updates
```

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

| Decision | Rationale |
|----------|-----------|
| Clone-per-game | Each game is independent; no multi-game monorepo |
| `platform/` root folder | Single home for all shared code |
| `game/` not `games/` | Singular — one game per repo |
| i18n colocated | Service + locale JSON in `modules/i18n/` |
| `advertising/` not `ads/` | Avoids browser ad-blocker URL filtering in dev |
| Zustand vanilla | No React dependency with Phaser |
| Provider pattern | Swap AdMob/Firebase/RevenueCat per game |
| Event Bus | Enforces game/platform boundary |
