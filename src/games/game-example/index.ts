import type { GameConfig } from '../types';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HomeScene } from './scenes/HomeScene';
import { GameplayScene } from './scenes/GameplayScene';
import { GameOverScene } from './scenes/GameOverScene';
import { SettingsScene } from './scenes/SettingsScene';

export const gameExampleConfig: GameConfig = {
  id: 'game-example',
  name: 'Tap Runner Example',
  version: '1.0.0',
  scenes: ['Boot', 'Preload', 'Home', 'Gameplay', 'GameOver', 'Settings'],
  width: 720,
  height: 1280,
};

export const gameExampleScenes = [
  BootScene,
  PreloadScene,
  HomeScene,
  GameplayScene,
  GameOverScene,
  SettingsScene,
];
