import Phaser from 'phaser';

import { t } from '../i18n';
import { FONT_FAMILY } from '../typography';
import { BaseScreen } from '../screen/ScreenManager';

export class ModalScreen extends BaseScreen {
  readonly id = 'modal';
  private onClose?: () => void;
  private content?: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    super(scene);
    this.createOverlay(0.7);
    this.buildUI();
  }

  private buildUI(): void {
    const { width, height } = this.scene.cameras.main;

    const panel = this.scene.add.rectangle(
      width / 2,
      height / 2,
      width * 0.8,
      height * 0.4,
      0x2a2a4a,
      1
    );
    panel.setStrokeStyle(2, 0x4a90d9);
    this.add(panel);

    this.content = this.scene.add.text(width / 2, height / 2 - 30, '', {
      fontSize: '22px',
      color: '#ffffff',
      fontFamily: FONT_FAMILY,
      wordWrap: { width: width * 0.7 },
      align: 'center',
    });
    this.content.setOrigin(0.5);
    this.add(this.content);

    this.createButton(width / 2, height / 2 + 60, t('common.ok'), () => {
      this.onClose?.();
      this.close();
    });
  }

  show(data?: Record<string, unknown>): void {
    if (data?.message && this.content) {
      this.content.setText(String(data.message));
    }
    this.onClose = data?.onClose as (() => void) | undefined;
    super.show(data);
  }
}
