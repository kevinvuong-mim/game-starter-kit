import Phaser from 'phaser';

import { toast } from '../toast/ToastManager';
import { guest } from '@platform/modules/guest';
import { FREDOKA_FONT } from '@platform/ui/fonts';
import { t } from '@platform/modules/i18n/i18n.service';
import { createUIButton, UIButtonBackgroundKey } from '../button/UIButton';

const CARET_WIDTH = 2;
const INPUT_ROW_Y = 56;
const SAVE_ROW_Y = 112;
const CARET_HEIGHT = 22;
const INPUT_HEIGHT = 44;
const INPUT_WIDTH = 260;
const CARET_BLINK_MS = 500;
const MAX_NAME_LENGTH = 32;
const INPUT_PADDING_X = 12;
const VALUE_COLOR = '#ffffff';
const PLACEHOLDER_COLOR = '#888888';

export class NameSettingsPanel extends Phaser.GameObjects.Container {
  private value = '';
  private saving = false;
  private cleaned = false;
  private editing = false;
  private placeholder = '';
  private hiddenInput?: HTMLInputElement;
  private caretBlink?: Phaser.Time.TimerEvent;
  private valueText?: Phaser.GameObjects.Text;
  private caret?: Phaser.GameObjects.Rectangle;
  private sceneInput?: Phaser.Input.InputPlugin;
  private fieldHit?: Phaser.GameObjects.Rectangle;
  private readonly onHiddenBlur = (): void => this.endEdit();
  private readonly onHiddenKeyDown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.endEdit();
    }
  };
  private readonly onHiddenInput = (): void => this.syncFromHiddenInput();
  private readonly onScenePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.editing || !this.fieldHit || !this.scene) return;
    const bounds = this.fieldHit.getBounds();
    if (Phaser.Geom.Rectangle.Contains(bounds, pointer.worldX, pointer.worldY)) return;
    this.endEdit();
  };

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);
    this.value = guest.getName() ?? '';
    this.placeholder = t('settings.playerNamePlaceholder');
    this.build();
    this.sceneInput = scene.input;
    scene.input.on('pointerdown', this.onScenePointerDown);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
    this.once(Phaser.GameObjects.Events.DESTROY, this.cleanup, this);
  }

  /** Close the OS keyboard and remove the hidden input (also used when opening a modal). */
  endEdit(): void {
    if (!this.editing) return;
    this.editing = false;

    const input = this.hiddenInput;
    this.hiddenInput = undefined;
    if (input) {
      this.value = input.value.slice(0, MAX_NAME_LENGTH);
      input.removeEventListener('input', this.onHiddenInput);
      input.removeEventListener('blur', this.onHiddenBlur);
      input.removeEventListener('keydown', this.onHiddenKeyDown);
      input.blur();
      input.remove();
    }

    this.stopCaretBlink();
    // Scene/display objects may already be torn down (e.g. Back → scene.start).
    if (this.scene && this.valueText?.active) {
      this.refreshDisplay();
    }
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

    const fieldX = centerX;
    const fieldY = INPUT_ROW_Y;

    const fieldBg = this.scene.add.graphics();
    fieldBg.fillStyle(0x2a2a4a, 1);
    fieldBg.fillRoundedRect(
      fieldX - INPUT_WIDTH / 2,
      fieldY - INPUT_HEIGHT / 2,
      INPUT_WIDTH,
      INPUT_HEIGHT,
      8
    );
    fieldBg.lineStyle(2, 0xffffff, 1);
    fieldBg.strokeRoundedRect(
      fieldX - INPUT_WIDTH / 2,
      fieldY - INPUT_HEIGHT / 2,
      INPUT_WIDTH,
      INPUT_HEIGHT,
      8
    );
    this.add(fieldBg);

    this.fieldHit = this.scene.add
      .rectangle(fieldX, fieldY, INPUT_WIDTH, INPUT_HEIGHT, 0x000000, 0)
      .setInteractive({ useHandCursor: true });
    this.fieldHit.on('pointerdown', () => this.startEdit());
    this.add(this.fieldHit);

    this.valueText = this.scene.add
      .text(fieldX - INPUT_WIDTH / 2 + INPUT_PADDING_X, fieldY, '', {
        fontSize: '18px',
        fontFamily: FREDOKA_FONT,
        color: VALUE_COLOR,
      })
      .setOrigin(0, 0.5);
    this.add(this.valueText);

    this.caret = this.scene.add
      .rectangle(0, fieldY, CARET_WIDTH, CARET_HEIGHT, 0xffffff, 1)
      .setOrigin(0, 0.5)
      .setVisible(false);
    this.add(this.caret);

    this.refreshDisplay();

    const saveButton = createUIButton({
      scene: this.scene,
      onClick: () => {
        void this.handleSave();
      },
      position: { x: centerX, y: SAVE_ROW_Y },
      text: {
        content: t('settings.playerNameSave'),
      },
      background: { key: UIButtonBackgroundKey.Primary },
      size: { width: INPUT_WIDTH, height: INPUT_HEIGHT },
    });
    this.add(saveButton);
  }

  private startEdit(): void {
    if (this.editing) {
      this.hiddenInput?.focus();
      return;
    }

    this.editing = true;

    const input = document.createElement('input');
    input.type = 'text';
    input.maxLength = MAX_NAME_LENGTH;
    input.value = this.value;
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    input.style.cssText = [
      'position: fixed',
      'left: 0',
      'top: 0',
      'width: 1px',
      'height: 1px',
      'opacity: 0',
      'border: 0',
      'padding: 0',
      'margin: 0',
      'font-size: 16px',
      'caret-color: transparent',
      'pointer-events: none',
      'z-index: 0',
    ].join(';');

    input.addEventListener('input', this.onHiddenInput);
    input.addEventListener('blur', this.onHiddenBlur);
    input.addEventListener('keydown', this.onHiddenKeyDown);

    document.body.appendChild(input);
    this.hiddenInput = input;
    input.focus();
    // Place caret at end for a natural edit experience.
    const len = input.value.length;
    input.setSelectionRange(len, len);

    this.startCaretBlink();
    this.refreshDisplay();
  }

  private syncFromHiddenInput(): void {
    if (!this.hiddenInput) return;
    this.value = this.hiddenInput.value.slice(0, MAX_NAME_LENGTH);
    this.refreshDisplay();
  }

  private refreshDisplay(): void {
    if (!this.valueText || !this.caret) return;

    const hasValue = this.value.length > 0;
    this.valueText.setCrop();
    this.valueText.setText(hasValue ? this.value : this.placeholder);
    this.valueText.setColor(hasValue ? VALUE_COLOR : PLACEHOLDER_COLOR);

    const maxTextWidth = INPUT_WIDTH - INPUT_PADDING_X * 2;
    const contentWidth = hasValue ? this.valueText.width : 0;
    const textStartX = this.valueText.x;

    if (hasValue && contentWidth > maxTextWidth) {
      this.valueText.setCrop(contentWidth - maxTextWidth, 0, maxTextWidth, this.valueText.height);
      this.caret.setPosition(textStartX + maxTextWidth, this.valueText.y);
    } else {
      this.caret.setPosition(textStartX + contentWidth, this.valueText.y);
    }

    this.caret.setVisible(this.editing);
    if (this.editing) this.caret.setAlpha(1);
  }

  private startCaretBlink(): void {
    this.stopCaretBlink();
    if (!this.caret) return;
    this.caret.setVisible(true);
    this.caret.setAlpha(1);
    this.caretBlink = this.scene.time.addEvent({
      delay: CARET_BLINK_MS,
      loop: true,
      callback: () => {
        if (!this.caret || !this.editing) return;
        this.caret.setAlpha(this.caret.alpha > 0.5 ? 0 : 1);
      },
    });
  }

  private stopCaretBlink(): void {
    this.caretBlink?.remove(false);
    this.caretBlink = undefined;
    if (this.caret?.active) {
      this.caret.setVisible(false).setAlpha(1);
    }
  }

  private async handleSave(): Promise<void> {
    if (this.saving) return;

    this.endEdit();

    const name = this.value.trim();
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
    if (this.cleaned) return;
    this.cleaned = true;
    this.sceneInput?.off('pointerdown', this.onScenePointerDown);
    this.sceneInput = undefined;
    this.endEdit();
  }
}
