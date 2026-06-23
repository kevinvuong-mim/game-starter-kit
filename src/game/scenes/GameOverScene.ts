import Phaser from 'phaser';

import { t } from '@platform/ui/i18n';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/typography';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score: number; jumps: number }): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e, 0.95);

    this.add
      .text(width / 2, height * 0.25, t('game.gameOver'), {
        color: '#f44336',
        fontSize: '42px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.4, t('game.score', { score: data.score }), {
        color: '#ffffff',
        fontSize: '28px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

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
      color: '#ffffff',
      fontSize: '22px',
      fontFamily: FREDOKA_FONT,
    });
    text.setOrigin(0.5);

    bg.on('pointerdown', onClick);
  }
}
