# Game Starter Kit

Production-grade starter kit for hyper-casual / casual mobile games. **Clone this repo once per game** — each game is its own project with a ready-made platform layer.

## Tech Stack

| Layer       | Technology                                                       |
| ----------- | ---------------------------------------------------------------- |
| Game Engine | Phaser 3                                                         |
| Mobile      | Capacitor 6                                                      |
| Language    | TypeScript (strict)                                              |
| Bundler     | Vite 6                                                           |
| State       | Zustand (vanilla, in-memory)                                     |
| Storage     | IndexedDB (web) / Capacitor Preferences (native)                 |
| Networking  | Fetch API (NestJS-compatible REST envelope)                      |
| Analytics   | Console (dev) + Firebase Analytics (staging/production)          |
| Ads         | Mock (web/dev) + AdMob via `@capacitor-community/admob` (native) |

**Node.js:** `>= 20`

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Open `http://localhost:5173`.

## Create a New Game

**Clone this entire repo** for each new game — do not add multiple games to one codebase.

```bash
git clone <repo-url> my-tap-jump
cd my-tap-jump
npm install
cp .env.example .env
```

Then customize:

1. **`src/game/config.ts`** — set `id`, `name`, `version`, screen size
2. **`capacitor.config.ts`** — set `appId` and `appName`
3. **`src/game/scenes/GameplayScene.ts`** — implement your game mechanics
4. **`src/game/scenes/PreloadScene.ts`** — load your assets
5. Add art/audio under **`public/assets/`** (served at `/assets/…` in dev/build)
6. Run `npm run dev`

## Project Structure

```
game-starter-kit/
├── src/
│   ├── main.ts                # Entry → GameEngine.bootstrap()
│   ├── platform/              # Reusable platform (keep as-is across games)
│   │   ├── core/              # events, state, storage, api, analytics, advertising, iap, error
│   │   ├── modules/           # i18n, shop, missions, leaderboard, save, settings, guest, game-sync, ads
│   │   ├── ui/                # Phaser UI: panels, HUD, toast, screen stack, buttons
│   │   └── bootstrap/         # App, GameEngine, analytics, ads, capacitor
│   └── game/                  # YOUR game — customize per project
│       ├── config.ts          # Game identity & screen size
│       ├── utils/             # e.g. ObjectPool
│       └── scenes/            # Boot → Preload → Home + feature scenes
├── public/assets/             # Static game assets (create per project)
├── native/                    # Native templates applied on cap sync (AdMob, splash, etc.)
├── scripts/                   # apply-android-native.mjs, apply-ios-native.mjs
├── index.html
└── capacitor.config.ts
```

`android/` and `ios/` are generated locally via Capacitor and are **gitignored**.

## Path Aliases

| Alias                   | Path                       |
| ----------------------- | -------------------------- |
| `@platform/core/*`      | `src/platform/core/*`      |
| `@platform/modules/*`   | `src/platform/modules/*`   |
| `@platform/ui/*`        | `src/platform/ui/*`        |
| `@platform/bootstrap/*` | `src/platform/bootstrap/*` |
| `@game/*`               | `src/game/*`               |

## Architecture Layers

```
Game Layer        → src/game/ — gameplay only (scenes, entities, systems)
     ↓ eventBus
Platform UI       → src/platform/ui — Phaser panels, HUD, toast, screen stack
     ↓
Platform Modules  → src/platform/modules — feature services + controllers
     ↓
Platform Core     → src/platform/core — events, state, storage, api, providers
     ↓
Bootstrap         → src/platform/bootstrap — App, GameEngine, provider wiring
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

## Game Layer Rules

Games communicate with the platform via the **Event Bus** — no direct API, storage, or store access:

```typescript
import { eventBus, AnalyticsEvents } from '@platform/core/events';

eventBus.emit('game:start', { gameId: 'my-game' });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
eventBus.emit('analytics', { event: AnalyticsEvents.SESSION_START });
```

ESLint enforces import boundaries for `src/game/**/*.ts`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

**i18n:** import `t` from `@platform/ui` (or `@platform/ui/index`), not from `@platform/modules`.

## Platform Modules

| Module        | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| i18n          | Runtime language switch (`en` / `vi`), lazy-loaded locale JSON              |
| shop          | Data-driven catalog (`catalog.json`), coin/IAP purchases                    |
| missions      | Daily / weekly / permanent missions (`missions.json`)                       |
| leaderboard   | Offline cache, TTL, paginated leaderboard via REST                          |
| daily-rewards | 7-day streak calendar, local persistence                                    |
| save          | Single `game-save` key — hydrates Zustand store on boot                     |
| settings      | Language, sound, vibration, graphics — part of store state                  |
| guest         | Anonymous guest + `installId`/`installSecret` recovery (`POST /guest/init`) |
| game-sync     | Offline queue → HMAC `replayHash` + per-item sync status from API           |
| ads (module)  | Remote ad config fetch, reward flow, controller wired to event bus          |
| analytics     | Provider interface — Console + Firebase                                     |
| advertising   | AdMob / mock providers, placement state machines                            |
| IAP           | Provider interface — purchase, restore, verify                              |

## UI Framework

Feature screens are **Phaser scenes** that compose reusable **panels**:

```typescript
import { t, createUIButton, ShopPanel, toast } from '@platform/ui';
import { screenManager } from '@platform/ui/screen/ScreenManager';

