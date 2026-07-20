import Phaser from 'phaser';

import { eventBus, getBootNavigationTarget } from '@platform/core/events';
import { SOUND_POP_KEY, SOUND_COIN_DROP_KEY } from '@platform/ui/audio/SoundManager';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, 300, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 16, 0x4a90d9);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 300 * value;
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      console.warn(`[Assets] Missing starter asset: ${file.key}`);
    });

    this.load.audio(SOUND_COIN_DROP_KEY, '/assets/audio/coin-drop.mp3');
    this.load.audio(SOUND_POP_KEY, '/assets/audio/pop-sound-effect.mp3');
    this.load.image('play-button-icon', '/assets/images/play-button-icon.webp');
    this.load.image('home-screen-background', '/assets/images/home-screen-background.webp');
    this.load.image('play-button-background', '/assets/images/play-button-background.webp');
    this.load.image('general-screen-background', '/assets/images/general-screen-background.webp');
  }

  create(): void {
    this.ensureFallbackTexture('play-button-icon', 43, 43, 0xffffff);
    this.ensureFallbackTexture('home-screen-background', 16, 16, 0x16213e);
    this.ensureFallbackTexture('play-button-background', 256, 78, 0x4a90d9);
    this.ensureFallbackTexture('general-screen-background', 16, 16, 0x16213e);

    const target = getBootNavigationTarget();

    eventBus.emit('boot:preload-complete', undefined);

    // Must transition from this scene — game.scene.start() would leave Preload visible.
    this.scene.start(target.sceneKey, target.data);
  }

  private ensureFallbackTexture(key: string, width: number, height: number, color: number): void {
    if (this.textures.exists(key)) {
      return;
    }

    const graphics = this.add.graphics();
    graphics.fillStyle(color, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(key, width, height);
    graphics.destroy();
  }
}
