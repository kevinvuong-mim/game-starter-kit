import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { eventBus } from '@platform/core/events';
import { NUNITO_FONT } from '@platform/ui/fonts';
import { screenManager } from '@platform/ui/screen/ScreenManager';
import { RateAppModalScreen } from '@platform/ui/rate-app/RateAppModalScreen';
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
    eventBus.emit('ad:context:change', { context: 'HOME' });

    const { width, height } = this.cameras.main;

    this.addBackgroundImage(width, height);

    screenManager.register(new RateAppModalScreen(this));

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.5 },
      size: { width: 256, height: 78 },
      background: { key: 'play-button-background' },
      icon: {
        key: 'play-button-icon',
        size: { width: 43, height: 43 },
        offset: { x: 56, y: 39 },
      },
      text: {
        content: t('home.play'),
        style: {
          fontSize: 36,
          fontStyle: 'bold',
          border: { width: 4, color: '#000000' },
        },
        offset: { x: 152, y: 39 },
      },
      onClick: () => this.scene.start('Gameplay'),
      badge: {
        textStyle: {
          fontFamily: NUNITO_FONT,
          border: { width: 4, color: '#000000' },
        },
        background: {
          radius: 10,
          color: 0xff0000,
          border: {
            width: 3,
            color: 0xffffff,
          },
        },
        content: t('home.playBadge'),
        position: { x: 210, y: -10 },
      },
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.57 },
      size: { width: 256, height: 78 },
      background: { key: UIButtonBackgroundKey.Rounded },
      text: {
        content: t('home.leaderboard'),
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
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
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
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
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
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
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
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
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
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
        content: t('home.rateApp'),
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () =>
        screenManager.open('rate-app', {
          height: height / 2,
          width: (2 * width) / 3,
        }),
    });
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'home-screen-background');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }
}
