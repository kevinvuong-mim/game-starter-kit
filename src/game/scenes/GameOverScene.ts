import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score?: number; jumps?: number } = {}): void {
    eventBus.emit('ad:context:change', { context: 'HOME' });

    const score = data.score ?? 0;
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
      .text(width / 2, height * 0.4, t('game.score', { score }), {
        color: '#ffffff',
        fontSize: '28px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.58 },
      size: { width: 240, height: 52 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('game.retry'),
        style: { fontSize: 22 },
      },
      onClick: () => this.scene.start('Gameplay'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.68 },
      size: { width: 240, height: 52 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('game.leaderboard'),
        style: { fontSize: 22 },
      },
      onClick: () =>
        this.scene.start('Leaderboard', {
          returnTo: 'GameOver',
          returnData: { score },
        }),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.78 },
      size: { width: 240, height: 52 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('game.home'),
        style: { fontSize: 22 },
      },
      onClick: () => {
        eventBus.emit('game:destroy', undefined);
        this.scene.start('Home');
      },
    });
  }
}
