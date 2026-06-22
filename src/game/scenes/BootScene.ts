import Phaser from 'phaser';
import { eventBus } from '@platform/core/events';
import { analytics } from '@platform/core/analytics';
import { logger } from '@platform/core/error';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Boot' });
  }

  preload(): void {
    const { width, height } = this.cameras.main;
    const gfx = this.make.graphics({ x: 0, y: 0 });
    gfx.fillStyle(0x4a90d9);
    gfx.fillCircle(16, 16, 16);
    gfx.generateTexture('particle', 32, 32);
    gfx.destroy();

    this.add.rectangle(width / 2, height / 2, 300, 20, 0x333333);
    const bar = this.add.rectangle(width / 2 - 150, height / 2, 0, 16, 0x4a90d9);
    bar.setOrigin(0, 0.5);

    this.load.on('progress', (value: number) => {
      bar.width = 300 * value;
    });
  }

  create(): void {
    analytics.track('session_start');
    logger.info('[Boot] Platform ready');
    eventBus.emit('app:ready', undefined);
    this.scene.start('Preload');
  }
}
