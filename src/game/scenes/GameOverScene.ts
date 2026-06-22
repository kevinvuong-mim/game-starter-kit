import Phaser from 'phaser';
import { eventBus } from '@platform/core/events';
import { t } from '@platform/modules/i18n/i18n.service';
import { analytics } from '@platform/core/analytics';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score: number; jumps: number }): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 0.95);

    this.add
      .text(width / 2, height * 0.25, t('game.gameOver'), {
        fontSize: '42px',
        color: '#f44336',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, t('game.score', { score: data.score }), {
        fontSize: '28px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    analytics.track('level_complete', { score: data.score, jumps: data.jumps });

    this.createButton(width / 2, height * 0.6, t('game.retry'), () => {
      this.scene.start('Gameplay');
    });

    this.createButton(width / 2, height * 0.72, t('game.home'), () => {
      eventBus.emit('game:destroy', undefined);
      this.scene.start('Home');
    });
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 240, 52, 0x4a90d9);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    const text = this.add.text(x, y, label, {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    text.setOrigin(0.5);

    bg.on('pointerdown', onClick);
  }
}
