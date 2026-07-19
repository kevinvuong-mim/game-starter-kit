import Phaser from 'phaser';

import { gameConfig } from '../config';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { t, toast, shareService } from '@platform/ui/index';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export class GameOverScene extends Phaser.Scene {
  private rankText?: Phaser.GameObjects.Text;
  private unsubscribeSyncCompleted?: () => void;

  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score?: number; jumps?: number } = {}): void {
    this.cleanupEventListeners();

    eventBus.emit('ad:context:change', { context: 'GAME_OVER' });

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

    this.rankText = this.add
      .text(width / 2, height * 0.48, '', {
        color: '#ffd54f',
        fontSize: '22px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.unsubscribeSyncCompleted = eventBus.on('game:sync:completed', ({ rank }) => {
      this.showRank(rank);
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.56 },
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
      position: { x: width / 2, y: height * 0.65 },
      size: { width: 240, height: 52 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('game.shareScore'),
        style: { fontSize: 22 },
      },
      onClick: () => void this.handleShareScore(score),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.74 },
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

  private async handleShareScore(score: number): Promise<void> {
    const result = await shareService.shareScore({
      score,
      gameName: gameConfig.name,
    });

    if (result === 'unavailable') {
      toast.show({ message: t('game.shareUnavailable'), type: 'warning' });
    }
  }

  shutdown(): void {
    this.cleanupEventListeners();
    this.rankText = undefined;
  }

  private cleanupEventListeners(): void {
    this.unsubscribeSyncCompleted?.();
    this.unsubscribeSyncCompleted = undefined;
  }

  private showRank(rank: number): void {
    if (!this.rankText) {
      return;
    }

    this.rankText.setText(t('leaderboard.rank', { rank }));
    this.rankText.setVisible(true);
  }
}
