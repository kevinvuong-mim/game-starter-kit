import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';

const LEGAL_LINKS = [
  { sceneKey: 'HowToPlay', labelKey: 'settings.howToPlay' as const },
  { sceneKey: 'Legal', labelKey: 'settings.termsPrivacy' as const },
] as const;

export class HelpAndLegalSettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.build();
  }

  private build(): void {
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    const title = this.scene.add
      .text(centerX, 0, t('settings.helpAndLegal'), {
        color: '#aaaaaa',
        fontSize: '20px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(title);

    LEGAL_LINKS.forEach((link, index) => {
      const rowY = 60 + index * 56;
      this.createLinkButton(centerX, rowY, t(link.labelKey), link.sceneKey);
    });
  }

  private createLinkButton(x: number, y: number, label: string, sceneKey: string): void {
    const bg = this.scene.add.rectangle(x, y, 260, 48, 0x4a90d9);
    bg.setStrokeStyle(2, 0xffffff);
    this.add(bg);

    const text = this.scene.add.text(x, y, label, {
      color: '#ffffff',
      fontSize: '20px',
      fontFamily: FREDOKA_FONT,
    });
    text.setOrigin(0.5);
    this.add(text);

    bg.setInteractive({ useHandCursor: true });
    bg.on('pointerdown', () => {
      this.scene.scene.start(sceneKey, { returnTo: 'Settings' });
    });
  }
}
