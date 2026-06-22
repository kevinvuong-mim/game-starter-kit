import Phaser from 'phaser';
import { eventBus } from '@core/events';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  create(): void {
    eventBus.emit('app:ready', undefined);
    this.scene.start('Preload');
  }
}
