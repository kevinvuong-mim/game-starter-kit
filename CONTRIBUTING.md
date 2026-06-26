# Contributing

## Development Setup

Requires **Node.js >= 20**.

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
cp .env.example .env
```

Then:

1. Edit `src/game/config.ts` — set `id`, `name`, `version`, screen size
2. Edit `capacitor.config.ts` — set `appId`, `appName`
3. Implement gameplay in `src/game/scenes/GameplayScene.ts`
4. Load assets in `src/game/scenes/PreloadScene.ts`
5. Add art/audio under `public/assets/` (referenced as `/assets/…` in Phaser loaders)
6. Configure `.env` for AdMob/Firebase when building native release binaries

## Adding a Platform Module

1. Create service in `src/platform/modules/<module>/`
2. Add `repository.ts` / `controller.ts` if the module uses the API or event bus
3. Export singleton from service file; export from `src/platform/modules/index.ts`
4. Call `init()` in `src/platform/bootstrap/App.ts`
5. Bind controller to `events` in `App.init()` if applicable
6. Add i18n keys to `en.json` and `vi.json`
7. Document in [ARCHITECTURE.md](./ARCHITECTURE.md)

### Module Checklist

- [ ] Service class with `init()` and `destroy()` where needed
- [ ] No direct imports from game layer
- [ ] Event-driven communication (UI emits/requests, controller bridges)
- [ ] Offline-first where applicable (local queue/cache before network)
- [ ] i18n strings (`en` + `vi`)
- [ ] Repository isolates storage/API calls from service logic

## Code Style

- TypeScript strict mode (`noUnusedLocals`, `noUnusedParameters`)
- No `any` unless absolutely necessary
- Match existing naming conventions
- Services are singletons exported as `const`
- Prettier for formatting — run `npm run format` before committing

## Game Layer Guidelines

Enforced by ESLint `no-restricted-imports` on `src/game/**/*.ts`:

| Preferred                                              | Avoid                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `@platform/core/events` (emit)                         | `@platform/core/api`                                         |
| `@game/*`                                              | `@platform/core/storage`                                     |
| Phaser APIs                                            | `@platform/core/state` (direct store mutations)              |
| `@platform/ui/*` (panels, HUD, toast, `t`)             | `@platform/modules/*`                                        |
| `@game/utils/*`                                        | `@platform/core/utils`                                       |
| `eventBus.emit('analytics', …)` + `AnalyticsEvents`    | `@platform/core/analytics`                                   |
|                                                        | `@platform/core/advertising`, `@platform/core/iap`           |
|                                                        | `@platform/core/config`, `@platform/core/error`              |

Use `eventBus.emit('error:report', { error, context })` instead of importing `@platform/core/error` from game code.

## Lint & Format

```bash
npm run lint          # tsc --noEmit + eslint src
npm run lint:fix      # eslint --fix
npm run format        # prettier --write
npm run format:check  # prettier --check
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
npm run preview   # local smoke test
```

### Android

```bash
npm run build:android   # build + icons/splash + cap sync + native/ patches
npm run cap:android     # open Android Studio
```

First time: `npx cap add android`

### iOS

```bash
npm run build:ios
npm run cap:ios
```

First time: `npx cap add ios`

`android/` and `ios/` are gitignored — each developer generates them locally.

### Environment Variables (CI/CD)

```
VITE_APP_ENV=production
VITE_IAP_ENABLED=true
VITE_ADS_PROVIDER=admob
VITE_ADMOB_TESTING=false
VITE_ADMOB_ANDROID_APP_ID=ca-app-pub-…
VITE_ADMOB_IOS_APP_ID=ca-app-pub-…
VITE_ADMOB_ANDROID_REWARDED_ID=ca-app-pub-…/…
VITE_ADMOB_IOS_REWARDED_ID=ca-app-pub-…/…
VITE_FIREBASE_API_KEY=<from-secrets>
VITE_FIREBASE_AUTH_DOMAIN=<project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=<project-id>
VITE_FIREBASE_APP_ID=<app-id>
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
```

Store Firebase and AdMob values in CI secrets — never commit real keys to the repo.

## Swapping Providers

Provider registration happens during bootstrap. Prefer extending `src/platform/bootstrap/analytics.ts` or `ads.ts` rather than calling providers from game code.

### Analytics

Console is always registered. Firebase is added when `analyticsEnabled` is true (staging/production) in `ENV_CONFIGS`.

```typescript
import { services } from '@platform/core/services';
import type { IAnalyticsProvider } from '@platform/core/analytics';

class MyAnalyticsProvider implements IAnalyticsProvider { /* … */ }

services.analytics.registerProvider(new MyAnalyticsProvider());
```

Game code should emit:

```typescript
import { eventBus, AnalyticsEvents } from '@platform/core/events';

eventBus.emit('analytics', { event: AnalyticsEvents.PURCHASE, params: { itemId } });
```

### Ads

`registerAdsProvider()` in `src/platform/bootstrap/ads.ts` picks Mock vs AdMob based on platform and `VITE_ADS_PROVIDER`. Ad unit IDs come from `src/platform/core/config/index.ts`.

```typescript
import { services } from '@platform/core/services';
import type { IAdsProvider } from '@platform/core/advertising';

class CustomAdsProvider implements IAdsProvider { /* … */ }

services.ads.setProvider(new CustomAdsProvider());
```

Request ads from game/UI via events: `ad:show:request`, `ad:reward:request`.

### IAP

```typescript
import { services } from '@platform/core/services';
import type { IIapProvider } from '@platform/core/iap';

class RevenueCatProvider implements IIapProvider { /* … */ }

services.iap.setProvider(new RevenueCatProvider());
```

Enable with `VITE_IAP_ENABLED=true`.

## Questions

Open an issue or contact the platform team.
