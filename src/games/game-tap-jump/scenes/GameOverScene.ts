import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { t } from '@app/modules/localization/i18n.service';

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOver' });
  }

  create(data: { score: number }): void {
    const { width, height } = this.cameras.main;

    this.add.text(width / 2, height * 0.3, t('game.gameOver'), {
      fontSize: '36px',
      color: '#f44336',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    this.add.text(width / 2, height * 0.45, t('game.score', { score: data.score }), {
      fontSize: '24px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const retry = this.add.rectangle(width / 2, height * 0.6, 200, 50, 0x4a90d9)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.6, t('game.retry'), {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    retry.on('pointerdown', () => this.scene.start('Gameplay'));

    const home = this.add.rectangle(width / 2, height * 0.72, 200, 50, 0x6c5ce7)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.72, t('game.home'), {
      fontSize: '20px',
      color: '#ffffff',
    }).setOrigin(0.5);
    home.on('pointerdown', () => {
      eventBus.emit('game:destroy', undefined);
      this.scene.start('Home');
    });
  }
}
