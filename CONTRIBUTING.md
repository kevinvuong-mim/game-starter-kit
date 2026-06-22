# Contributing

## Development Setup

```bash
git clone <repo-url>
cd game-starter-kit
npm install
cp .env.example .env
npm run dev
```

## Branch Strategy

- `main` — stable platform releases
- `feature/<name>` — new platform features
- `game/<name>` — game-specific work (if monorepo)

## Creating a New Game

```bash
npm run create-game -- my-game-name
```

1. Implement gameplay in `src/games/game-my-game-name/scenes/GameplayScene.ts`
2. Add assets to `src/games/game-my-game-name/assets/`
3. Register in `src/infrastructure/GameEngine.ts`:

```typescript
import { myGameConfig, myGameScenes } from '@games/game-my-game-name';

registerGame({ config: myGameConfig, scenes: myGameScenes });
```

4. Set `VITE_GAME_ID=game-my-game-name` in `.env`

## Adding a Platform Module

1. Create service in `src/app/modules/<module>/`
2. Export singleton from service file
3. Call `init()` in `src/app/App.ts`
4. Wire event bus subscriptions
5. Add i18n keys
6. Write tests in `tests/`
7. Document in ARCHITECTURE.md

### Module Checklist

- [ ] Service class with `init()` and `destroy()`
- [ ] No direct imports from game layer
- [ ] Event-driven communication
- [ ] Offline-first where applicable
- [ ] Unit tests
- [ ] i18n strings (en + vi)

## Code Style

- TypeScript strict mode
- No `any` unless absolutely necessary
- Match existing naming conventions
- Services are singletons exported as `const`
- Game layer never imports from `@app`

## Game Layer Rules (Enforced)

| Allowed | Forbidden |
|---------|-----------|
| `@core/events` (emit only) | `@core/api` |
| `@games/types` | `@app/*` |
| Phaser APIs | `@core/storage` |
| `@ui/*` (optional) | Direct store mutations |

## Testing

```bash
# Unit tests
npm test

# Watch mode
npm run test:watch

# E2E
npm run test:e2e

# Type check
npm run lint
```

Write tests for:
- Event bus handlers
- Store mutations
- Service business logic
- Storage providers

## Commit Messages

```
feat(shop): add boost item type
fix(leaderboard): flush offline queue on reconnect
game(tap-jump): implement obstacle spawning
docs: update deployment guide
```

## Deployment

### Web

```bash
npm run build
# Deploy dist/ to CDN or static hosting
```

### Android

```bash
npm run build:android
npm run cap:android
# Build signed APK/AAB in Android Studio
```

### iOS

```bash
npm run build:ios
npm run cap:ios
# Archive in Xcode
```

### Environment Variables (CI/CD)

Set per environment:

```
VITE_APP_ENV=production
VITE_API_URL=https://api.studio.games/api
VITE_GAME_ID=game-my-game
VITE_ANALYTICS_ENABLED=true
VITE_ADS_ENABLED=true
```

## Swapping Providers

### Analytics

```typescript
import { analytics } from '@core/analytics';

class FirebaseAnalytics implements IAnalyticsProvider { ... }
analytics.registerProvider(new FirebaseAnalytics());
```

### Ads

```typescript
import { ads } from '@core/advertising';

class AdMobProvider implements IAdsProvider { ... }
ads.setProvider(new AdMobProvider());
```

### IAP

```typescript
import { iap } from '@core/iap';

class RevenueCatProvider implements IIapProvider { ... }
iap.setProvider(new RevenueCatProvider());
```

## Questions

Open an issue or contact the platform team.
