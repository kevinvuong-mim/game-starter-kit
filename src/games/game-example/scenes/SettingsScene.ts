import Phaser from 'phaser';
import { t, i18n } from '@app/modules/localization/i18n.service';
import { settings } from '@app/modules/settings/settings.service';
import { toast } from '@ui/toast/ToastManager';

export class SettingsScene extends Phaser.Scene {
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

    this.add
      .text(width / 2, height * 0.22, t('settings.language'), {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    const currentLang = i18n.getCurrentLanguage();

    this.createLanguageButton(
      width / 2,
      height * 0.32,
      t('settings.languageEn'),
      'en',
      currentLang === 'en'
    );

    this.createLanguageButton(
      width / 2,
      height * 0.42,
      t('settings.languageVi'),
      'vi',
      currentLang === 'vi'
    );

    this.createButton(width / 2, height * 0.85, t('settings.back'), () => {
      this.scene.start('Home');
    });
  }

  private createLanguageButton(
    x: number,
    y: number,
    label: string,
    language: string,
    active: boolean
  ): void {
    const color = active ? 0x6c5ce7 : 0x4a90d9;
    const bg = this.add.rectangle(x, y, 260, 48, color);
    bg.setStrokeStyle(active ? 3 : 2, 0xffffff);

    if (!active) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', async () => {
        await settings.setLanguage(language);
        toast.show({
          message: label,
          type: 'success',
          duration: 1500,
        });
        this.scene.restart();
      });
    }

    this.add
      .text(x, y, active ? `${label} ✓` : label, {
        fontSize: '20px',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);
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
