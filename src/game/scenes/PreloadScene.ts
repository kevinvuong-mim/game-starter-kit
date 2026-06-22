import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    this.load.image('home-background', '/assets/ui/home-background-image.webp');
  }

  create(): void {
    this.scene.start('Home');
  }
}
