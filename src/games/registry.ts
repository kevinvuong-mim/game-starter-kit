import type { GameConfig } from './types';
import type Phaser from 'phaser';

export interface GameRegistryEntry {
  config: GameConfig;
  scenes: (typeof Phaser.Scene)[];
}

const registry = new Map<string, GameRegistryEntry>();

export function registerGame(entry: GameRegistryEntry): void {
  registry.set(entry.config.id, entry);
}

export function getGame(id: string): GameRegistryEntry | undefined {
  return registry.get(id);
}

export function getActiveGameId(): string {
  return import.meta.env.VITE_GAME_ID ?? 'game-example';
}

export function getActiveGame(): GameRegistryEntry {
  const id = getActiveGameId();
  const game = registry.get(id);
  if (!game) {
    throw new Error(`Game not registered: ${id}`);
  }
  return game;
}

export function listGames(): GameConfig[] {
  return Array.from(registry.values()).map((e) => e.config);
}
