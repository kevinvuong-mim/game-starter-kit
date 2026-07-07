import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { t, FREDOKA_FONT } from '@platform/ui/index';
import { NameSettingsPanel } from '@platform/ui/settings/NameSettingsPanel';
import { SoundSettingsPanel } from '@platform/ui/settings/SoundSettingsPanel';
import { LanguageSettingsPanel } from '@platform/ui/settings/LanguageSettingsPanel';
import { createUIButton, UIButtonBackgroundKey } from '@platform/ui/button/UIButton';
import { HelpAndLegalSettingsPanel } from '@platform/ui/settings/HelpAndLegalSettingsPanel';
import { NotificationsSettingsPanel } from '@platform/ui/settings/NotificationsSettingsPanel';

const SETTINGS_PANEL_GAP = 40;
const NAME_SECTION_HEIGHT = 134;
const TWO_ROW_SECTION_HEIGHT = 140;
const NOTIFICATIONS_SECTION_HEIGHT = 168;

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

    let sectionY = height * 0.16;

    new LanguageSettingsPanel(this, 0, sectionY);
    sectionY += TWO_ROW_SECTION_HEIGHT + SETTINGS_PANEL_GAP;

    new NameSettingsPanel(this, 0, sectionY);
    sectionY += NAME_SECTION_HEIGHT + SETTINGS_PANEL_GAP;

    new SoundSettingsPanel(this, 0, sectionY);
    sectionY += TWO_ROW_SECTION_HEIGHT + SETTINGS_PANEL_GAP;

    if (NotificationsSettingsPanel.isAvailable()) {
      new NotificationsSettingsPanel(this, 0, sectionY);
      sectionY += NOTIFICATIONS_SECTION_HEIGHT + SETTINGS_PANEL_GAP;
    }

    new HelpAndLegalSettingsPanel(this, 0, sectionY);

    createUIButton({
      scene: this,
      position: { x: width / 2, y: height * 0.92 },
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
