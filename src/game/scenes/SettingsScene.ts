import Phaser from 'phaser';
import { eventBus } from '@platform/core/events';
import { t } from '@platform/ui/i18n';
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
        fontSize: '32px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    new LanguageSettingsPanel(this, 0, height * 0.22);

    this.createButton(width / 2, height * 0.85, t('settings.back'), () => {
      this.scene.start('Home');
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

  private createButton(x: number, y: number, label: string, onClick: () => void): void {
    const bg = this.add.rectangle(x, y, 200, 48, 0x4a90d9);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });

    this.add
      .text(x, y, label, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    bg.on('pointerdown', onClick);
  }
}
