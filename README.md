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

IAP / remove-ads entitlements are client-authoritative in this starter kit. RevenueCat can verify purchases on device, but `game-api` does not store or validate entitlements server-side.

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

1. **`.env`** — set `VITE_GAME_ID` and `VITE_REPLAY_SECRET` (must match `game-api`)
2. **`src/game/config.ts`** — set `name`, `version`, screen size (`width` / `height`)
3. **`capacitor.config.ts`** — set `appId` and `appName`
4. **`src/game/scenes/GameplayScene.ts`** — implement your game mechanics
5. **`src/game/scenes/PreloadScene.ts`** — load your assets (images under `public/assets/images/`, audio under `public/assets/audio/`)
6. Add art/audio under **`public/assets/`** (served at `/assets/…` in dev/build)
7. Run `npm run dev`

## Project Structure

```
game-starter-kit/
├── src/
│   ├── main.ts                # Entry → GameEngine.bootstrap()
│   ├── platform/              # Reusable platform (keep as-is across games)
│   │   ├── core/              # events, state, storage, api, analytics, advertising, iap, error
│   │   ├── modules/           # i18n, shop, missions, leaderboard, save, settings, guest, game-sync, ads
│   │   ├── ui/                # Phaser UI: panels, HUD, toast, audio, screen stack, buttons
│   │   └── bootstrap/         # App, GameEngine, analytics, ads, iap, capacitor
│   └── game/                  # YOUR game — customize per project
│       ├── config.ts          # Game identity & screen size
│       ├── utils/             # e.g. ObjectPool
│       └── scenes/            # Boot → Preload → Home + feature scenes
├── public/assets/             # Static game assets (create per project)
│   ├── images/                # UI/game art
│   └── audio/                 # SFX (e.g. pop-sound-effect, coin-drop)
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
Platform UI       → src/platform/ui — Phaser panels, HUD, toast, sound, screen stack
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
import { gameConfig } from '@game/config';

eventBus.emit('game:start', { gameId: gameConfig.id });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
eventBus.emit('analytics', { event: AnalyticsEvents.SESSION_START });
```

**i18n:** import `t` from `@platform/ui` (or `@platform/ui/index`), not from `@platform/modules`.

## Platform Modules

| Module        | Description                                                               |
| ------------- | ------------------------------------------------------------------------- |
| i18n          | Runtime language switch (`en` / `vi`), lazy-loaded locale JSON            |
| shop          | Data-driven catalog (`catalog.json`), coin/IAP purchases                  |
| missions      | Daily / weekly / permanent missions (`missions.json`)                     |
| leaderboard   | Offline cache, TTL, paginated leaderboard via REST                        |
| daily-rewards | 7-day streak calendar, local persistence                                  |
| save          | Single `game-save` key — hydrates Zustand store on boot                   |
| settings      | Language, sound, vibration, graphics — part of store state                |
| guest         | Anonymous guest + `secretToken` (`POST /guest/init`, storage `gsk:guest`) |
| game-sync     | Offline queue → HMAC `signature` batch upload (`POST /results`)           |
| ads (module)  | Static placement config, reward flow, controller wired to event bus       |
| analytics     | Provider interface — Console + Firebase                                   |
| advertising   | AdMob / mock providers, placement state machines                          |
| IAP           | Provider interface — purchase, restore, client-side entitlement state     |

## UI Framework

Feature screens are **Phaser scenes** that compose reusable **panels**:

```typescript
import { t, createUIButton, ShopPanel, toast, soundManager } from '@platform/ui';
import { screenManager } from '@platform/ui/screen/ScreenManager';

// Overlay stack (e.g. modal on Home)
screenManager.open('modal', { message: 'Hello!' });
toast.show({ message: 'Coins +50', type: 'success' });

// UIButton plays pop SFX on pointerdown by default; override with sound: 'coin-drop' | false
createUIButton({ scene, position: { x: 0, y: 0 }, background: { key: '...' }, sound: 'coin-drop' });

// Play SFX directly (respects settings.soundEnabled)
soundManager.playCoinDrop();
```

Built-in scenes: Home, Gameplay, GameOver, Shop, Missions, Leaderboard, DailyReward, Settings, HowToPlay, Legal.

## Environment Config

Copy `.env.example` to `.env` and adjust per environment:

