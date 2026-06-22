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

- `main` — stable starter kit releases
- `feature/<name>` — platform improvements to the kit itself

## Creating a New Game

**Clone this repo** — do not add a second game folder to the same project.

```bash
git clone <repo-url> game-tap-jump
cd game-tap-jump
npm install
```

Then:

1. Edit `src/game/config.ts` — set `id`, `name`, `version`
2. Edit `capacitor.config.ts` — set `appId`, `appName`
3. Implement gameplay in `src/game/scenes/GameplayScene.ts`
4. Load assets in `src/game/scenes/PreloadScene.ts`
5. Add art/audio to `public/`

## Adding a Platform Module

1. Create service in `src/platform/modules/<module>/`
2. Export singleton from service file
3. Call `init()` in `src/platform/bootstrap/App.ts`
4. Wire event bus subscriptions
5. Add i18n keys
6. Document in ARCHITECTURE.md

### Module Checklist

- [ ] Service class with `init()` and `destroy()`
- [ ] No direct imports from game layer
- [ ] Event-driven communication
- [ ] Offline-first where applicable
- [ ] i18n strings (en + vi)

## Code Style

- TypeScript strict mode
- No `any` unless absolutely necessary
- Match existing naming conventions
- Services are singletons exported as `const`

## Game Layer Guidelines

| Preferred                      | Avoid                    |
| ------------------------------ | ------------------------ |
| `@platform/core/events` (emit) | `@platform/core/api`     |
| `@game/*`                      | `@platform/core/storage` |
| Phaser APIs                    | Direct store mutations   |
| `@platform/ui/*` (HUD, toast)  |                          |

## Type Check

```bash
npm run lint
```

## Commit Messages

```
feat(shop): add boost item type
fix(leaderboard): flush offline queue on reconnect
feat(game): implement obstacle spawning
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
```

### iOS

```bash
npm run build:ios
npm run cap:ios
```

### Environment Variables (CI/CD)

```
VITE_APP_ENV=production
VITE_API_URL=https://api.studio.games/api
VITE_ANALYTICS_ENABLED=true
VITE_ADS_ENABLED=true
```

## Swapping Providers

### Analytics

```typescript
import { analytics } from '@platform/core/analytics';

class FirebaseAnalytics implements IAnalyticsProvider { ... }
analytics.registerProvider(new FirebaseAnalytics());
```

### Ads

```typescript
import { ads } from '@platform/core/advertising';

class AdMobProvider implements IAdsProvider { ... }
ads.setProvider(new AdMobProvider());
```

### IAP

```typescript
import { iap } from '@platform/core/iap';

class RevenueCatProvider implements IIapProvider { ... }
iap.setProvider(new RevenueCatProvider());
```

## Questions

Open an issue or contact the platform team.
