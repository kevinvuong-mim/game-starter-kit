import Phaser from 'phaser';

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

    this.load.image('home-screen-background', '/assets/ui/home-screen-background.jpeg');
    this.load.image('play-button-background', '/assets/ui/play-button-background.webp');
    this.load.image('play-button-icon', '/assets/ui/play-button-icon.webp');
  }

  create(): void {
    this.ensureFallbackTexture('home-screen-background', 16, 16, 0x16213e);
    this.ensureFallbackTexture('play-button-background', 256, 78, 0x4a90d9);
    this.ensureFallbackTexture('play-button-icon', 43, 43, 0xffffff);
    this.scene.start('Home');
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
