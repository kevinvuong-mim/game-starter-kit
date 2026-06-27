# Platform Versioning

`game-starter-kit` is still a clone-per-game template. To reduce drift across game clones, treat `src/platform` as a versioned platform layer and `src/game` as the per-game layer.

## Short-Term Update Flow

1. Keep gameplay changes under `src/game` and assets under `public/assets`.
2. Pull or clone the latest starter kit separately.
3. Run a dry run from the game repo:

```bash
PLATFORM_SOURCE=/path/to/latest/game-starter-kit npm run platform:update
```

4. Apply the platform update:

```bash
PLATFORM_SOURCE=/path/to/latest/game-starter-kit npm run platform:update -- --apply
```

5. Run `npm run lint`, `npm run test`, and a mobile smoke test.

## Rules

- Do not edit `src/platform` for game-specific behavior unless the change is intended to be ported back to the starter kit.
- Keep public platform imports stable through `@platform/core/events`, `@platform/ui`, and documented module controllers.
- Prefer adding game behavior through `src/game` scenes and event emissions.

## Long-Term Direction

Extract `src/platform` into a real package after the contract layer, offline queue, and backend config workflow are stable. Until then, this script gives clones a repeatable update path without forcing a monorepo migration.

## Rollback

If a platform update breaks a game, revert the `src/platform` directory change in that game repo and keep the game-specific `src/game` changes intact.
