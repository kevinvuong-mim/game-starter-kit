# Game Starter Kit

Production-grade starter kit for hyper-casual / casual mobile games. **Clone this repo once per game** — each game is its own project with a ready-made platform layer.

## Tech Stack

| Layer       | Technology                         |
| ----------- | ---------------------------------- |
| Game Engine | Phaser 3                           |
| Mobile      | Capacitor 6                        |
| Language    | TypeScript                         |
| Bundler     | Vite 6                             |
| State       | Zustand                            |
| Storage     | LocalStorage + IndexedDB           |
| Networking  | Fetch API (NestJS-compatible REST) |

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

## Create a New Game

**Clone this entire repo** for each new game — do not add multiple games to one codebase.

```bash
git clone <repo-url> my-tap-jump
cd my-tap-jump
npm install
```

Then customize:

1. **`src/game/config.ts`** — set `id`, `name`, `version`, screen size
2. **`capacitor.config.ts`** — set `appId` and `appName`
3. **`src/game/scenes/GameplayScene.ts`** — implement your game mechanics
4. **`src/game/scenes/PreloadScene.ts`** — load your assets
5. Run `npm run dev`

## Project Structure

```
game-starter-kit/
├── src/
│   ├── platform/              # Reusable platform (keep as-is across games)
│   │   ├── core/              # SDK: events, state, storage, api, analytics, ads, iap
│   │   ├── modules/           # i18n, shop, missions, leaderboard, save, settings
│   │   ├── ui/                # Phaser UI: modal, toast, dialog, hud, screen
│   │   └── bootstrap/         # App orchestrator, GameEngine, API contracts
│   ├── game/                  # YOUR game — customize per project
│   │   ├── config.ts          # Game identity & screen size
│   │   └── scenes/            # Phaser scenes (Boot → Preload → Home → Gameplay → GameOver)
│   └── main.ts                # Entry point
└── public/                    # Static assets
```

## Path Aliases

| Alias                 | Path                     |
| --------------------- | ------------------------ |
| `@platform/core`      | `src/platform/core`      |
| `@platform/modules`   | `src/platform/modules`   |
| `@platform/ui`        | `src/platform/ui`        |
| `@platform/bootstrap` | `src/platform/bootstrap` |
| `@game`               | `src/game`               |

## Architecture Layers

```
Game Layer        → src/game/ — gameplay only (scenes, entities, systems)
     ↓ events
Platform Core     → src/platform/core — events, state, storage, api, providers
     ↓
Platform Modules  → src/platform/modules — i18n, shop, missions, leaderboard, save
     ↓
Platform UI       → src/platform/ui — reusable Phaser screens & HUD
     ↓
Bootstrap         → src/platform/bootstrap — App, GameEngine, API contracts
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

## Game Layer Rules

Games communicate with the platform via the **Event Bus** — no direct API or storage calls:

```typescript
import { eventBus } from '@platform/core/events';

eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5 });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

## Platform Modules

| Module        | API                                 | Description                               |
| ------------- | ----------------------------------- | ----------------------------------------- |
| i18n          | `t('shop.buy')`                     | Runtime language switch, lazy load        |
| Shop          | `shop.purchase(id)`                 | Data-driven catalog (skins, boosts, IAP)  |
| Missions      | Event-driven                        | Daily/weekly/permanent missions           |
| Leaderboard   | `submitScore()`, `getLeaderboard()` | Offline queue, optimistic updates         |
| Daily Rewards | `claim()`                           | Streak calendar with server timestamp     |
| Save          | `saveLocal()`, `sync()`             | Local + cloud with conflict resolution    |
| Settings      | Persisted locally                   | Language, sound, vibration, graphics      |
| Analytics     | Provider interface                  | session_start, game_start, purchase, etc. |
| Ads           | Provider interface                  | Rewarded, interstitial, banner            |
| IAP           | Provider interface                  | purchase, restore, verify                 |

## UI Framework

```typescript
import { screenManager, toast } from '@platform/ui';

screenManager.open('modal', { message: 'Hello!' });
toast.show({ message: 'Coins +50', type: 'success' });
```

## Environment Config

Copy `.env.example` to `.env` and adjust per environment:

```bash
# .env
VITE_APP_ENV=dev          # dev | staging | production
VITE_API_URL=http://localhost:3000/api
VITE_ANALYTICS_ENABLED=false
VITE_ADS_ENABLED=false
VITE_IAP_ENABLED=false
VITE_APP_VERSION=1.0.0

# Firebase Analytics (required when VITE_ANALYTICS_ENABLED=true)
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

| Variable                       | Description                                          |
| ------------------------------ | ---------------------------------------------------- |
| `VITE_APP_ENV`                 | Runtime environment (`dev`, `staging`, `production`) |
| `VITE_API_URL`                 | Backend API base URL                                 |
| `VITE_ANALYTICS_ENABLED`       | Enables Firebase analytics provider                  |
| `VITE_ADS_ENABLED`             | Enables ad providers                                 |
| `VITE_IAP_ENABLED`             | Enables in-app purchase provider                     |
| `VITE_APP_VERSION`             | App version string exposed at runtime                |
| `VITE_FIREBASE_API_KEY`        | Firebase web API key                                 |
| `VITE_FIREBASE_AUTH_DOMAIN`    | Firebase auth domain                                 |
| `VITE_FIREBASE_PROJECT_ID`     | Firebase project ID                                  |
| `VITE_FIREBASE_APP_ID`         | Firebase app ID                                      |
| `VITE_FIREBASE_MEASUREMENT_ID` | GA4 measurement ID                                   |

See [docs/analytics.md](./docs/analytics.md) for Firebase setup and DebugView.

Game identity (`id`, `name`) is set in `src/game/config.ts`, not via env vars.

## Mobile Deployment

```bash
npm run build
npm run cap:sync
npm run cap:android    # Android Studio
npm run cap:ios        # Xcode
```

### Capacitor Setup (first time)

```bash
npx cap add android
npx cap add ios
```

## Backend (NestJS)

API contracts are defined in `src/platform/bootstrap/api-contracts.ts`.

## Performance Targets

| Metric     | Target  |
| ---------- | ------- |
| FPS        | 60      |
| RAM        | < 150MB |
| Cold start | < 3s    |

## Scripts

| Command                 | Description          |
| ----------------------- | -------------------- |
| `npm run dev`           | Development server   |
| `npm run build`         | Production build     |
| `npm run lint`          | TypeScript check     |
| `npm run cap:sync`      | Sync Capacitor       |
| `npm run build:android` | Build + sync Android |
| `npm run build:ios`     | Build + sync iOS     |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Private — internal studio use.
