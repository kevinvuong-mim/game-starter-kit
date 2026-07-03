# Game configuration

File: `src/game/config.ts`

```ts
export const gameConfig: GameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  name: 'Game Starter Kit',
  id: import.meta.env.VITE_GAME_ID ?? '',
  replaySecret: import.meta.env.VITE_REPLAY_SECRET ?? '',
};
```

| Field          | Nguồn                | Mô tả                                       |
| -------------- | -------------------- | ------------------------------------------- |
| `id`           | `VITE_GAME_ID`       | Phải khớp `GameId` enum trên `game-api`     |
| `replaySecret` | `VITE_REPLAY_SECRET` | Khớp `REPLAY_SECRET_<GAME_ID>` trên backend |
| `name`         | File                 | Tên hiển thị của game                       |
| `width`        | File                 | Chiều rộng canvas Phaser                    |
| `height`       | File                 | Chiều cao canvas Phaser                     |
| `version`      | File                 | Phiên bản game (semver)                     |

## Env

```bash
VITE_REPLAY_SECRET=<64-char-sha256-hex>
VITE_GAME_ID=FRULOOP
```

Chạy `npm run game:verify-config` trước build production.
