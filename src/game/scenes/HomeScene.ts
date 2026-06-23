import Phaser from 'phaser';
import { eventBus } from '@platform/core/events';
import { t } from '@platform/ui/i18n';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { ModalScreen } from '@platform/ui/modal/ModalScreen';
import { ShopScreen } from '@platform/ui/shop/ShopScreen';
import { toast } from '@platform/ui/toast/ToastManager';
import { FONT_FAMILY } from '@platform/ui/typography';

export class HomeScene extends Phaser.Scene {
  private unsubscribers: Array<() => void> = [];
  private dailyRewardButton?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.addBackgroundImage(width, height);

    toast.init(this);

    screenManager.register(new ModalScreen(this));
    screenManager.register(new ShopScreen(this));

    this.createButton(width / 2, height * 0.60, t('home.play'), () => {
      this.scene.start('Gameplay');
    });

    this.createButton(width / 2, height * 0.68, t('home.shop'), () => {
      screenManager.open('shop');
    });

    this.createButton(width / 2, height * 0.76, t('home.settings'), () => {
      this.scene.start('Settings');
    });

    this.bindPlatformEvents();
    eventBus.emit('daily:status:request', undefined);
  }

  shutdown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }

  private bindPlatformEvents(): void {
    this.unsubscribers.push(
      eventBus.on('daily:status', ({ canClaim }) => {
        if (canClaim) {
          this.showDailyRewardButton();
        }
      }),

      eventBus.on('daily:claim:result', ({ success, coins, gems, message }) => {
        if (success) {
          const amount = coins ?? gems ?? 0;
          const unit = coins !== undefined ? 'coins' : 'gems';
          toast.show({
            message: message ?? `+${amount} ${unit}!`,
            type: 'success',
          });
          this.dailyRewardButton?.destroy();
          this.dailyRewardButton = undefined;
        }
      })
    );
  }

  private showDailyRewardButton(): void {
    if (this.dailyRewardButton) return;
    const { width, height } = this.cameras.main;
    const bg = this.add.rectangle(width / 2, height * 0.84, 256, 64, 0x6c5ce7);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });
    this.dailyRewardButton = bg;

    this.add
      .text(width / 2, height * 0.84, t('dailyReward.claim'), {
        fontSize: '36px',
        color: '#ffffff',
        fontFamily: FONT_FAMILY,
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', () => {
      eventBus.emit('daily:claim:request', undefined);
    });
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'home-screen-background');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const width = 256;
    const height = 64;
    const radius = 16;

    const bg = this.add.graphics({ x, y });
    bg.fillStyle(0xffffff, 1);
    bg.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
    bg.fillStyle(0x4a90d9, 1);
    bg.fillRoundedRect(-width / 2 + 2, -height / 2 + 2, width - 4, height - 4, radius - 2);
    bg.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    bg.input!.cursor = 'pointer';

    const text = this.add.text(x, y, label, {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      fontStyle: 'bold',
    });
    text.setOrigin(0.5);

    bg.on('pointerdown', onClick);
  }
}
