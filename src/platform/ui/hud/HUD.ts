import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/fonts';
import { formatNumber } from '@platform/core/utils';

export class HUD extends Phaser.GameObjects.Container {
  private scoreText?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(500);
    this.setScrollFactor(0);
    this.build();
  }

  private build(): void {
    const padding = 16;

    this.scoreText = this.scene.add.text(this.scene.cameras.main.width / 2, padding + 16, '0', {
      color: '#ffffff',
      fontSize: '28px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    this.scoreText.setOrigin(0.5);

    this.add([this.scoreText]);
  }

  setScore(score: number): void {
    this.scoreText?.setText(formatNumber(score));
  }
}
