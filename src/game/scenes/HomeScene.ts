import Phaser from 'phaser';

import { t } from '@platform/ui/index';
import { eventBus } from '@platform/core/events';
import { createUIButton } from '@platform/ui/button/UIButton';

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

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.56 },
      size: { width: 300, height: 110 },
      background: { key: 'play-button-background' },
      text: {
        content: t('home.play'),
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.scene.start('Gameplay', { returnTo: 'Home' }),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.65 },
      size: { width: 300, height: 110 },
      background: { key: 'leaderboard-button-background' },
      text: {
        content: t('home.leaderboard'),
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.openScreen('Leaderboard'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.74 },
      size: { width: 300, height: 110 },
      background: { key: 'settings-button-background' },
      text: {
        content: t('home.settings'),
        style: { fontSize: 36, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.openScreen('Settings'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 4, y: height * 0.86 },
      size: { width: 120, height: 120 },
      background: { key: 'shop-icon' },
      text: {
        content: t('home.shop'),
        offset: { x: 60, y: 110 },
        style: { fontSize: 24, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.openScreen('Shop'),
    });

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.86 },
      size: { width: 120, height: 120 },
      background: { key: 'missions-icon' },
      text: {
        offset: { x: 60, y: 110 },
        content: t('home.missions'),
        style: { fontSize: 24, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.openScreen('Missions'),
    });

    createUIButton({
      scene: this,
      position: { x: (3 * width) / 4, y: height * 0.86 },
      size: { width: 120, height: 120 },
      background: { key: 'daily-reward-icon' },
      text: {
        offset: { x: 60, y: 110 },
        content: t('home.dailyReward'),
        style: { fontSize: 24, fontStyle: 'bold', border: { width: 4, color: '#000000' } },
      },
      onClick: () => this.openScreen('DailyReward'),
    });
  }

  private addBackgroundImage(width: number, height: number): void {
    const bg = this.add.image(width / 2, height / 2, 'home-background-image');
    const scale = Math.max(width / bg.width, height / bg.height);
    bg.setScale(scale).setDepth(-1);
  }
}
