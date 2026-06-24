import Phaser from 'phaser';

import { formatNumber } from '@platform/core/utils';
import { FREDOKA_FONT } from '@platform/ui/typography';
import { usePlatformStore } from '@platform/core/state';

export class HUD extends Phaser.GameObjects.Container {
  private unsubscribe?: () => void;
  private coinText?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(500);
    this.setScrollFactor(0);
    this.build();
    this.bindStore();
  }

  private build(): void {
    const padding = 16;

    const coinBg = this.scene.add.rectangle(padding + 60, padding + 16, 120, 32, 0x000000, 0.5);
    coinBg.setOrigin(0.5);
    this.coinText = this.scene.add.text(padding + 20, padding + 16, '0', {
      color: '#ffd700',
      fontSize: '18px',
      fontFamily: FREDOKA_FONT,
    });
    this.coinText.setOrigin(0, 0.5);

    this.scoreText = this.scene.add.text(this.scene.cameras.main.width / 2, padding + 16, '0', {
      color: '#ffffff',
      fontSize: '28px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    this.scoreText.setOrigin(0.5);

    this.add([coinBg, this.coinText, this.scoreText]);
    this.updateFromStore();
  }

  private bindStore(): void {
    this.unsubscribe = usePlatformStore.subscribe(() => this.updateFromStore());
  }

  setScore(score: number): void {
    this.scoreText?.setText(formatNumber(score));
  }

  private updateFromStore(): void {
    const { currency } = usePlatformStore.getState();
    this.coinText?.setText(formatNumber(currency.coins));
  }

  destroy(fromScene?: boolean): void {
    this.unsubscribe?.();
    super.destroy(fromScene);
  }
}
