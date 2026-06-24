import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';

type LegalTab = 'terms' | 'privacy';

const TAB_WIDTH = 200;
const TAB_HEIGHT = 44;

/**
 * Terms & Privacy tabbed content — lives in platform/ui so game scenes stay event-driven.
 */
export class LegalPanel extends Phaser.GameObjects.Container {
  private scrollY = 0;
  private maxScroll = 0;
  private contentBaseY = 0;
  private contentText?: Phaser.GameObjects.Text;
  private contentHitArea?: Phaser.GameObjects.Rectangle;
  private termsTabBg?: Phaser.GameObjects.Rectangle;
  private privacyTabBg?: Phaser.GameObjects.Rectangle;
  private termsTabLabel?: Phaser.GameObjects.Text;
  private privacyTabLabel?: Phaser.GameObjects.Text;
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
    this.contentHeight = height * 0.58;
    this.contentCenterY = height * 0.54;
    this.wheelHandler = (_pointer, _gameObjects, _deltaX, deltaY) => {
      if (!this.contentHitArea?.getBounds().contains(_pointer.x, _pointer.y)) return;
      this.setScroll(this.scrollY + deltaY * 0.5);
    };
    scene.add.existing(this);
    this.build();
    this.selectTab('terms');
  }

  destroy(fromScene?: boolean): void {
    this.scene.input.off('wheel', this.wheelHandler);
    super.destroy(fromScene);
  }

  private build(): void {
    const { width, height } = this.scene.cameras.main;
    const tabY = height * 0.2;
    const tabGap = 8;
    const halfSpan = TAB_WIDTH / 2 + tabGap / 2;
    const termsX = width / 2 - halfSpan;
    const privacyX = width / 2 + halfSpan;

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

    this.termsTabBg = this.scene.add.rectangle(termsX, tabY, TAB_WIDTH, TAB_HEIGHT, 0x4a90d9);
    this.termsTabBg.setStrokeStyle(2, 0xffffff);
    this.termsTabBg.setInteractive({ useHandCursor: true });
    this.add(this.termsTabBg);

    this.termsTabLabel = this.scene.add.text(termsX, tabY, t('legal.tabTerms'), {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: FREDOKA_FONT,
    });
    this.termsTabLabel.setOrigin(0.5);
    this.add(this.termsTabLabel);

    this.privacyTabBg = this.scene.add.rectangle(privacyX, tabY, TAB_WIDTH, TAB_HEIGHT, 0x4a90d9);
    this.privacyTabBg.setStrokeStyle(2, 0xffffff);
    this.privacyTabBg.setInteractive({ useHandCursor: true });
    this.add(this.privacyTabBg);

    this.privacyTabLabel = this.scene.add.text(privacyX, tabY, t('legal.tabPrivacy'), {
      fontSize: '18px',
      color: '#ffffff',
      fontFamily: FREDOKA_FONT,
    });
    this.privacyTabLabel.setOrigin(0.5);
    this.add(this.privacyTabLabel);

    this.termsTabBg.on('pointerdown', () => this.selectTab('terms'));
    this.privacyTabBg.on('pointerdown', () => this.selectTab('privacy'));

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
        fontSize: '16px',
        color: '#dddddd',
        fontFamily: FREDOKA_FONT,
        wordWrap: { width: this.contentWidth - 40 },
        lineSpacing: 6,
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

  private selectTab(tab: LegalTab): void {
    this.scrollY = 0;

    const termsActive = tab === 'terms';
    this.termsTabBg?.setFillStyle(termsActive ? 0x6c5ce7 : 0x4a90d9);
    this.privacyTabBg?.setFillStyle(termsActive ? 0x4a90d9 : 0x6c5ce7);
    this.termsTabBg?.setStrokeStyle(termsActive ? 3 : 2, 0xffffff);
    this.privacyTabBg?.setStrokeStyle(termsActive ? 3 : 2, 0xffffff);

    const contentKey = tab === 'terms' ? 'legal.termsContent' : 'legal.privacyContent';
    this.contentText?.setText(t(contentKey));
    this.contentText?.setY(this.contentBaseY);

    const textHeight = this.contentText?.height ?? 0;
    this.maxScroll = Math.max(0, textHeight - this.contentHeight + 32);
  }

  private setScroll(value: number): void {
    this.scrollY = Phaser.Math.Clamp(value, 0, this.maxScroll);
    this.contentText?.setY(this.contentBaseY - this.scrollY);
  }
}
