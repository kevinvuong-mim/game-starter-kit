import Phaser from 'phaser';

import { eventBus, getBootNavigationTarget } from '@platform/core/events';
import {
  SOUND_POP_KEY,
  SOUND_BGM_KEY,
  SOUND_COIN_DROP_KEY,
  soundManager,
} from '@platform/ui/audio/SoundManager';

type ImageAsset = { key: string; path: string };
type FallbackTexture = { key: string; width: number; height: number; color: number };

const IMAGE_ASSETS: ImageAsset[] = [
  { key: 'coin-icon', path: '/assets/images/coin.png' },
  { key: 'chest-icon', path: '/assets/images/chest.png' },
  { key: 'shop-banner', path: '/assets/images/banner.png' },
  { key: 'back-icon', path: '/assets/images/back-icon.png' },
  { key: 'shop-icon', path: '/assets/images/shop-icon.png' },
  { key: 'plus-icon', path: '/assets/images/plus-icon.png' },
  {
    key: 'leaderboard-button-background',
    path: '/assets/images/leaderboard-button-background.png',
  },
  { key: 'close-icon', path: '/assets/images/close-icon.png' },
  { key: 'shop-item-1', path: '/assets/images/shop-item-1.png' },
  { key: 'shop-item-2', path: '/assets/images/shop-item-2.png' },
  { key: 'shop-item-3', path: '/assets/images/shop-item-3.png' },
  { key: 'shop-item-4', path: '/assets/images/shop-item-4.png' },
  { key: 'shop-item-5', path: '/assets/images/shop-item-5.png' },
  { key: 'checked-icon', path: '/assets/images/checked-icon.png' },
  { key: 'missions-icon', path: '/assets/images/missions-icon.png' },
  { key: 'mission-item-1', path: '/assets/images/mission-item-1.png' },
  { key: 'mission-item-2', path: '/assets/images/mission-item-2.png' },
  { key: 'mission-item-3', path: '/assets/images/mission-item-3.png' },
  { key: 'mission-item-4', path: '/assets/images/mission-item-4.png' },
  { key: 'mission-item-5', path: '/assets/images/mission-item-5.png' },
  { key: 'daily-reward-icon', path: '/assets/images/daily-reward-icon.png' },
  { key: 'home-background-image', path: '/assets/images/home-background-image.webp' },
  { key: 'play-button-background', path: '/assets/images/play-button-background.png' },
  { key: 'general-background-image', path: '/assets/images/general-background-image.webp' },
  { key: 'glass-container', path: '/assets/images/glass-container.png' },
  { key: 'settings-button-background', path: '/assets/images/settings-button-background.png' },
  { key: 'home-button-background', path: '/assets/images/home-button-background.png' },
  { key: 'share-button-background', path: '/assets/images/share-button-background.png' },
  { key: 'best-score-background-image', path: '/assets/images/best-score-background-image.png' },
  { key: 'firework-icon', path: '/assets/images/firework-icon.png' },
  { key: 'gameover-banner', path: '/assets/images/gameover-banner.png' },
  { key: 'musical-note-icon', path: '/assets/images/musical-note-icon.png' },
  { key: 'speaker-icon', path: '/assets/images/speaker-icon.png' },
  { key: 'language-globe-icon', path: '/assets/images/language-globe-icon.png' },
  { key: 'golden-crown-icon', path: '/assets/images/golden-crown-icon.png' },
  { key: 'silver-crown-icon', path: '/assets/images/silver-crown-icon.png' },
  { key: 'bronze-crown-icon', path: '/assets/images/bronze-crown-icon.png' },
];

const FALLBACK_TEXTURES: FallbackTexture[] = [
  { key: 'back-icon', width: 72, height: 72, color: 0x3cb043 },
  { key: 'coin-icon', width: 48, height: 48, color: 0xffd700 },
  { key: 'plus-icon', width: 48, height: 48, color: 0x3cb043 },
  { key: 'shop-icon', width: 80, height: 82, color: 0x4a90d9 },
  { key: 'close-icon', width: 72, height: 72, color: 0x3cb043 },
  { key: 'shop-item-1', width: 96, height: 96, color: 0xffd700 },
  { key: 'shop-item-2', width: 96, height: 96, color: 0xffd700 },
  { key: 'shop-item-3', width: 96, height: 96, color: 0xffd700 },
  { key: 'shop-item-4', width: 96, height: 96, color: 0xffd700 },
  { key: 'shop-item-5', width: 96, height: 96, color: 0xffd700 },
  { key: 'shop-banner', width: 360, height: 80, color: 0xc62828 },
  { key: 'missions-icon', width: 80, height: 82, color: 0x4a90d9 },
  { key: 'mission-item-1', width: 96, height: 96, color: 0xffd700 },
  { key: 'mission-item-2', width: 96, height: 96, color: 0xff6b6b },
  { key: 'mission-item-3', width: 96, height: 96, color: 0x4a90d9 },
  { key: 'mission-item-4', width: 96, height: 96, color: 0x3cb043 },
  { key: 'mission-item-5', width: 96, height: 96, color: 0xffc107 },
  { key: 'daily-reward-icon', width: 80, height: 82, color: 0x4a90d9 },
  { key: 'checked-icon', width: 48, height: 48, color: 0x3cb043 },
  { key: 'chest-icon', width: 256, height: 160, color: 0xc62828 },
  { key: 'home-background-image', width: 16, height: 16, color: 0x16213e },
  { key: 'play-button-background', width: 256, height: 78, color: 0x4a90d9 },
  { key: 'general-background-image', width: 16, height: 16, color: 0x16213e },
  { key: 'glass-container', width: 479, height: 592, color: 0x88aacc },
  { key: 'settings-button-background', width: 256, height: 78, color: 0x4a90d9 },
  { key: 'home-button-background', width: 265, height: 98, color: 0x8e44ad },
  { key: 'share-button-background', width: 265, height: 98, color: 0xe67e22 },
  { key: 'best-score-background-image', width: 265, height: 97, color: 0xe74c3c },
  { key: 'firework-icon', width: 120, height: 116, color: 0xff9800 },
  { key: 'gameover-banner', width: 400, height: 313, color: 0xc62828 },
  { key: 'leaderboard-button-background', width: 256, height: 78, color: 0x4a90d9 },
  { key: 'musical-note-icon', width: 81, height: 95, color: 0x3cb043 },
  { key: 'speaker-icon', width: 75, height: 72, color: 0x3cb043 },
  { key: 'language-globe-icon', width: 64, height: 64, color: 0x3cb043 },
  { key: 'golden-crown-icon', width: 48, height: 48, color: 0xf5c518 },
  { key: 'silver-crown-icon', width: 48, height: 48, color: 0xc0c7d1 },
  { key: 'bronze-crown-icon', width: 48, height: 48, color: 0xd4894a },
];

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

    for (const image of IMAGE_ASSETS) {
      this.load.image(image.key, image.path);
    }

    this.load.audio(SOUND_COIN_DROP_KEY, '/assets/audio/coin-drop.mp3');
    this.load.audio(SOUND_POP_KEY, '/assets/audio/pop-sound-effect.mp3');
    this.load.audio(SOUND_BGM_KEY, '/assets/audio/background-music.mp3');
  }

  create(): void {
    for (const texture of FALLBACK_TEXTURES) {
      this.ensureFallbackTexture(texture.key, texture.width, texture.height, texture.color);
    }

    const target = getBootNavigationTarget();

    eventBus.emit('boot:preload-complete', undefined);
    soundManager.syncMusic();

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
