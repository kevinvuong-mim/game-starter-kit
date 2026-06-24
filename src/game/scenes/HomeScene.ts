import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { ModalScreen } from '@platform/ui/modal/ModalScreen';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export class HomeScene extends Phaser.Scene {
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
        content: t('home.leaderboard'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Leaderboard'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.74 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.settings'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Settings'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.81 },
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
      position: { x: width / 2, y: height * 0.88 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.missions'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('Missions'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.95 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.dailyReward'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.scene.start('DailyReward'),
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
  }

  shutdown(): void {
    screenManager.unregisterForScene(this);
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'home-screen-background');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }
}