// Overlay stack (e.g. modal on Home)
screenManager.open('modal', { message: 'Hello!' });
toast.show({ message: 'Coins +50', type: 'success' });
```

Built-in scenes: Home, Gameplay, GameOver, Shop, Missions, Leaderboard, DailyReward, Settings, HowToPlay, Legal.

## Environment Config

Copy `.env.example` to `.env` and adjust per environment:

```bash
VITE_APP_ENV=dev              # dev | staging | production
VITE_IAP_ENABLED=false
VITE_ADS_PROVIDER=mock        # mock | admob (AdMob used on native when admob)
VITE_ADMOB_TESTING=true       # true → Google test ad units

# Native AdMob (build/release)
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=

# Production ad unit IDs (when VITE_ADMOB_TESTING=false)
# VITE_ADMOB_ANDROID_BANNER_ID= …
# VITE_ADMOB_IOS_REWARDED_ID= …

# Firebase — staging/production only (dev has analyticsEnabled=false)
# VITE_FIREBASE_API_KEY=
# VITE_FIREBASE_AUTH_DOMAIN=
# VITE_FIREBASE_PROJECT_ID=
# VITE_FIREBASE_APP_ID=
# VITE_FIREBASE_MEASUREMENT_ID=
```

| Variable              | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `VITE_APP_ENV`        | Runtime environment (`dev`, `staging`, `production`) |
| `VITE_IAP_ENABLED`    | Enables IAP provider                                 |
| `VITE_ADS_PROVIDER`   | `mock` or `admob`                                    |
| `VITE_ADMOB_TESTING`  | Use Google sample ad units when `true`               |
| `VITE_ADMOB_*_APP_ID` | Per-platform AdMob app IDs for native builds         |
| `VITE_ADMOB_*_*_ID`   | Production ad unit IDs per format/platform           |
| `VITE_FIREBASE_*`     | Firebase web config for Analytics                    |

API URL, ads/analytics toggles, and defaults are in `src/platform/core/config/index.ts`. At boot, `gameId` and `replaySecret` are set from `src/game/config.ts` — both must match a row in api-starter-kit `games` (e.g. `puzzle-quest` + `puzzle-quest-dev-secret`).

Game identity (`id`, `name`, `replaySecret`) is configured in `src/game/config.ts`, not via env vars.

## Mobile Deployment

```bash
npm run build:android    # build + assets + cap sync + native patches
npm run cap:android    # open Android Studio

npm run build:ios      # build + assets + cap sync + native patches
npm run cap:ios        # open Xcode
```

### Capacitor Setup

`android/` and `ios/` are gitignored, so a fresh clone has no native projects. `build:android` / `build:ios` now **auto-add the platform when missing** (via `cap:add:android` / `cap:add:ios`), so no manual step is required. To add a platform explicitly:

```bash
npm run cap:add:android   # idempotent — no-op if android/ exists
npm run cap:add:ios       # idempotent — no-op if ios/ exists
```

`build:android` / `build:ios` then run `capacitor-assets generate` and apply templates from `native/` (AdMob manifest snippets, MainActivity, iOS storyboard).

## Performance Targets

| Metric     | Target  |
| ---------- | ------- |
| FPS        | 60      |
| RAM        | < 150MB |
| Cold start | < 3s    |

## Scripts

| Command                   | Description                                    |
| ------------------------- | ---------------------------------------------- |
| `npm run dev`             | Vite dev server (`:5173`)                      |
| `npm run build`           | Typecheck + production build → `dist/`         |
| `npm run preview`         | Preview production build                       |
| `npm run lint`            | `tsc --noEmit` + ESLint on `src/`              |
| `npm run lint:fix`        | ESLint with auto-fix                           |
| `npm run format`          | Prettier write                                 |
| `npm run format:check`    | Prettier check                                 |
| `npm run cap:sync`        | `cap sync`                                     |
| `npm run cap:add:android` | Add Android platform if missing (idempotent)   |
| `npm run cap:add:ios`     | Add iOS platform if missing (idempotent)       |
| `npm run cap:android`     | Open Android Studio                            |
| `npm run cap:ios`         | Open Xcode                                     |
| `npm run assets:generate` | Generate app icons/splash from `assets/`       |
| `npm run build:android`   | Add platform + build + assets + sync Android + native patches |
| `npm run build:ios`       | Add platform + build + assets + sync iOS + native patches     |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Private — internal studio use.
