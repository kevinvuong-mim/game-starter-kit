import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/fonts';
import { t } from '@platform/modules/i18n/i18n.service';
import { getPanelLayoutMetrics } from '@platform/ui/layout/panelLayout';

/**
 * How to play guide — lives in platform/ui so game scenes stay event-driven.
 */
export class HowToPlayPanel extends Phaser.GameObjects.Container {
  private readonly contentWidth: number;
  private readonly contentHeight: number;
  private readonly contentCenterY: number;
  private readonly wheelHandler: (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number
  ) => void;

  private scrollY = 0;
  private maxScroll = 0;
  private contentBaseY = 0;
  private contentText?: Phaser.GameObjects.Text;
  private contentHitArea?: Phaser.GameObjects.Rectangle;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const { height } = scene.cameras.main;
    const metrics = getPanelLayoutMetrics(scene.cameras.main);
    this.contentWidth = metrics.innerWidth;
    this.contentHeight = height * 0.58;
    this.contentCenterY = height * 0.52;
    this.wheelHandler = (_pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.contentHitArea?.getBounds().contains(_pointer.x, _pointer.y)) return;
      this.setScroll(this.scrollY + deltaY * 0.5);
    };
    scene.add.existing(this);
    this.build();
    this.renderContent();
  }

  destroy(fromScene?: boolean): void {
    this.scene.input.off('wheel', this.wheelHandler);
    super.destroy(fromScene);
  }

  private build(): void {
    const { height } = this.scene.cameras.main;
    const metrics = getPanelLayoutMetrics(this.scene.cameras.main);

    const panel = this.scene.add.rectangle(
      metrics.centerX,
      height / 2,
      metrics.panelWidth,
      height * 0.72,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    const maskShape = this.scene.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      metrics.centerX - this.contentWidth / 2,
      this.contentCenterY - this.contentHeight / 2,
      this.contentWidth,
      this.contentHeight
    );
    const mask = maskShape.createGeometryMask();

    this.contentBaseY = this.contentCenterY - this.contentHeight / 2 + 16;
    this.contentText = this.scene.add
      .text(metrics.centerX - this.contentWidth / 2 + 16, this.contentBaseY, '', {
        fontSize: '16px',
        color: '#dddddd',
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: this.contentWidth - 32 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0);
    this.contentText.setMask(mask);
    this.add(this.contentText);

    this.contentHitArea = this.scene.add.rectangle(
      metrics.centerX,
      this.contentCenterY,
      this.contentWidth,
      this.contentHeight,
      0x000000,
      0
    );
    this.contentHitArea.setInteractive({ useHandCursor: true });
    this.add(this.contentHitArea);

    this.bindScroll();
  }

  private bindScroll(): void {
    let dragStartY = 0;
    let scrollStartY = 0;

    this.contentHitArea?.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      dragStartY = pointer.y;
      scrollStartY = this.scrollY;
    });

    this.contentHitArea?.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.setScroll(scrollStartY + (dragStartY - pointer.y));
    });

    this.scene.input.on('wheel', this.wheelHandler);
  }

  private renderContent(): void {
    this.scrollY = 0;
    this.contentText?.setText(t('howToPlay.content'));
    this.contentText?.setY(this.contentBaseY);

    const textHeight = this.contentText?.height ?? 0;
    this.maxScroll = Math.max(0, textHeight - this.contentHeight + 32);
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.contentText?.setY(this.contentBaseY - this.scrollY);
  }
}
