import Phaser from 'phaser';

import { t } from '@platform/ui/i18n';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/typography';
import { createUIButton } from '@platform/ui/button/UIButton';

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

    createUIButton(this, {
      height: 52,
      width: 240,
      x: width / 2,
      y: height * 0.6,
      fontSize: '22px',
      label: t('game.retry'),
      onClick: () => this.scene.start('Gameplay'),
    });

    createUIButton(this, {
      height: 52,
      width: 240,
      x: width / 2,
      fontSize: '22px',
      y: height * 0.72,
      label: t('game.home'),
      onClick: () => {
        eventBus.emit('game:destroy', undefined);
        this.scene.start('Home');
      },
    });
  }
}
