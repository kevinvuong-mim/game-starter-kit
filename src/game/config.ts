/**
 * Game identity & display settings.
 * Update this file when starting a new game (after cloning this repo).
 *
 * `id` and `replaySecret` must match a row in the api-starter-kit `games` table.
 */
export interface GameConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  version: string;
  /** Per-game HMAC secret — must match `games.config.replaySecret` on the backend. */
  replaySecret: string;
}

export const gameConfig: GameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  id: 'puzzle-quest',
  name: 'Game Starter Kit',
  replaySecret: 'puzzle-quest-dev-secret',
};
