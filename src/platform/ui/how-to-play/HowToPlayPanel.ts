import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';

/**
 * How to play guide — lives in platform/ui so game scenes stay event-driven.
 */
export class HowToPlayPanel extends Phaser.GameObjects.Container {
  private scrollY = 0;
  private maxScroll = 0;
  private contentBaseY = 0;
  private contentText?: Phaser.GameObjects.Text;
  private contentHitArea?: Phaser.GameObjects.Rectangle;
  private readonly wheelHandler: (
    pointer: Phaser.Input.Pointer,
    gameObjects: Phaser.GameObjects.GameObject[],
    deltaX: number,
    deltaY: number
  ) => void;
  private readonly contentWidth: number;
  private readonly contentHeight: number;
  private readonly contentCenterY: number;

  constructor(scene: Phaser.Scene) {
    super(scene, 0, 0);
    const { width, height } = scene.cameras.main;
    this.contentWidth = width * 0.84;
    this.contentHeight = height * 0.64;
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
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.92,
      height * 0.72,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    const maskShape = this.scene.make.graphics({}, false);
    maskShape.fillStyle(0xffffff);
    maskShape.fillRect(
      width / 2 - this.contentWidth / 2,
      this.contentCenterY - this.contentHeight / 2,
      this.contentWidth,
      this.contentHeight
    );
    const mask = maskShape.createGeometryMask();

    this.contentBaseY = this.contentCenterY - this.contentHeight / 2 + 16;
    this.contentText = this.scene.add
      .text(width / 2 - this.contentWidth / 2 + 20, this.contentBaseY, '', {
        fontSize: '17px',
        color: '#dddddd',
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: this.contentWidth - 40 },
        lineSpacing: 8,
      })
      .setOrigin(0, 0);
    this.contentText.setMask(mask);
    this.add(this.contentText);

    this.contentHitArea = this.scene.add.rectangle(
      width / 2,
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
