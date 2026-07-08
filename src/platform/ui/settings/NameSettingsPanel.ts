import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { guest } from '@platform/modules/guest';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { t } from '@platform/modules/i18n/i18n.service';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';

const INPUT_ROW_Y = 56;
const SAVE_ROW_Y = 112;
const MAX_NAME_LENGTH = 32;

export class NameSettingsPanel extends Phaser.GameObjects.Container {
  private saving = false;
  private inputElement?: HTMLInputElement;
  private domElement?: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.build();
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
  }

  private build(): void {
    const { width } = this.scene.cameras.main;
    const centerX = width / 2 - this.x;

    const title = this.scene.add
      .text(centerX, 0, t('settings.playerName'), {
        color: '#aaaaaa',
        fontSize: '20px',
        fontFamily: FREDOKA_FONT,
      })
      .setOrigin(0.5);
    this.add(title);

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LENGTH;
    input.placeholder = t('settings.playerNamePlaceholder');
    input.value = guest.getName() ?? '';
    input.style.cssText = [
      'width: 260px',
      'height: 44px',
      'padding: 0 12px',
      'border: 2px solid #ffffff',
      'border-radius: 8px',
      'background: #2a2a4a',
      'color: #ffffff',
      'font-size: 18px',
      'font-family: Fredoka, sans-serif',
      'outline: none',
      'box-sizing: border-box',
    ].join(';');
    this.inputElement = input;

    this.domElement = this.scene.add.dom(centerX, INPUT_ROW_Y, input);
    this.domElement.setOrigin(0.5);
    this.add(this.domElement);

    const saveButton = createUIButton({
      scene: this.scene,
      position: { x: centerX, y: SAVE_ROW_Y },
      size: { width: 260, height: 44 },
      background: { key: UIButtonBackgroundKey.Primary },
      text: {
        content: t('settings.playerNameSave'),
      },
      onClick: () => {
        void this.handleSave();
      },
    });
    this.add(saveButton);
  }

  private async handleSave(): Promise<void> {
    if (this.saving) return;

    const name = this.inputElement?.value.trim() ?? '';
    if (!name) {
      toast.show({ message: t('settings.playerNameRequired'), type: 'warning' });
      return;
    }

    if (guest.getStatus() !== 'ready') {
      toast.show({ message: t('settings.playerNameOffline'), type: 'warning' });
      return;
    }

    this.saving = true;
    try {
      const result = await guest.updateName(name);
      toast.show({
        message: result.synced
          ? t('settings.playerNameUpdated')
          : t('settings.playerNameSavedLocally'),
        type: 'success',
      });
    } catch {
      toast.show({ message: t('settings.playerNameFailed'), type: 'error' });
    } finally {
      this.saving = false;
    }
  }

  private cleanup(): void {
    this.domElement?.destroy();
    this.domElement = undefined;
    this.inputElement = undefined;
  }
}
