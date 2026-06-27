# Game Configuration

## Overview

Mỗi repo `game-starter-kit` đại diện cho một game. Khi clone starter kit để làm game mới, cập nhật identity và display config trong `src/game/config.ts`.

```typescript
export const gameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  id: 'puzzle-quest',
  name: 'Game Starter Kit',
  maxScore: 50000,
  replaySecret: 'puzzle-quest-dev-secret',
};
```

---

## Fields

| Field | Type | Description |
| ----- | ---- | ----------- |
| `id` | string | Game id gửi lên backend qua `GET /leaderboards?gameId=...` và `POST /games/:gameId/results` |
| `name` | string | Tên hiển thị trong app/native config nếu dùng lại |
| `version` | string | Version game |
| `width` | number | Phaser game width |
| `height` | number | Phaser game height |
| `maxScore` | number | Giới hạn score local; phải khớp backend `games.config.maxScore` |
| `replaySecret` | string | Secret HMAC tạo `replayHash`; phải khớp backend `games.config.replaySecret` |

---

## Backend Contract

`id`, `maxScore`, và `replaySecret` phải khớp row trong bảng `games` của `api-starter-kit`.

Ví dụ seed dev hiện tại:

| Game ID | maxScore | replaySecret |
| ------- | -------- | ------------ |
| `puzzle-quest` | `50000` | `puzzle-quest-dev-secret` |
| `arcade-rush` | `100000` | `arcade-rush-dev-secret` |

Nếu `gameConfig.id` không tồn tại trên backend:

- Leaderboard log lỗi 404: `[Leaderboard] Game not found on backend`.
- Game sync log lỗi 404: `[GameSync] Game not found on backend`.
- Score vẫn được queue local nhưng không sync thành công.

---

## Phaser Scale

`GameEngine` dùng:

| Setting | Value |
| ------- | ----- |
| `scale.mode` | `Phaser.Scale.ENVELOP` |
| `scale.autoCenter` | `Phaser.Scale.CENTER_BOTH` |
| FPS target | `60` |
| parent | `#game-container` |

Khi đổi `width`/`height`, kiểm tra lại UI panel trong `src/platform/ui` và scene layout trong `src/game/scenes`.

---

## New Game Checklist

1. Clone repo này thành repo game mới.
2. Cập nhật `src/game/config.ts`.
3. Cập nhật `capacitor.config.ts` (`appId`, `appName`).
4. Tạo/cập nhật row `games` trong backend.
5. Implement gameplay trong `src/game/scenes/GameplayScene.ts`.
6. Load asset trong `src/game/scenes/PreloadScene.ts`.
7. Đặt art/audio trong `public/assets`.
8. Chạy `npm run dev`, sau đó test `game:over` để xác nhận sync score.

---

## Related Documentation

- [Environment Variables](./environment-variables.md)
- [Guest Identity](../modules/guest-identity.md)
- [Game Result Sync](../modules/game-result-sync.md)
