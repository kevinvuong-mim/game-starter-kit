import type { GameConfig } from '../types';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { HomeScene } from './scenes/HomeScene';
import { GameplayScene } from './scenes/GameplayScene';
import { GameOverScene } from './scenes/GameOverScene';

export const gametapjumpConfig: GameConfig = {
  id: 'game-tap-jump',
  name: 'GameTapJump',
  version: '0.1.0',
  scenes: ["Boot","Preload","Home","Gameplay","GameOver"],
  width: 720,
  height: 1280,
};

export const gametapjumpScenes = [
  BootScene,
  PreloadScene,
  HomeScene,
  GameplayScene,
  GameOverScene,
];
