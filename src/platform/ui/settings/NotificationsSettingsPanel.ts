import Phaser from 'phaser';
import { Capacitor } from '@capacitor/core';

import { getConfig } from '@platform/core/config';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';
import { settings } from '@platform/modules/settings/settings.service';

const NOTIFICATION_OPTIONS = [
  { enabled: true, labelKey: 'settings.notificationsOn' as const },
  { enabled: false, labelKey: 'settings.notificationsOff' as const },
] as const;

export class NotificationsSettingsPanel extends Phaser.GameObjects.Container {
  static isAvailable(): boolean {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    const config = getConfig();
    return config.pushNotificationsEnabled || config.localNotificationsEnabled;
  }

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    void this.build();
  }

  private async build(): Promise<void> {
    const notificationsEnabled = settings.getSettings().notificationsEnabled;
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    const title = this.scene.add
      .text(centerX, 0, t('settings.notifications'), {
        color: '#aaaaaa',
        fontSize: '20px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(title);

    NOTIFICATION_OPTIONS.forEach((option, index) => {
      const rowY = 68 + index * 56;
      const active = notificationsEnabled === option.enabled;
      this.createOptionButton(centerX, rowY, t(option.labelKey), option.enabled, active);
    });
  }

  private createOptionButton(
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
        await settings.setNotificationsEnabled(enabled);
        this.scene.scene.restart();
      });
    }
  }
}
