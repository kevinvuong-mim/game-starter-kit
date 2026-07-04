import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { ModalScreen } from '@platform/ui/modal/ModalScreen';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'Home' });
  }

  /** Phaser reuses prior scene data when start() omits the data arg — always pass returnTo. */
  private openScreen(key: string): void {
    this.scene.start(key, { returnTo: 'Home' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.addBackgroundImage(width, height);

    screenManager.register(new ModalScreen(this));

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.5 },
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
      position: { x: width / 2, y: height * 0.57 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.leaderboard'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.openScreen('Leaderboard'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.64 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.settings'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.openScreen('Settings'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.71 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.shop'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.openScreen('Shop'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.78 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.missions'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () => this.openScreen('Missions'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.85 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.dailyReward'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      sound: 'coin-drop',
      onClick: () => this.openScreen('DailyReward'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.92 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.modal'),
        style: { fontSize: 36, fontStyle: 'bold' },
      },
      onClick: () =>
        screenManager.open('modal', {
          height: height / 2,
          width: 2 * width / 3,
          message: t('home.modalMessage'),
        }),
    });
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
