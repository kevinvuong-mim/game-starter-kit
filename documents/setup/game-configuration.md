# Game configuration

File: `src/game/config.ts`

```ts
export const gameConfig = {
  id: import.meta.env.VITE_GAME_ID ?? '',
  name: 'Game Starter Kit',
  replaySecret: import.meta.env.VITE_REPLAY_SECRET ?? '',
  // ...
};
```

| Field          | Mô tả                                                                |
| -------------- | -------------------------------------------------------------------- |
| `id`           | Đọc từ `VITE_GAME_ID` và phải khớp `GameId` enum trên `game-api`     |
| `replaySecret` | Đọc từ `VITE_REPLAY_SECRET` — khớp `REPLAY_SECRET_<GAME_ID>` backend |

## Env

```bash
VITE_REPLAY_SECRET=<64-char-sha256-hex>
VITE_GAME_ID=TUTUTHOI
```

Chạy `npm run game:verify-config` trước build production.
