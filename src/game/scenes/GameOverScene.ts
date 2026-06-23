import Phaser from 'phaser';

import { t } from '@platform/ui/i18n';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/typography';
import { createUIButton } from '@platform/ui/button/UIButton';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { LeaderboardScreen } from '@platform/ui/leaderboard/LeaderboardScreen';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score?: number; jumps?: number } = {}): void {
    const score = data.score ?? 0;
    const { width, height } = this.cameras.main;

    screenManager.register(new LeaderboardScreen(this));

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

    createUIButton(this, {
      height: 52,
      width: 240,
      x: width / 2,
      y: height * 0.58,
      fontSize: '22px',
      label: t('game.retry'),
      onClick: () => this.scene.start('Gameplay'),
    });

    createUIButton(this, {
      height: 52,
      width: 240,
      x: width / 2,
      fontSize: '22px',
      y: height * 0.68,
      label: t('game.leaderboard'),
      onClick: () => screenManager.open('leaderboard', { board: 'daily' }),
    });

    createUIButton(this, {
      height: 52,
      width: 240,
      x: width / 2,
      fontSize: '22px',
      y: height * 0.78,
      label: t('game.home'),
      onClick: () => {
        eventBus.emit('game:destroy', undefined);
        this.scene.start('Home');
      },
    });
  }

  shutdown(): void {
    screenManager.unregisterForScene(this);
  }
}
