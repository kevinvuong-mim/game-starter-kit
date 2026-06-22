import Phaser from 'phaser';
import { t, i18n } from '../i18n';
import { settings } from '@platform/modules/settings/settings.service';
import { toast } from '../toast/ToastManager';

const LANGUAGES = [
  { code: 'en', labelKey: 'settings.languageEn' as const },
  { code: 'vi', labelKey: 'settings.languageVi' as const },
] as const;

/**
 * Language picker UI — lives in platform/ui so game scenes stay event-driven.
 */
export class LanguageSettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.build(y);
  }

  private build(startY: number): void {
    const currentLang = i18n.getCurrentLanguage();
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    this.scene.add
      .text(centerX, startY, t('settings.language'), {
        fontSize: '20px',
        color: '#aaaaaa',
        fontFamily: 'Arial, sans-serif',
      })
      .setOrigin(0.5);

    LANGUAGES.forEach((lang, index) => {
      const rowY = startY + 60 + index * 56;
      const active = currentLang === lang.code;
      this.createLanguageButton(centerX, rowY, t(lang.labelKey), lang.code, active);
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
    const bg = this.scene.add.rectangle(x, y, 260, 48, color);
    bg.setStrokeStyle(active ? 3 : 2, 0xffffff);
    this.add(bg);

    const text = this.scene.add.text(x, y, active ? `${label} ✓` : label, {
      fontSize: '20px',
      color: '#ffffff',
      fontFamily: 'Arial, sans-serif',
    });
    text.setOrigin(0.5);
    this.add(text);

    if (!active) {
      bg.setInteractive({ useHandCursor: true });
      bg.on('pointerdown', async () => {
        await settings.setLanguage(language);
        toast.show({ message: label, type: 'success', duration: 1500 });
        this.scene.scene.restart();
      });
    }
  }
}
