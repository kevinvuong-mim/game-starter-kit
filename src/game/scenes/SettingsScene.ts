import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { SignInSettingsPanel } from '@platform/ui/settings/SignInSettingsPanel';
import { LanguageSettingsPanel } from '@platform/ui/settings/LanguageSettingsPanel';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';

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

    new LanguageSettingsPanel(this, 0, height * 0.15);
    new SignInSettingsPanel(this, 0, height * 0.25);

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.88 },
      size: { width: 200, height: 48 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('settings.back'),
      },
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
