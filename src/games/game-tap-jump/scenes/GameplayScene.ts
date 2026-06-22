import Phaser from 'phaser';
import { eventBus } from '@core/events';

/**
 * Gameplay scene for game-tap-jump.
 * RULE: Only emit events. No API, storage, ads, or mission logic.
 */
export class GameplayScene extends Phaser.Scene {
  private score = 0;

  constructor() {
    super({ key: 'Gameplay' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x16213e);

    this.add.text(width / 2, height / 2, 'Gameplay - implement your game here', {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
      align: 'center',
      wordWrap: { width: width * 0.8 },
    }).setOrigin(0.5);

    this.input.on('pointerdown', () => {
      this.score += 10;
      eventBus.emit('score:update', { score: this.score });
      eventBus.emit('jump', { count: 1 });
    });

    this.time.delayedCall(3000, () => {
      eventBus.emit('game:over', { score: this.score, duration: 3000 });
      this.scene.start('GameOver', { score: this.score });
    });
  }
}
