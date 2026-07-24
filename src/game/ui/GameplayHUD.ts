import Phaser from 'phaser';

import { t } from '@platform/ui';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { createUIButton } from '@platform/ui/button/UIButton';
import type { UIButton } from '@platform/ui/types';

const PANEL_FILL = 0xf5e6c8;
const PANEL_STROKE = 0xd4b896;
const TEXT_DARK = '#1a1a1a';

function formatScore(score: number): string {
  return score.toLocaleString('en-US');
}

export interface GameplayHUDOptions {
  onBack: () => void;
  onQuit: () => void;
}

/**
 * Suika gameplay HUD — back/quit buttons and score panel.
 */
export class GameplayHUD extends Phaser.GameObjects.Container {
  private scoreValue?: Phaser.GameObjects.Text;
  private backButton?: UIButton;
  private quitButton?: UIButton;

  constructor(scene: Phaser.Scene, options: GameplayHUDOptions) {
    super(scene, 0, 0);
    scene.add.existing(this);
    this.setDepth(500);
    this.setScrollFactor(0);
    this.build(options);
  }

  private build(options: GameplayHUDOptions): void {
    const { width } = this.scene.cameras.main;
    const topY = 124;

    this.backButton = createUIButton({
      scene: this.scene,
      position: { x: 132, y: topY },
      size: { width: 80, height: 80 },
      background: { key: 'back-icon' },
      depth: 501,
      onClick: options.onBack,
    });
    this.add(this.backButton);

    this.quitButton = createUIButton({
      scene: this.scene,
      position: { x: width * 0.8, y: topY },
      size: { width: 72, height: 72 },
      background: { key: 'quit-icon' },
      depth: 501,
      onClick: options.onQuit,
    });
    this.add(this.quitButton);

    const scorePanel = this.makePanel(width * 0.5, topY, 200, 96);
    scorePanel.add(
      this.scene.add
        .text(0, -28, t('game.scoreLabel'), {
          color: TEXT_DARK,
          fontSize: '22px',
          fontStyle: 'bold',
          fontFamily: FREDOKA_FONT,
        })
        .setOrigin(0.5)
    );
    this.scoreValue = this.scene.add
      .text(0, 14, '0', {
        color: TEXT_DARK,
        fontSize: '36px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    scorePanel.add(this.scoreValue);
    this.add(scorePanel);
  }

  private makePanel(x: number, y: number, w: number, h: number): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    const bg = this.scene.add.graphics();
    bg.fillStyle(PANEL_FILL, 1);
    bg.lineStyle(3, PANEL_STROKE, 1);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
    container.add(bg);
    return container;
  }

  setScore(score: number): void {
    this.scoreValue?.setText(formatScore(score));
  }
}
