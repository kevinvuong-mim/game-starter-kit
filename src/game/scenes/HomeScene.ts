import Phaser from 'phaser';

import { t } from '@platform/ui/i18n';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/typography';
import { toast } from '@platform/ui/toast/ToastManager';
import { ShopScreen } from '@platform/ui/shop/ShopScreen';
import { ModalScreen } from '@platform/ui/modal/ModalScreen';
import { createUIButton } from '@platform/ui/button/UIButton';
import { screenManager } from '@platform/ui/screen/ScreenManager';

export class HomeScene extends Phaser.Scene {
  private unsubscribers: Array<() => void> = [];
  private dailyRewardButton?: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.addBackgroundImage(width, height);

    screenManager.register(new ModalScreen(this));
    screenManager.register(new ShopScreen(this));

    createUIButton(this, {
      height: 64,
      width: 256,
      x: width / 2,
      y: height * 0.6,
      fontSize: '36px',
      variant: 'rounded',
      label: t('home.play'),
      onClick: () => this.scene.start('Gameplay'),
    });

    createUIButton(this, {
      height: 64,
      width: 256,
      x: width / 2,
      fontSize: '36px',
      y: height * 0.68,
      variant: 'rounded',
      label: t('home.shop'),
      onClick: () => screenManager.open('shop'),
    });

    createUIButton(this, {
      height: 64,
      width: 256,
      x: width / 2,
      fontSize: '36px',
      y: height * 0.76,
      variant: 'rounded',
      label: t('home.settings'),
      onClick: () => this.scene.start('Settings'),
    });

    this.bindPlatformEvents();
    eventBus.emit('daily:status:request', undefined);
  }

  shutdown(): void {
    screenManager.unregisterForScene(this);
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
        color: '#ffffff',
        fontSize: '36px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
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
}
