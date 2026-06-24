import Phaser from 'phaser';

import { eventBus } from '@platform/core/events';
import { FREDOKA_FONT } from '@platform/ui/index';
import { t } from '@platform/modules/i18n/i18n.service';

const PROVIDERS = [
  { id: 'google' as const, labelKey: 'settings.signInGoogle' as const, color: 0x4285f4 },
  { id: 'apple' as const, labelKey: 'settings.signInApple' as const, color: 0x000000 },
] as const;

/**
 * Sign-in provider buttons — lives in platform/ui so game scenes stay event-driven.
 */
export class SignInSettingsPanel extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.build(y);
  }

  private build(startY: number): void {
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    const title = this.scene.add
      .text(centerX, startY, t('settings.signIn'), {
        color: '#aaaaaa',
        fontSize: '20px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(title);

    PROVIDERS.forEach((provider, index) => {
      const rowY = startY + 60 + index * 56;
      this.createSignInButton(centerX, rowY, t(provider.labelKey), provider.id, provider.color);
    });
  }

  private createSignInButton(
    x: number,
    y: number,
    label: string,
    provider: 'google' | 'apple',
    color: number
  ): void {
    const bg = this.scene.add.rectangle(x, y, 260, 48, color);
    bg.setStrokeStyle(2, 0xffffff);
    bg.setInteractive({ useHandCursor: true });
    this.add(bg);

    const text = this.scene.add.text(x, y, label, {
      color: '#ffffff',
      fontSize: '20px',
      fontFamily: FREDOKA_FONT,
    });
    text.setOrigin(0.5);
    this.add(text);

    bg.on('pointerdown', () => {
      eventBus.emit('auth:sign-in:request', { provider });
    });
  }
}
