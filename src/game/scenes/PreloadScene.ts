import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    this.load.image('home-screen-background', '/assets/ui/home-screen-background.jpeg');
  }

  create(): void {
    this.scene.start('Home');
  }
}
