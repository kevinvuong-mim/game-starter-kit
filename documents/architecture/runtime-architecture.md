# Runtime Architecture

## Overview

`game-starter-kit` tách code thành game layer và platform layer. Game scene chỉ nên emit event; platform modules xử lý API, storage, ads, IAP, analytics và state.

```text
src/game
  -> eventBus
src/platform/ui
  -> eventBus
src/platform/modules
  -> platform core
src/platform/core
  -> providers / storage / API
src/platform/bootstrap
  -> init order + lifecycle wiring
```

---

## Boot Sequence

Entry point: `src/main.ts` → `gameEngine.bootstrap()`.

`GameEngine.bootstrap()`:

1. Setup global error handlers.
2. Build runtime config từ `.env` + `src/game/config.ts`.
3. `refreshServicesFromConfig()`.
4. `app.init()`.
5. `initCapacitorPlugins()`.
6. Load fonts `Fredoka` và `Nunito Sans`.
7. Create Phaser game với `gameScenes`.
8. `toast.init(game)`.

---

## App Init Order

`src/platform/bootstrap/App.ts` là orchestrator chính.

1. Ensure local user id trong Zustand store.
2. Register analytics providers.
3. Register ads provider.
4. Parallel init: `i18n`, ads core, guest, analytics, leaderboard cache.
5. Ensure guest id để dùng cho analytics/IAP user id.
6. Register IAP provider và initialize IAP.
7. Init ads module placement config.
8. Set analytics user id và `game_id`.
9. Load local save.
10. Init daily rewards, settings, missions.
11. Bind platform event handlers.
12. Bind controllers: daily reward, leaderboard, game sync, ads, IAP, missions.
13. Bind lifecycle events.

---

## Event Boundary

Game layer nên dùng event bus thay vì gọi trực tiếp API/storage/store.

Ví dụ:

```typescript
eventBus.emit('game:start', { gameId: gameConfig.id });
eventBus.emit('score:update', { score: 100 });
eventBus.emit('coin:add', { amount: 5, source: 'gameplay' });
eventBus.emit('game:over', { score: 100, duration: 30000 });
```

Platform controllers sẽ nhận event:

| Event | Handler |
| ----- | ------- |
| `game:over` | Save local, show game-over ad, record + flush game result |
| `app:resume` | Flush pending results, reset daily missions if needed |
| `leaderboard:request` | Load leaderboard cache/network |
| `ad:reward:request` | Show rewarded ad and grant reward |
| `settings:change` | Save local |
| `shop:purchase` | Track purchase and save local |

---

## State and Persistence

Zustand store là runtime state in-memory. Durable persistence do services quản lý:

| Data | Owner | Storage |
| ---- | ----- | ------- |
| Save state (`user`, `currency`, `inventory`, `progress`, `settings`, `missions`, `dailyRewards`) | `SaveService` | `game-save` via durable provider |
| Guest identity/session | `GuestRepository` | Capacitor Preferences keys |
| Pending game results | `GameSyncRepository` | `game_pending_results` in Capacitor Preferences |
| Leaderboard page cache | `LeaderboardRepository` | `leaderboard:cache:{gameId}:p{page}` via `StorageService` |
| IAP entitlements | `PurchaseStorage` | `iap-entitlements` via durable provider |
| Daily reward model | `DailyRewardRepository` | Preferences-backed model |

Durable provider:

- Native: Capacitor Preferences.
- Web: IndexedDB.

---

## Import Rules

`src/game/**/*.ts` bị ESLint giới hạn import để giữ game/platform boundary.

Game layer nên dùng:

- `@platform/core/events`
- `@platform/ui`
- `@game/*`
- Phaser APIs

Game layer không nên import trực tiếp:

- `@platform/core/api`
- `@platform/core/storage`
- `@platform/core/state`
- `@platform/modules/*`
- `@platform/core/analytics`
- `@platform/core/advertising`

---

## Related Documentation

- [Platform Events](../modules/platform-events.md)
- [Save and Local State](../modules/save-and-local-state.md)
- [Game Result Sync](../modules/game-result-sync.md)
