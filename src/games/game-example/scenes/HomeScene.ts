import Phaser from 'phaser';
import { eventBus } from '@core/events';
import { t } from '@app/modules/localization/i18n.service';
import { screenManager } from '@ui/screen/ScreenManager';
import { ModalScreen } from '@ui/modal/ModalScreen';
import { toast } from '@ui/toast/ToastManager';
import { dailyRewards } from '@app/modules/daily-rewards/daily-reward.service';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add
      .text(width / 2, height * 0.2, t('home.title'), {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    toast.init(this);

    const modal = new ModalScreen(this);
    screenManager.register(modal);

    this.createButton(width / 2, height * 0.45, t('home.play'), () => {
      eventBus.emit('game:start', { gameId: 'game-example' });
      this.scene.start('Gameplay');
    });

    this.createButton(width / 2, height * 0.55, t('home.shop'), () => {
      toast.show({ message: t('shop.title'), type: 'info' });
    });

    this.createButton(width / 2, height * 0.65, t('home.settings'), () => {
      screenManager.open('modal', { message: t('settings.title') });
    });

    if (dailyRewards.canClaim()) {
      this.createButton(width / 2, height * 0.75, t('dailyReward.claim'), async () => {
        const reward = await dailyRewards.claim();
        if (reward) {
          toast.show({
            message: `+${reward.reward.coins ?? 0} coins!`,
            type: 'success',
          });
        }
      });
    }
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