```bash
VITE_APP_ENV=dev              # dev | staging | production
VITE_GAME_ID=FRULOOP
VITE_REPLAY_SECRET=<64-char-sha256-hex>
VITE_IAP_PROVIDER=mock        # mock | revenuecat
VITE_ADS_PROVIDER=mock        # mock | admob (AdMob used on native when admob)
VITE_ANALYTICS_PROVIDER=console # console | firebase

# Native AdMob (build/release)
VITE_ADMOB_ANDROID_APP_ID=
VITE_ADMOB_IOS_APP_ID=

# Production ad unit IDs (when using real AdMob app IDs)
# VITE_ADMOB_ANDROID_BANNER_ID= …
# VITE_ADMOB_IOS_REWARDED_ID= …

# Firebase — staging/production only (dev has analyticsEnabled=false)
# VITE_FIREBASE_API_KEY=
# VITE_FIREBASE_AUTH_DOMAIN=
# VITE_FIREBASE_PROJECT_ID=
# VITE_FIREBASE_APP_ID=
# VITE_FIREBASE_MEASUREMENT_ID=
```

| Variable                  | Description                                          |
| ------------------------- | ---------------------------------------------------- |
| `VITE_APP_ENV`            | Runtime environment (`dev`, `staging`, `production`) |
| `VITE_GAME_ID`            | Game id used by the frontend and backend             |
| `VITE_REPLAY_SECRET`      | HMAC replay secret — must match backend per game id  |
| `VITE_IAP_PROVIDER`       | `mock` or `revenuecat`                               |
| `VITE_ADS_PROVIDER`       | `mock` or `admob`                                    |
| `VITE_ANALYTICS_PROVIDER` | `console` or `firebase`                              |
| `VITE_ADMOB_*_APP_ID`     | Per-platform AdMob app IDs for native builds         |
| `VITE_ADMOB_*_*_ID`       | Production ad unit IDs per format/platform           |
| `VITE_FIREBASE_*`         | Firebase web config for Analytics                    |

API URL, ads/analytics toggles, and defaults are in `src/platform/core/config/index.ts`. At boot, `GameEngine` passes `gameConfig.id` and `gameConfig.replaySecret` (from `VITE_GAME_ID` / `VITE_REPLAY_SECRET`) into runtime config. `name`, `width`, `height`, and `version` are edited directly in `src/game/config.ts`.

## Mobile Deployment

```bash
npm run build:android    # build + add platform if missing + assets + cap sync + native patches
npm run cap:android    # open Android Studio

npm run build:ios      # build + add platform if missing + assets + cap sync + native patches
npm run cap:ios        # open Xcode
```

### Capacitor Setup

`android/` and `ios/` are gitignored, so a fresh clone has no native projects. `build:android` / `build:ios` now **auto-add the platform when missing** through `scripts/native-ops.mjs`, so no manual step is required. To add a platform explicitly:

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

| Command                      | Description                                                 |
| ---------------------------- | ----------------------------------------------------------- |
| `npm run dev`                | Vite dev server (`:5173`)                                   |
| `npm run build`              | Typecheck + production build → `dist/`                      |
| `npm run preview`            | Preview production build                                    |
| `npm run lint`               | `tsc --noEmit` + ESLint on `src/`                           |
| `npm run game:verify-config` | Validate `VITE_GAME_ID` / `VITE_REPLAY_SECRET` + API probe  |
| `npm run lint:fix`           | ESLint with auto-fix                                        |
| `npm run format`             | Prettier write                                              |
| `npm run format:check`       | Prettier check                                              |
| `npm run cap:sync`           | `cap sync`                                                  |
| `npm run cap:add:android`    | Ensure Android platform exists (idempotent, via native-ops) |
| `npm run cap:add:ios`        | Ensure iOS platform exists (idempotent, via native-ops)     |
| `npm run cap:android`        | Open Android Studio                                         |
| `npm run cap:ios`            | Open Xcode                                                  |
| `npm run assets:generate`    | Generate app icons/splash from `resources/`                 |
| `npm run build:android`      | Full Android pipeline via `scripts/native-ops.mjs`          |
| `npm run build:ios`          | Full iOS pipeline via `scripts/native-ops.mjs`              |
| `npm run run:android`        | Build + compile APK + boot emulator + install + launch      |
| `npm run run:ios`            | Build + xcodebuild simulator + install + launch             |

## Platform Updates

For cloned games, keep game-specific code in `src/game` and treat `src/platform` as the shared platform layer.

## License

Private — internal studio use.
