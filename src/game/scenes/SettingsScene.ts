import Phaser from 'phaser';

import { t } from '@platform/ui/i18n';
import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/typography';
import { createUIButton } from '@platform/ui/button/UIButton';
import { LanguageSettingsPanel } from '@platform/ui/settings/LanguageSettingsPanel';

export class SettingsScene extends Phaser.Scene {
  private unsubscribers: Array<() => void> = [];

  constructor() {
    super({ key: 'Settings' });
  }

  create(): void {
    const { width, height } = this.cameras.main;

    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    this.add
      .text(width / 2, height * 0.12, t('settings.title'), {
        color: '#ffffff',
        fontSize: '32px',
        fontStyle: 'bold',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);

    new LanguageSettingsPanel(this, 0, height * 0.22);

    createUIButton(this, {
      height: 48,
      width: 200,
      x: width / 2,
      y: height * 0.85,
      label: t('settings.back'),
      onClick: () => this.scene.start('Home'),
    });

    this.unsubscribers.push(
      eventBus.on('app:back', () => {
        this.scene.start('Home');
      })
    );
  }

  shutdown(): void {
    for (const unsub of this.unsubscribers) unsub();
    this.unsubscribers = [];
  }
}
