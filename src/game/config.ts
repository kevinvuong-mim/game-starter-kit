/**
 * Game identity & display settings.
 * Update this file when starting a new game (after cloning this repo).
 */
export interface GameConfig {
  id: string;
  name: string;
  width: number;
  height: number;
  version: string;
}

export const gameConfig: GameConfig = {
  width: 720,
  height: 1280,
  version: '1.0.0',
  id: 'game-starter-kit',
  name: 'Game Starter Kit',
};
