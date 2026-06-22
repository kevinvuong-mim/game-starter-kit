import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Preload' });
  }

  preload(): void {
    // Load game assets here
  }

  create(): void {
    this.scene.start('Home');
  }
}
