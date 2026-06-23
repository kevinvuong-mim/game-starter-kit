# Bootstrap Platform (`src/platform/bootstrap`)

Thư mục `src/platform/bootstrap` là lớp khởi động (**bootstrap layer**) của platform — nơi gắn các module lại với nhau và khởi chạy game.

## Tổng quan luồng khởi động

```text
main.ts
   ↓
GameEngine.bootstrap()
   ↓
App.init()
   ↓
Capacitor + Phaser
```

---

## `GameEngine.ts` — Entry Point chính

Điểm vào từ `src/main.ts`.

### Trách nhiệm

* Bật global error handlers
* Cấu hình game (`setConfig`)
* Gọi `app.init()` để khởi tạo platform
* Gọi `initCapacitorPlugins()` cho native
* Load font:

  * Fredoka
  * Nunito Sans
* Tạo instance Phaser với scenes từ `@game/scenes`
* Khởi tạo toast UI
* `destroy()`:

  * Dọn Phaser
  * Gọi `app.destroy()`

---

## `App.ts` — Orchestrator Platform

Lớp điều phối trung tâm — game không import trực tiếp.

### Trách nhiệm

#### 1. Khởi tạo modules

Thứ tự trong `init()`:

1. Tạo user mặc định (nếu chưa có)
2. `registerAnalyticsProviders()`
3. **Song song:** i18n, analytics, ads, IAP, leaderboard, daily rewards
4. Gán `analytics.setUserId()` và `analytics.setUserProperty('game_id', ...)`
5. **Tuần tự:** `saveService.loadLocal()` → `settings.init()` → `missions.init()`
6. `bindPlatformEvents()` + `bindLifecycle()`

#### 2. Bind EventBus

Nối sự kiện game với platform:

**Currency & Progress**

* `coin:add`
* `coin:spend`
* `score:update`

**Gameplay**

* `game:start` → `incrementGamesPlayed()` + analytics
* `game:over` → analytics + leaderboard + save

**Level & missions**

* `level:complete` → analytics
* `mission:complete` → analytics

**Daily rewards**

* `daily:status:request` → emit `daily:status`
* `daily:claim:request` → claim + emit `daily:claim:result`

**Shop & ads**

* `shop:purchase` → analytics
* `ad:reward` → analytics

**Analytics forwarding**

* `analytics` / `analytics:track` → `analytics.track()`

**Save**

* `settings:change` → `saveLocal()`
* `save:sync` → `saveService.sync()`

#### 3. Lifecycle handling

Theo dõi:

```text
visibilitychange
```

Thực hiện:

* pause / resume
* save
* flush analytics

#### 4. `destroy()`

* `trackSessionEnd()`
* `analytics.flush()` + `analytics.shutdown()`
* `missions.destroy()`
* Hủy tất cả EventBus subscriptions

---

## `analytics.ts` — Đăng ký Analytics Providers

Hàm:

```ts
registerAnalyticsProviders()
```

### Logic

* Luôn bật:

  * `ConsoleAnalyticsProvider` *(debug)*

* Chỉ bật:

  * `FirebaseAnalyticsProvider`

Khi:

```text
analyticsEnabled === true
```

trong config.

---

## `capacitor.ts` — Native Plugins (iOS / Android)

Chỉ chạy khi:

```ts
Capacitor.isNativePlatform()
```

### Trách nhiệm

* Cấu hình Status Bar

  * Dark style
  * Background: `#1a1a2e`

* Ẩn splash screen

* Lắng nghe nút Back

Emit:

```text
app:back
```

qua `EventBus`.

### Web

* Không thực hiện gì (`no-op`)

---

## `api-contracts.ts` — Hợp đồng API Backend

Chỉ chứa:

* Types
* Route map cho REST API (NestJS)

### DTOs

```ts
SubmitScoreDto
LeaderboardResponse

SaveDataDto

IapVerifyDto
IapVerifyResponse

ServerTimeResponse
```

### Routes

```ts
API_ROUTES
```

Ví dụ:

```text
/time
/save
/leaderboard
/iap/verify
```

### Lưu ý

* Không có runtime logic
* Dùng làm contract giữa client và server

---

## `index.ts` — Barrel Export

Re-export public API của bootstrap.

### Export

```ts
app
App

gameEngine
GameEngine
```

và

```ts
Types từ api-contracts
```

---

# Tóm tắt

| File               | Vai trò                                          |
| ------------------ | ------------------------------------------------ |
| `GameEngine.ts`    | Khởi động Phaser + gọi platform init             |
| `App.ts`           | Wire modules, EventBus, lifecycle                |
| `analytics.ts`     | Chọn analytics providers theo config             |
| `capacitor.ts`     | Native plugins (status bar, splash, back button) |
| `api-contracts.ts` | DTO + route map cho backend API                  |
| `index.ts`         | Export public API                                |

---

## Kết luận

`bootstrap` = **“bộ dây điện” của ứng dụng**

Không chứa business logic sâu, mà chịu trách nhiệm:

* Gắn core modules
* Kết nối game scenes
* Kết nối native layer
* Khởi tạo toàn bộ app để game chạy được
