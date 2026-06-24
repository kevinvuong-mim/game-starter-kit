import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { toast } from '@platform/ui/toast/ToastManager';
import { ModalScreen } from '@platform/ui/modal/ModalScreen';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export class HomeScene extends Phaser.Scene {
  private unsubscribers: Array<() => void> = [];
  private dailyRewardButton?: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.addBackgroundImage(width, height);

    screenManager.register(new ModalScreen(this));

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.6 },
      size: { width: 256, height: 78 },
      background: { key: 'play-button-background' },
      icon: {
        key: 'play-button-icon',
        size: { width: 43, height: 43 },
        offset: { x: -72, y: 0 },
      },
      text: {
        content: t('home.play'),
        style: { fontSize: 36, fontStyle: 'bold' },
        offset: { x: 24, y: 0 },
      },
      onClick: () => this.scene.start('Gameplay'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.67 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.shop'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Shop'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.74 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.leaderboard'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Leaderboard'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.81 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.settings'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Settings'),
    });

    // createUIButton({
    //   scene: this,
    //   position: { x: width / 2, y: height * 0.95 },
    //   size: { width: 256, height: 78 },
    //   background: { key: UIButtonBackgroundKey.Rounded },
    //   text: {
    //     content: t('home.modal'),
    //     style: { fontSize: 36, fontStyle: 'bold' },
    //   },
    //   onClick: () =>
    //     screenManager.open('modal', {
    //       message: t('home.modalMessage'),
    //     }),
    // });

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

      eventBus.on('daily:claim:result', ({ success, coins, message }) => {
        if (success) {
          toast.show({
            message: message ?? `+${coins ?? 0} coins!`,
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

    const container = this.add.container(width / 2, height * 0.88);
    const bg = this.add.rectangle(0, 0, 256, 64, 0x6c5ce7);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });
    container.add(bg);

    const label = this.add
      .text(0, 0, t('dailyReward.claim'), {
        color: '#ffffff',
        fontSize: '36px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    container.add(label);

    bg.on('pointerdown', () => {
      eventBus.emit('daily:claim:request', undefined);
    });

    this.dailyRewardButton = container;
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'home-screen-background');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }
}
