import Phaser from 'phaser';

import { usePlatformStore } from '@platform/core/state';

export const SOUND_COIN_DROP_KEY = 'coin-drop';
export const SOUND_POP_KEY = 'pop-sound-effect';

export class SoundManager {
  private game: Phaser.Game | null = null;

  init(game: Phaser.Game): void {
    this.game = game;
  }

  isSoundEnabled(): boolean {
    return usePlatformStore.getState().settings.soundEnabled;
  }

  play(key: string): void {
    if (!this.isSoundEnabled()) return;

    const scene = this.getActiveScene();
    if (!scene) return;

    if (scene.sound.locked) {
      scene.sound.unlock();
    }

    if (scene.cache.audio.exists(key)) {
      scene.sound.play(key);
    }
  }

  playPop(): void {
    this.play(SOUND_POP_KEY);
  }

  playCoinDrop(): void {
    this.play(SOUND_COIN_DROP_KEY);
  }

  private getActiveScene(): Phaser.Scene | null {
    if (!this.game) return null;
    const scenes = this.game.scene.getScenes(true);
    return scenes[scenes.length - 1] ?? null;
  }
}

export const soundManager = new SoundManager();
