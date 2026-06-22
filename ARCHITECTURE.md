# Architecture

## Overview

The Game Starter Kit is a **reusable internal game platform**, not a single game. It separates concerns into four layers so new games only implement gameplay while inheriting all platform systems.

```
┌─────────────────────────────────────────────┐
│              GAME LAYER                      │
│  scenes / entities / systems / prefabs       │
│  Rules: events only, no platform imports     │
├─────────────────────────────────────────────┤
│              CORE SDK LAYER                  │
│  events / state / config / storage / api     │
│  analytics / ads / iap / utils / services    │
├─────────────────────────────────────────────┤
│              APP LAYER                       │
│  i18n / shop / missions / leaderboard        │
│  settings / daily-rewards / save             │
├─────────────────────────────────────────────┤
│           INFRASTRUCTURE LAYER               │
│  GameEngine / Capacitor / API contracts      │
└─────────────────────────────────────────────┘
```

## Design Principles

| Principle | Implementation |
|-----------|---------------|
| Modularity | Each module is self-contained with a service class |
| Reusability | Core SDK shared across all games |
| Event Driven | Typed EventBus decouples game from platform |
| Data Driven | Shop catalog, missions defined in JSON |
| Offline First | Local save, offline queue for leaderboard |
| Mobile Performance | Object pooling, lazy load, 60 FPS target |
| Easy Cloning | Copy `game-template/` folder to start a new game |

## Layer 1: Game Layer

**Location:** `src/games/<game-id>/`

```
games/
  game-example/
    scenes/
      BootScene.ts      # Platform init hook
      PreloadScene.ts   # Asset loading
      HomeScene.ts      # Main menu
      GameplayScene.ts  # Core gameplay (YOUR CODE)
      GameOverScene.ts  # Results screen
    assets/
    index.ts            # Config + scene exports
  game-template/        # Copy this folder to create a new game
```

### Contract

```typescript
interface IGame {
  init(): Promise<void>;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
}
```

### Communication

Games communicate exclusively via the Event Bus:

```typescript
eventBus.emit('game:start', { gameId: 'my-game' });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('jump', { count: 1 });
eventBus.emit('collect', { itemId: 'coin', count: 1 });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

### Forbidden in Game Layer

- `fetch()` / API calls
- `localStorage` / `indexedDB`
- Analytics, ads, IAP imports
- Mission or leaderboard logic
- Direct Zustand store mutations

## Layer 2: Core SDK

**Location:** `src/core/`

### Event Bus (`core/events`)

Typed pub/sub with `emit`, `on`, `off`, `once`.

```typescript
const unsub = eventBus.on('coin:add', ({ amount }) => {
  store.addCoins(amount);
});
eventBus.emit('coin:add', { amount: 10 });
unsub();
```

### Global Store (`core/state`)

Zustand store with persisted slices:

- `user` — player identity
- `currency` — coins, gems
- `inventory` — owned items
- `progress` — level, high score
- `settings` — language, audio, graphics
- `missions` — mission progress
- `dailyRewards` — streak state
- `leaderboard` — cached rankings

### Config (`core/config`)

Environment-aware runtime config:

```typescript
{
  apiUrl: string;
  adsEnabled: boolean;
  analyticsEnabled: boolean;
  iapEnabled: boolean;
  debug: boolean;
  gameId: string;
  version: string;
}
```

Environments: `dev`, `staging`, `production`.

### Storage (`core/storage`)

Abstraction over three providers:

| Provider | Use Case |
|----------|----------|
| `localStorage` | Settings, small data |
| `indexedDB` | Game saves, large data |
| `memory` | Runtime cache, tests |

### API Client (`core/api`)

- Request/response interceptors
- Automatic retry with backoff
- Configurable timeout
- Bearer auth support
- NestJS REST compatible

### Provider Interfaces

**Analytics** — `IAnalyticsProvider`
- Events: `session_start`, `game_start`, `level_complete`, `purchase`, `ad_reward`
- Default: `ConsoleAnalyticsProvider`

**Ads** — `IAdsProvider`
- Types: `rewarded`, `interstitial`, `banner`
- Default: `MockAdsProvider`

**IAP** — `IIapProvider`
- `purchase`, `restore`, `verify`
- Default: `MockIapProvider`

### Error System (`core/error`)

- `Logger` — environment-aware log levels
- `ErrorBoundary` — capture and wrap functions
- `reportCrash` — pluggable crash reporters
- Global `window.error` and `unhandledrejection` handlers

## Layer 3: App Modules

**Location:** `src/app/modules/`

### Localization

```
i18n/en.json
i18n/vi.json
```

```typescript
await i18n.setLanguage('vi');
t('shop.buy');  // "Mua"
```

Features: runtime switch, fallback language, lazy load.

### Shop (Data Driven)

```
shop/catalog.json    # Item definitions
shop/shop.service.ts # Purchase logic
```

Item types: `skin`, `boost`, `currency` (IAP).

### Missions (Data Driven)

```
missions/missions.json     # Mission definitions
missions/mission.service.ts # Event listener + progress
```

Mission types: `daily`, `weekly`, `permanent`.

Game emits `jump`, `score:update`, `collect` → missions auto-track.

### Leaderboard

- Boards: `daily`, `weekly`, `allTime`
- Optimistic UI updates
- Offline submission queue
- Local cache (60s TTL)

### Daily Rewards

- 7-day calendar with escalating rewards
- Streak tracking
- 24h cooldown
- Server timestamp compatible

### Save System

| Mode | Method |
|------|--------|
| Local | `saveLocal()` → IndexedDB |
| Cloud | `saveCloud()` → REST API |
| Sync | `sync()` → conflict resolution |

Conflict resolution: **latest timestamp wins**.

### Settings

Persisted: language, sound, music, vibration, graphics quality.

## Layer 4: Infrastructure

**Location:** `src/infrastructure/`

- `GameEngine.ts` — Phaser bootstrap, game registry, app init
- `api-contracts.ts` — NestJS DTO definitions and route map

## UI Framework

**Location:** `src/ui/`

```
ui/
  screen/    # ScreenManager (open, close, replace)
  modal/     # Modal overlays
  toast/     # Toast notifications
  dialog/    # Confirm dialogs
  popup/     # Custom popups
  hud/       # In-game HUD (coins, score, gems)
