import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { t } from '@app/modules/localization/i18n.service';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add.text(width / 2, height * 0.3, 'GameTapJump', {
      fontSize: '32px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5);

    const playBtn = this.add.rectangle(width / 2, height * 0.5, 200, 50, 0x4a90d9)
      .setInteractive({ useHandCursor: true });
    this.add.text(width / 2, height * 0.5, t('home.play'), {
      fontSize: '22px',
      color: '#ffffff',
    }).setOrigin(0.5);

    playBtn.on('pointerdown', () => {
      eventBus.emit('game:start', { gameId: 'game-tap-jump' });
      this.scene.start('Gameplay');
    });
  }
}
