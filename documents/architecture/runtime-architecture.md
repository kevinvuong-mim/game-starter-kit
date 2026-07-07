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
8. `navigationService.setGame(game)`.
9. `toast.init(game)`.
10. `soundManager.init(game)`.

`PreloadScene` emit `boot:preload-complete` sau khi load assets — `navigationService` subscribe event để `markBootComplete()` và clear pending navigation (cold start).

---

## App Init Order

`src/platform/bootstrap/App.ts` là orchestrator chính.

1. Ensure local user id trong Zustand store.
2. Register analytics providers.
3. Register ads provider.
4. Đăng ký `apiClient.setAuthRecoveryHandler` → `guest.recoverFromUnauthorized()`.
5. Parallel init (`Promise.allSettled`): `i18n`, ads core, `guest`, analytics, leaderboard cache.
6. `guest.onReady` → set analytics user id khi guest sẵn sàng.
7. Register IAP provider (dùng `guestId` hoặc fallback local user id) và initialize IAP.
8. Init ads module placement config (`adsModule.init()`).
9. Set analytics user id và user property `game_id`.
10. Load local save.
11. `syncGuestToStore()` — hydrate display name từ guest credentials.
12. Init daily rewards, settings, missions.
13. Bind platform event handlers.
14. Bind controllers: **guest**, daily reward, leaderboard, game sync, ads, IAP, missions, **notifications**.
15. Bind lifecycle events (web: `visibilitychange` → `app:pause` / `app:resume`; native: `capacitor.ts` `appStateChange`).

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

| Event                   | Handler                                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `game:over`             | Track analytics, show game-over ad, save local; `gameSyncController` queue + flush result                              |
| `app:resume`            | Flush pending results; mission reset; daily reward checks; guest name flush; push heartbeat + local schedule reconcile |
| `boot:preload-complete` | **Boot complete signal** — `navigationService` gọi `markBootComplete()` (emit từ `PreloadScene` sau preload assets)    |
| `leaderboard:refresh`   | Load leaderboard cache/network (emit từ `LeaderboardPanel` khi mở)                                                     |
| `ad:reward:request`     | Show rewarded ad and grant reward                                                                                      |
| `settings:change`       | Save local                                                                                                             |
| `shop:purchase`         | Track purchase and save local                                                                                          |

---

## State and Persistence

Zustand store là runtime state in-memory. Durable persistence do services quản lý:

| Data                                                                                             | Owner                    | Storage key                                                                  |
| ------------------------------------------------------------------------------------------------ | ------------------------ | ---------------------------------------------------------------------------- |
| Save state (`user`, `currency`, `inventory`, `progress`, `settings`, `missions`, `dailyRewards`) | `SaveService`            | `game-save`                                                                  |
| Guest identity/session                                                                           | `GuestRepository`        | `guest` → `gsk:guest` trên Preferences/localStorage                          |
| Pending game results                                                                             | `GameSyncRepository`     | `game-sync:pending`                                                          |
| Leaderboard page cache                                                                           | `LeaderboardRepository`  | `leaderboard:cache:{gameId}:p{page}`                                         |
| IAP entitlements                                                                                 | `PurchaseStorage`        | `iap-entitlements`                                                           |
| Daily reward model                                                                               | `DailyRewardRepository`  | `daily-reward-v2` (Capacitor Preferences trực tiếp, không qua `gsk:` prefix) |
| Notification client state                                                                        | `NotificationRepository` | `notification-state-v1`                                                      |

Durable provider (`StorageService`):

- Native: Capacitor Preferences (keys có prefix `gsk:`).
- Web: IndexedDB (keys không có prefix).

---

## Import Rules

`src/game/**/*.ts` bị ESLint giới hạn import để giữ game/platform boundary.

Game layer nên dùng:

- `@platform/core/events`
- `@platform/ui`
- `@game/*`
- Phaser APIs

Game layer không nên import trực tiếp:

- `@platform/modules/*` (dùng `@platform/ui` hoặc event bus)
- `@platform/core/api`
- `@platform/core/storage`
- `@platform/core/state`
- `@platform/core/config` (dùng `@game/config`)
- `@platform/core/utils` (dùng `@game/utils`)
- `@platform/core/error` (dùng `eventBus.emit('error:report', …)`)
- `@platform/core/analytics` (dùng `eventBus.emit('analytics', …)`)
- `@platform/core/advertising`

---

## Related Documentation

- [Notifications](../modules/notifications.md)
- [Game Result Sync](../modules/game-result-sync.md)
- [Guest Identity](../modules/guest-identity.md)
- [Firebase Native Setup](../setup/firebase-native.md)
- [ARCHITECTURE.md](../../ARCHITECTURE.md) — chi tiết kiến trúc đầy đủ
