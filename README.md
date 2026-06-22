# Game Starter Kit

Production-grade starter kit for hyper-casual / casual mobile games. Built for studios publishing dozens of games from a single reusable platform.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Game Engine | Phaser 3 |
| Mobile | Capacitor 6 |
| Language | TypeScript |
| Bundler | Vite 6 |
| State | Zustand |
| Storage | LocalStorage + IndexedDB |
| Networking | Fetch API (NestJS-compatible REST) |
| Testing | Vitest + Playwright |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npm test

# Run e2e tests
npm run test:e2e

# Production build
npm run build
```

## Create a New Game

```bash
npm run create-game -- tap-jump
```

This generates:

```
src/games/game-tap-jump/
  scenes/       # Boot, Preload, Home, Gameplay, GameOver
  assets/       # Game-specific assets
  index.ts      # Game config and scene exports
```

Then:

1. Set `VITE_GAME_ID=game-tap-jump` in `.env`
2. Register the game in `src/infrastructure/GameEngine.ts`
3. Implement gameplay in `GameplayScene.ts`
4. Run `npm run dev`

**Target: new game in < 1 day.**

## Project Structure

```
game-starter-kit/
├── src/
│   ├── core/              # Core SDK (events, state, storage, api, analytics, ads, iap)
│   ├── app/               # App modules (i18n, shop, missions, leaderboard, save, etc.)
│   ├── ui/                # Reusable Phaser UI (modal, toast, dialog, hud, screen)
│   ├── infrastructure/    # Game engine bootstrap, API contracts
│   ├── games/             # Game implementations (template + examples)
│   └── main.ts            # Entry point
├── src/i18n/              # Localization files (en, vi)
├── scripts/               # Tooling (create-game)
├── tests/                 # Unit + e2e tests
└── public/                # Static assets
```

## Architecture Layers

```
Game Layer        → Gameplay only (scenes, entities, systems)
     ↓ events
Core SDK Layer    → Events, state, config, storage, analytics, ads, IAP
     ↓
App Layer         → Missions, shop, leaderboard, settings, save, i18n
     ↓
Infrastructure    → Phaser bootstrap, Capacitor, API contracts
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full details.

## Game Layer Rules

Games MUST NOT:
- Call APIs directly
- Access local storage
- Implement ads, missions, or leaderboard logic

Games ONLY:
- Emit events via `eventBus`
- Implement `init()`, `start()`, `pause()`, `resume()`, `destroy()`

```typescript
import { eventBus } from '@core/events';

// In gameplay scene
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5 });
eventBus.emit('jump', { count: 1 });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

## Platform Modules

| Module | API | Description |
|--------|-----|-------------|
| i18n | `t('shop.buy')` | Runtime language switch, lazy load |
| Shop | `shop.purchase(id)` | Data-driven catalog (skins, boosts, IAP) |
| Missions | Event-driven | Daily/weekly/permanent missions |
| Leaderboard | `submitScore()`, `getLeaderboard()` | Offline queue, optimistic updates |
| Daily Rewards | `claim()` | Streak calendar with server timestamp |
| Save | `saveLocal()`, `sync()` | Local + cloud with conflict resolution |
| Settings | Persisted locally | Language, sound, vibration, graphics |
| Analytics | Provider interface | session_start, game_start, purchase, etc. |
| Ads | Provider interface | Rewarded, interstitial, banner |
| IAP | Provider interface | purchase, restore, verify |

## UI Framework

```typescript
import { screenManager, toast } from '@ui';

screenManager.open('modal', { message: 'Hello!' });
screenManager.replace('shop');
toast.show({ message: 'Coins +50', type: 'success' });
```

## Environment Config

```bash
# .env
VITE_APP_ENV=dev          # dev | staging | production
VITE_API_URL=http://localhost:3000/api
VITE_GAME_ID=game-example
VITE_ANALYTICS_ENABLED=false
VITE_ADS_ENABLED=false
```

## Mobile Deployment

```bash
# Build web assets
npm run build

# Sync to native projects
npm run cap:sync

# Open native IDE
npm run cap:android    # Android Studio
npm run cap:ios      # Xcode

# Or combined
npm run build:android
npm run build:ios
```

### Capacitor Setup (first time)

```bash
npx cap add android
npx cap add ios
```

## Backend (NestJS)

API contracts are defined in `src/infrastructure/api-contracts.ts`. Implement these REST endpoints:

- `POST /leaderboard/submit`
- `GET /leaderboard/:board`
- `GET /leaderboard/:board/rank/:userId`
- `GET/POST /save`
- `POST /iap/verify`
- `GET /time`

## Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60 |
| RAM | < 150MB |
| Cold start | < 3s |

Optimizations included: lazy loading, object pooling, asset cache, code splitting.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run create-game` | Scaffold new game |
| `npm test` | Unit tests |
| `npm run test:e2e` | Playwright e2e |
| `npm run cap:sync` | Sync Capacitor |
| `npm run build:android` | Build + sync Android |
| `npm run build:ios` | Build + sync iOS |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

Private — internal studio use.
