/**
 * Game identity & display settings.
 * Update this file when starting a new game (after cloning this repo).
 *
 * `id` comes from `VITE_GAME_ID` and must match a `GameId` enum value on game-api.
 * `replaySecret` is injected via `VITE_REPLAY_SECRET` — never hardcode the real value.
 */
export interface GameConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  version: string;
  replaySecret: string;
}

export const gameConfig: GameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  id: import.meta.env.VITE_GAME_ID ?? '',
  name: 'Game Starter Kit',
  replaySecret: import.meta.env.VITE_REPLAY_SECRET ?? '',
};
