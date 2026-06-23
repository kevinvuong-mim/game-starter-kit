import Phaser from 'phaser';

import { t } from '../i18n';
import { FREDOKA_FONT } from '../typography';
import { BaseScreen } from '../screen/ScreenManager';

export interface DialogButton {
  label: string;
  primary?: boolean;
  onClick: () => void;
}

export class DialogScreen extends BaseScreen {
  readonly id = 'dialog';
  private titleText?: Phaser.GameObjects.Text;
  private messageText?: Phaser.GameObjects.Text;
  private buttonContainer?: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.createOverlay(0.75);
    this.buildUI();
  }

  private buildUI(): void {
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.85,
      height * 0.45,
      0x1e1e3a,
      1
    );
    panel.setStrokeStyle(2, 0x6c5ce7);
    this.add(panel);

    this.titleText = this.scene.add.text(width / 2, height / 2 - 80, '', {
      color: '#ffffff',
      fontSize: '26px',
      fontStyle: 'bold',
      fontFamily: FREDOKA_FONT,
    });
    this.titleText.setOrigin(0.5);
    this.add(this.titleText);

    this.messageText = this.scene.add.text(width / 2, height / 2 - 20, '', {
      align: 'center',
      color: '#cccccc',
      fontSize: '18px',
      fontFamily: FREDOKA_FONT,
      wordWrap: { width: width * 0.75 },
    });
    this.messageText.setOrigin(0.5);
    this.add(this.messageText);

    this.buttonContainer = this.scene.add.container(width / 2, height / 2 + 70);
    this.add(this.buttonContainer);
  }

  show(data?: Record<string, unknown>): void {
    if (this.titleText && data?.title) {
      this.titleText.setText(String(data.title));
    }
    if (this.messageText && data?.message) {
      this.messageText.setText(String(data.message));
    }

    this.buttonContainer?.removeAll(true);
    const buttons = (data?.buttons as DialogButton[]) ?? [
      { label: t('common.ok'), onClick: () => this.close(), primary: true },
    ];

    const spacing = 120;
    const startX = -((buttons.length - 1) * spacing) / 2;

    buttons.forEach((btn, i) => {
      const x = startX + i * spacing;
      this.createButton(
        x,
        0,
        btn.label,
        () => {
          btn.onClick();
          this.close();
        },
        110,
        44
      );
    });

    super.show(data);
  }
}

export const dialog = {
  confirm(
    scene: Phaser.Scene,
    title: string,
    message: string,
    onConfirm: () => void,
    onCancel?: () => void
  ): DialogScreen {
    const d = new DialogScreen(scene);
    d.show({
      title,
      message,
      buttons: [
        { label: t('common.cancel'), onClick: () => onCancel?.() },
        { label: t('common.ok'), onClick: onConfirm, primary: true },
      ],
    });
    return d;
  },
};
