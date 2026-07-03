import Phaser from 'phaser';

import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { settings } from '@platform/modules/settings/settings.service';

const SOUND_OPTIONS = [
  { enabled: true, labelKey: 'settings.soundOn' as const },
  { enabled: false, labelKey: 'settings.soundOff' as const },
] as const;

export class SoundSettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.build(y);
  }

  private build(startY: number): void {
    const soundEnabled = settings.getSettings().soundEnabled;
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    const title = this.scene.add
      .text(centerX, startY, t('settings.sound'), {
        color: '#aaaaaa',
        fontSize: '20px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(title);

    SOUND_OPTIONS.forEach((option, index) => {
      const rowY = startY + 60 + index * 56;
      const active = soundEnabled === option.enabled;
      this.createSoundButton(centerX, rowY, t(option.labelKey), option.enabled, active);
    });
  }

  private createSoundButton(
    x: number,
    y: number,
    label: string,
    enabled: boolean,
    active: boolean
  ): void {
    const color = active ? 0x6c5ce7 : 0x4a90d9;
    const bg = this.scene.add.rectangle(x, y, 260, 48, color);
    bg.setStrokeStyle(active ? 3 : 2, 0xffffff);
    this.add(bg);

    const text = this.scene.add.text(x, y, active ? `${label} ✓` : label, {
      color: '#ffffff',
      fontSize: '20px',
      fontFamily: FREDOKA_FONT,
    });
    text.setOrigin(0.5);
    this.add(text);

    if (!active) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', async () => {
        await settings.setSoundEnabled(enabled);
        this.scene.scene.restart();
      });
    }
  }
}