```

All UI components are Phaser `Container`-based, working natively in the game canvas.

```typescript
screenManager.open('modal', { message: 'Hello' });
screenManager.replace('shop');
toast.show({ message: '+50 coins', type: 'success' });
```

## Data Flow

```
Player taps screen
    ↓
GameplayScene emits eventBus.emit('jump')
    ↓
MissionService increments jump mission progress
    ↓
PlatformStore updates mission state
    ↓
UI re-renders mission progress (if visible)

Player dies
    ↓
GameplayScene emits eventBus.emit('game:over', { score })
    ↓
App layer: analytics.track, leaderboard.submitScore, saveService.saveLocal
    ↓
GameOverScene displays results
```

## Game Registry

```typescript
registerGame({
  config: gameExampleConfig,
  scenes: gameExampleScenes,
});

const active = getActiveGame(); // reads VITE_GAME_ID
```

## Performance Strategy

| Technique | Where |
|-----------|-------|
| Code splitting | Vite manual chunks (phaser, vendor) |
| Object pooling | `core/utils/ObjectPool` |
| Asset cache | `core/utils/AssetCache` |
| Lazy i18n | Dynamic `import()` per language |
| Scene lazy load | Per-game scene registration |
| Zustand partialize | Only persist necessary slices |

## Adding a New Module

**Target: < 2 hours.**

1. Create `src/app/modules/<name>/<name>.service.ts`
2. Define data in JSON if applicable
3. Subscribe to relevant events in `init()`
4. Register in `src/app/App.ts`
5. Add i18n keys to `src/i18n/en.json` and `src/i18n/vi.json`

## Technical Decisions

| Decision | Rationale |
|----------|-----------|
| Phaser 3 | Mature 2D engine, large community, mobile-ready |
| Zustand over Redux | Minimal boilerplate, TypeScript-first, persist middleware |
| Event Bus over direct imports | Enforces game/platform boundary |
| JSON-driven shop/missions | Designers can edit without code changes |
| Capacitor over Cordova | Modern native bridge, active development |
| Vite over Webpack | Fast HMR, ESM-native, smaller config |
| Provider pattern for ads/IAP/analytics | Swap vendors per game without code changes |
| IndexedDB for saves | Larger capacity than localStorage |
| Offline queue for leaderboard | Mobile networks are unreliable |
