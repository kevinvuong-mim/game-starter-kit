import Phaser from 'phaser';
import { BaseScreen } from '../screen/ScreenManager';
import { t } from '@app/modules/localization/i18n.service';

export class ModalScreen extends BaseScreen {
  readonly id = 'modal';
  private content?: Phaser.GameObjects.Text;
  private onClose?: () => void;

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
      fontFamily: 'Arial, sans-serif',
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
