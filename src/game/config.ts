/**
 * Game identity & display settings.
 * Update this file when starting a new game (after cloning this repo).
 */
export interface GameConfig {
  id: string;
  name: string;
  version: string;
  width: number;
  height: number;
}

export const gameConfig: GameConfig = {
  id: 'game-starter-kit',
  name: 'Game Starter Kit',
  version: '1.0.0',
  width: 720,
  height: 1280,
};
